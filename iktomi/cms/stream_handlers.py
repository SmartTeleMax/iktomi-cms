# -*- coding: utf-8 -*-
from webob.exc import HTTPNotFound, HTTPForbidden, HTTPSeeOther
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.properties import PropertyLoader
from sqlalchemy.orm.util import identity_key
from sqlalchemy.orm import class_mapper

from iktomi.utils import cached_property
from iktomi import web
from iktomi.utils.paginator import ModelPaginator, FancyPageRange
from iktomi.web.url_converters import Integer as IntegerConv, \
                        Converter as BaseConv, ConvertError
from iktomi.forms import convs


from .item_lock import ItemLock, ModelLockError, ModelLockedByOther
from .stream_actions import StreamAction
from .flashmessages import flash


def see_other(location):
    return HTTPSeeOther(location=str(location))


class NoneIntConv(IntegerConv):
    name='noneint'
    regex = BaseConv.regex

    def to_python(self, value, **kwargs):
        if value == '+':
            return None
        try:
            value = int(value)
        except ValueError:
            raise ConvertError(self, value)
        else:
            return value

    def to_url(self, value):
        if value is None:
            return '+'
        return str(value)


class StreamListHandler(StreamAction):

    for_item = False
    item_lock = False
    display = False

    @cached_property
    def template_name(self):
        return self.stream.stream_template_name

    @property
    def app(self):
        return web.match() | self

    def list_handler(self, env, data):
        if not env.request.is_xhr:
            return env.render_to_response('layout.html', {})

        stream = self.stream
        stream.insure_has_permission(env, 'x')
        template_name = stream.row_template_name
        template_data = stream.template_data
        no_layout = ('__no_layout' in env.request.GET)

        def item_row(item, list_fields=None, url='#', row_cls='', **kw):
            return env.render_to_string(template_name,
                                        dict(template_data, item=item,
                                             list_fields=list_fields,
                                        url=url, row_cls=row_cls, **kw))

        data = dict(self.prepare_data(env, data),
                    is_popup=('__popup' in env.request.GET),
                    no_layout=no_layout,
                    menu=stream.module_name,
                    item_row=item_row,
                    live_search=stream.live_search)

        html = env.render_to_string(self.template_name, data)
        return env.json({
            #'page': '/',
            'html': html,
        })
    __call__ = list_handler

    def prepare_data(self, env, data):
        '''View for index page.'''
        stream = self.stream
        request = env.request

        # XXX Check permissions and return 403 if no access.
        # XXX Handle POST to edit/delete here.
        query = stream.item_query(env)
        # filter_form_class = getattr(stream.config, 'FilterForm', FilterForm)
        filter_form = stream.FilterForm(env)

        # Note: errors are displayed, but ignored in code.
        if request.method == 'POST':
            filter_form.accept(request.POST)
        else:
            filter_form.accept(request.GET)
        query = filter_form.filter(query)

        query = stream.order(query)

        paginator = ModelPaginator(request, query,
                                   impl=FancyPageRange(),
                                   limit=getattr(stream.config, 'limit', None),
                                   url=env.url_for(stream.module_name).qs_set(
                                       filter_form.get_data()))

        def item_url(item=None):
            item_id = item.id if item is not None else None
            endpoint = stream.module_name + '.item'
            return env.url_for(endpoint, item=item_id).qs_set(
                filter_form.get_data())

        try:
            paginator.items = stream.config.modify_items(paginator.items)
        except AttributeError:
            pass


        result = dict(stream.template_data,
                      paginator=paginator,
                      stream=stream,
                      item_url=item_url,
                      list_fields=stream.list_fields,
                      title=stream.config.title,
                      filter_form=filter_form,
                      allow_add=stream.has_permission(env, 'c'),
                      repr=repr)

        if self.stream.ListItemForm:
            list_item_form = self.stream.ListItemForm.for_items(
                                    env, paginator.items)
            result['list_item_form'] = list_item_form

        result = stream.process_list_template_data(env, result)
        return result



class PrepareItemHandler(web.WebHandler):
    """ Helper handler to fetch item by id field.
    `data` in handler should have `item` attr containts item id.
    """
    # XXX: Add support for fetching by pk, not only `id` field
    #       (use query.get(pk_val) )

    def __init__(self, action):
        self.action = action

    def retrieve_item(self, env, item):
        return self.action.stream.item_query(env).filter_by(id=item).first()

    def prepare_item_handler(self, env, data):
        '''Item actions dispatcher'''
        request = env.request
        stream = self.action.stream
        data.edit_session = request.POST.get('edit_session',
                                             request.GET.get('edit_session',
                                                             ''))
        data.lock_message = ''
        stream.insure_has_permission(env, 'r')

        data.filter_form = stream.FilterForm(env)
        # Note: errors are displayed, but ignored in code.
        data.filter_form.accept(request.GET)

        data.owner_session = ''
        if data.item is not None:
            data.item = self.retrieve_item(env, data.item)
            if data.item is None:
                raise HTTPNotFound
            if self.action.item_lock:
                try:
                    data.edit_session = env.item_lock.update_or_create(
                        data.item, data.
                        edit_session)
                except ModelLockedByOther, e:
                    data.lock_message = unicode(e)
                    data.owner_session = e.edit_session
                except ModelLockError, e:
                    data.lock_message = unicode(e)
        elif not self.action.allowed_for_new:
            flash(env, u'Действие «%s» недоступно для нового объекта' %
                  (self.action.title,),
                  'failure')
            item_url = request.url_for(stream.module_name + '.item')(
                data.filter_form.get_data())
            return see_other(item_url)
        return self.next_handler(env, data)
    __call__ = prepare_item_handler


class EditItemHandler(StreamAction):

    action = 'edit_item'
    item_lock = True
    allowed_for_new = True
    title = u'Редактировать/создать'

    @property
    def app(self):
        return web.match('/<noneint:item>', 'item', convs={'noneint': NoneIntConv}) | \
            PrepareItemHandler(self) | self

    def create_allowed(self, env):
        return self.stream.has_permission(env, 'c')

    def save_allowed(self, env, item=None):
        return self.stream.has_permission(env, 'w')

    def delete_allowed(self, env, item=None):
        return self.stream.has_permission(env, 'd')

    def get_item_template(self, env, item):
        return self.stream.item_template_name

    def get_item_form(self, stream, env, item, **kwargs):
        return stream.config.ItemForm.load_initial(env, item, **kwargs)

    def edit_item_handler(self, env, data):
        '''View for item page.'''
        if not env.request.is_xhr:
            return env.render_to_response('layout.html', {})

        item, edit_session, lock_message, filter_form = \
            data.item, data.edit_session, data.lock_message, data.filter_form
        stream = self.stream
        request = env.request

        initial = filter_form.defaults()
        stream_endpoint = stream.stream_endpoint(env)
        stream_url = env.url_for(stream_endpoint)
        create_allowed = save_allowed = self.create_allowed(env)
        delete_url = None
        delete_allowed = False
        success = False

        if item is None:
            if not create_allowed:
                raise HTTPForbidden
            # We must pass initial data to allow creation of models with
            # inheritance.
            item = stream.config.Model(**initial)
            # Don't add it to session since we don't know yet whether it should
            # be saved (there can be errors in form).
        else:
            delete_url = env.url_for(stream_endpoint + '.delete',
                                     item=item.id)\
                            .qs_set(filter_form.get_data())
            save_allowed = self.save_allowed(env, item)
            delete_allowed = self.delete_allowed(env, item)

        form_kw = {}
        if not save_allowed:
            form_kw['permissions'] = 'r'

        form = self.get_item_form(stream, env, item,  initial=initial, **form_kw)

        if request.method == 'POST':
            if not save_allowed:
                raise HTTPForbidden
            if form.accept(request.POST):
                if not lock_message:
                    form.update_instance(item)
                    if item not in env.db:
                        env.db.add(item)

                    stream.commit_item_transaction(env, item)
                    if hasattr(self, 'post_create'):
                        self.post_create(item)

                    item_url = env.url_for(stream.module_name +\
                                           '.item',
                                           item=item.id).qs_set(
                                               filter_form.get_data()),
                    return env.json({'success': True,
                                     'item_id': item.id,
                                     'item_url': item_url})
                else:
                    stream.rollback_due_lock_lost(env, item)
            else:
                stream.rollback_due_form_errors(env, item)
        template_data = dict(filter_form=filter_form,
                             success=success,
                             form=form,
                             roles=env.user.roles,
                             item=item,
                             stream=stream,
                             stream_title=stream.config.title,
                             title=unicode(item),
                             submit_url=env.url_for(stream.module_name +\
                                                    '.item',
                                                    item=item.id).qs_set(
                                                        filter_form.get_data()),

                             menu=stream.module_name,
                             flashmessages=[], # XXX
                             stream_url=stream_url,
                             delete_url=delete_url,
                             actions=[x for x in stream.actions 
                                      if x.for_item and x.is_visible(env, item)],
                             item_buttons=stream.buttons,
                             create_allowed=create_allowed,
                             save_allowed=save_allowed,
                             delete_allowed=delete_allowed,
                             is_popup=('__popup' in request.GET))
        if self.item_lock:
            template_data = dict(template_data,
                             item_lock=self.item_lock,
                             item_global_id=ItemLock.item_global_id(item),
                             lock_message=lock_message,
                             edit_session=edit_session or data.owner_session,
                             lock_timeout=env.cfg.MODEL_LOCK_RENEW)
        template_data = stream.process_item_template_data(env, template_data)
        template_data = self.process_item_template_data(env, template_data)

        html = env.render_to_string(self.get_item_template(env, item), template_data)

        return env.json({
            'html': html,
        })
    __call__ = edit_item_handler

    def process_item_template_data(self, env, template_data):
        '''Preprocessor for template variables.
           Can be overriden by descedant classes.'''
        return template_data


class DeleteItemHandler(StreamAction):

    action='delete'
    title=u'Удалить'

    @property
    def app(self):
        return web.match('/<noneint:item>/delete', 'delete',
                         convs={'noneint': NoneIntConv}) | \
            PrepareItemHandler(self) | self

    def delete_item_handler(self, env, data):
        if not env.request.is_xhr:
            return env.render_to_response('layout.html', {})
        item, edit_session, lock_message, filter_form = \
            data.item, data.edit_session, data.lock_message, data.filter_form
        stream = self.stream

        stream.insure_has_permission(env, 'd')

        stream_url = env.url_for(stream.module_name).qs_set(
            filter_form.get_data())
        item_url = env.url_for(stream.module_name + '.item',
                               item=item.id).qs_set(
                                   filter_form.get_data())
        delete_url = env.url_for(stream.module_name + '.delete', item=item.id)\
                        .qs_set(filter_form.get_data())
        if env.request.method == 'POST':
            env.db.delete(item)
            try:
                env.db.commit()
            except IntegrityError:
                env.db.rollback()
                flash(env, u'Невозможно удалить объект (%s) пока на него'\
                      u' ссылаются другие объекты' % (item,),
                      'failure')
                return env.json({'result': 'failure'})
            return env.json({'result': 'success',
                             'redirect_to': stream_url})
        data = dict(item=item,
                    item_url=item_url,
                    form_url=delete_url,
                    referers=self._list_referers(env, item))
        html  = env.render_to_string('delete', data)
        return env.json({
            #'page': '/',
            'js': [],
            'html': html,
            'init_code':[],
            'flashmessages': [], # XXX
            'css': [],
            'title': u'Удаление объекта «%s»' % item,
            'menu': stream.module_name,
        })
    __call__ = delete_item_handler

    def _list_referers(self, env, obj, limit=50, exclude=None):
        if exclude is None:
            exclude = set()
        result = {}
        for cls, props in self._get_referers(env, obj).items():
            for prop, (count, query) in props.items():
                left = limit - len(result)
                if left <= 0:
                    return result
                indirect = []
                for ref in query[:left]:
                    if ref == obj or ref in exclude or ref in result:
                        continue
                    url = env.get_edit_url(ref)
                    if url is None:
                        indirect.append(ref)
                    else:
                        result[ref] = url
                assert obj not in result
                for ref in indirect:
                    left = limit - len(result)
                    if left <= 0:
                        return result
                    inderect_exclude = exclude | set([obj]) | set(result) | \
                        set(indirect)
                    indirect_referers = self._list_referers(
                        env, ref, limit=left,
                        exclude=inderect_exclude)
                    # XXX The following creates false warnings for DocLink
                    # objects that are "private" to current doc.
                    #if not (exclude or indirect_referers):
                    #    # We have to insure that there is a link for each top
                    #    # level referer (that's why exclude is checked).
                    #    logger.warning("Can't find editable object for %s",
                    #                   ref)
                    result.update(indirect_referers)
                    assert obj not in result
        return result

    def _get_referers(self, env, item):
        '''Returns a dictionary mapping referer model class to query of all
        objects of this class refering to current object.'''
        return {}
        # XXX not implemented
        #cls, ident = identity_key(instance=item)
        #metadata = cls.__table__.metadata
        #result = {}
        #for other_class in metadata._mapped_models:
        #    queries = {}
        #    for prop in class_mapper(other_class).iterate_properties:
        #        if not (isinstance(prop, PropertyLoader) and \
        #                issubclass(cls, prop.mapper.class_)):
        #            continue
        #        query = env.db.query(prop.parent)
        #        comp = prop.comparator
        #        if prop.uselist:
        #            query = query.filter(comp.contains(item))
        #        else:
        #            query = query.filter(comp==item)
        #        count = query.count()
        #        if count:
        #            queries[prop] = (count, query)
        #    if queries:
        #        result[other_class] = queries
        #return result


class CleanFormFieldHandler(StreamAction):

    action = 'clean_form_field'
    allowed_for_new = True,
    title = u'Очистка поля формы'
    display = False
    for_item = False

    @property
    def app(self):
        return web.match('/clean-form-field', 'clean_form_field') | self

    def clean_form_field_handler(self, env, data):
        filter_form = self.stream.FilterForm(env)

        initial = filter_form.defaults()
        form = self.stream.config.ItemForm(env, initial)
        field_name = env.request.POST.get('field')

        field = form.get_field(field_name)
        #assert field_name == field.resolve_name()
        try:
            # We need cleanup even when there is an (non-fatal) error in
            # the field. XXX This will work for Char and subclasses only.
            value = field.conv.clean_value(env.request.POST.get('value'))
            return env.json({'valid': True,
                             'value': value})
        except convs.ValidationError, e:
            return env.json({'valid': False,
                             'error': e.message})
    __call__ = clean_form_field_handler

