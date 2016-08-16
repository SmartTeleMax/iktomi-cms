# -*- coding: utf-8 -*-
from iktomi import web
from iktomi.cms.stream_handlers import PrepareItemHandler, EditItemHandler,\
        DeleteItemHandler, StreamListHandler
from iktomi.cms.stream import Stream, ListField, FilterForm
from iktomi.cms.stream_actions import PostAction
from iktomi.cms.flashmessages import flash
from iktomi.cms.publishing.model import _AdminReplicated
from iktomi.utils import cached_property
from iktomi.utils.storage import VersionedStorage
from jinja2 import Markup


class PublishStreamListHandler(StreamListHandler):

    def prepare_data(self, env, data):
        data = StreamListHandler.prepare_data(self, env, data)
        data['allow_add'] = data['allow_add'] and env.version == 'admin'
        return data

    def list_form_data(self, env, paginator, filter_data):
        if env.version == 'admin':
            return StreamListHandler.list_form_data(
                    self, env, paginator, filter_data)
        return {}


class PublishItemHandler(EditItemHandler):

    def save_allowed(self, env, item=None):
        return env.version == 'admin' and \
            EditItemHandler.save_allowed(self, env, item)

    def process_item_template_data(self, env, td):
        # Filter buttons
        td['version'] = env.version
        changes = self.changed_fields(env, td['item'], td['form'])
        td['form'].changed_fields = changes
        return td

    def create_allowed(self, env):
        return self.stream.has_permission(env, 'c') and env.version == 'admin'

    def delete_allowed(self, env, item=None):
        return self.stream.has_permission(env, 'd') and env.version == 'admin'

    def get_front_item_form(self, env, item):
        front_models = _AdminReplicated.front
        if getattr(env, "lang", None):
            front_models = getattr(front_models, env.lang)

        front_env = VersionedStorage(db=env.db,
                                     models=front_models,
                                     user=env.user,
                                     version='front')
        front_env._storage._parent_storage = env

        form_cls = self.stream.config.ItemForm(front_env, {}, item._front_item)
        form = form_cls.load_initial(env, item._front_item, initial={}, permissions='r')
        form.model = self.stream.get_model(env)
        return form

    def _collect_changed_fields(self, diff):
        names = sum([self._collect_changed_fields(subdiff)
                     for subdiff in diff.get('children', [])], [])
        if names:
            return names
        if diff['name'] and diff['changed']:
            return [diff['name']]
        return []

    def changed_fields(self, env, item, admin_form):
        if env.version == 'front' or \
           not item.has_unpublished_changes or \
           not admin_form.is_valid or \
           (hasattr(item, 'state') and \
            item.state not in (item.PUBLIC, item.PRIVATE)):
                #(not item.has_unpublished_changes and \
                # getattr(admin_form, 'draft', None) is None):
            return []

        front_form = self.get_front_item_form(env, item)
        diff = front_form.get_diff(admin_form)
        if diff is None:
            return []
        return self._collect_changed_fields(diff)

    def edit_item_handler(self, env, data):
        # XXX hack!
        data._has_unpublished_changes = False
        if data.item is not None:
            data._has_unpublished_changes = data.item.has_unpublished_changes
        return EditItemHandler.edit_item_handler(self, env, data)
    __call__ = edit_item_handler

    def save_log_item(self, env, data, log, item):
        EditItemHandler.save_log_item(self, env, data, log, item)
        if not log.data_changed:
            # if there were no changes, revert has_unpublished_changes to
            # initial state
            item.has_unpublished_changes = data._has_unpublished_changes
            env.db.commit()


class PublishAction(PostAction):

    action = 'publish'
    cls = 'publish'
    display = True
    for_item = True
    allowed_for_new = False
    accepts_item_form = False
    title = u'Опубликовать'
    hint = u'Перенести изменения из редакторской версии на опубликованную ' \
           u'и сделать её доступной для просмотра на сайте'
    PrepareItemHandler = PrepareItemHandler

    @property
    def app(self):
        return web.match('/<idconv:item>/%s' % self.action, self.action,
                         convs={'idconv': self.stream.id_converter}) | \
               web.method('POST', strict=True) | \
               self.PrepareItemHandler(self) | self

    def admin_publish(self, env, data):
        self.stream.insure_has_permission(env, 'p')
        if data.lock_message:
            self.stream.rollback_due_lock_lost(env, data.item)
            return env.json({'success': False,
                             'error': 'item_lock',
                             'lock_message': data.lock_message})

        log = self.stream.create_log_entry(env, data.item, 'publish')
        if log is not None:
            env.db.add(log)

        data.item.publish()
        flash(env, u'Объект «%s» опубликован' % data.item, 'success')
        env.db.commit()

        url = self.stream.url_for(env, 'item', item=data.item.id)
        return env.json({'success': True,
                         'item_id':data.item.id,
                         'location': url})
    __call__ = admin_publish

    def is_available(self, env, item):
        return item.id is not None and \
            (not hasattr(item, 'state') or item.existing) and \
            (item.has_unpublished_changes or \
                (hasattr(item, 'state') and not item.public)) and \
            self.stream.has_permission(env, 'p') and \
            env.version == 'admin'


class UnpublishAction(PostAction):

    allowed_for_new = False
    accepts_item_form = False
    action = 'unpublish'
    cls = 'unpublish'
    title = Markup(u'Снять<br/> с публикации')
    PrepareItemHandler = PrepareItemHandler

    @property
    def app(self):
        return web.match('/<idconv:item>/%s' % self.action, self.action,
                         convs={'idconv': self.stream.id_converter}) | \
               web.method('POST', strict=True) | \
               self.PrepareItemHandler(self) | self

    def unpublish(self, env, data):
        self.stream.insure_has_permission(env, 'p')
        if data.lock_message:
            self.stream.rollback_due_lock_lost(env, data.item)
            return env.json({'success': False,
                             'error': 'item_lock',
                             'lock_message': data.lock_message})

        log = self.stream.create_log_entry(env, data.item, 'unpublish')
        if log is not None:
            env.db.add(log)

        data.item.unpublish()
        flash(env, u'Объект «%s» снят с публикации' % data.item, 'success')
        env.db.commit()

        url = self.stream.url_for(env, 'item', item=data.item.id)
        return env.json({'success': True,
                         'item_id':data.item.id,
                         'location': url})
    __call__ = unpublish

    def is_available(self, env, item):
        return hasattr(item, 'state') and \
                item.state == item.PUBLIC and \
                self.stream.has_permission(env, 'p') and \
                env.version == 'admin'


class RevertAction(PostAction):

    allowed_for_new = False
    accepts_item_form = False
    action = 'revert'
    cls = 'revert'
    title = Markup(u'Восстановить<br/> из опубликованной')
    hint = u'Отменить изменения, сделанные после публикации'
    PrepareItemHandler = PrepareItemHandler

    @property
    def app(self):
        return web.match('/<idconv:item>/%s' % self.action, self.action,
                         convs={'idconv': self.stream.id_converter}) | \
               web.method('POST', strict=True) | \
               self.PrepareItemHandler(self) | self

    def _clean_item_data(self, stream, env, item):
        form_cls = stream.config.ItemForm
        form = form_cls.load_initial(env, item, initial={}, permissions='r')
        return form.raw_data.items()

    def revert(self, env, data):
        self.stream.insure_has_permission(env, 'p')
        if data.lock_message:
            self.stream.rollback_due_lock_lost(env, data.item)
            return env.json({'success': False,
                             'error': 'item_lock',
                             'lock_message': data.lock_message})


        log = self.stream.create_log_entry(env, data.item, 'revert')
        if log is not None:
            log.before = self._clean_item_data(self.stream, env, data.item)
            env.db.add(log)

        data.item.revert_to_published()

        DraftForm = getattr(env, 'draft_form_model', None)
        if DraftForm is not None:
            draft = DraftForm.get_for_item(env.db,
                                           self.stream.uid(env),
                                           data.item, env.user)
            if draft is not None:
                env.db.delete(draft)

        flash(env, u'Объект «%s» восстановлен из опубликованной версии'
                    % data.item, 'success')
        env.db.commit()

        if log is not None:
            log.after = self._clean_item_data(self.stream, env, data.item)
            env.db.commit()


        url = self.stream.url_for(env, 'item', item=data.item.id)
        return env.json({'success': True,
                         'location': url})
    __call__ = revert

    def is_available(self, env, item):
        if item.id is None or (
                env.version == 'admin' and \
                hasattr(item._front_item, 'state') and \
                item._front_item.state not in (item.PUBLIC, item.PRIVATE)
                ) or not (self.stream.has_permission(env, 'p') and \
                          env.version == 'admin'):
            return False
        if hasattr(env, 'draft_form_model'):
            DraftForm = env.draft_form_model
            draft = DraftForm.get_for_item(env.db, self.stream.uid(env),
                                           item, env.user)
            if draft:
                return True
        return item.has_unpublished_changes


class DeleteFlagHandler(DeleteItemHandler):

    def delete_flag_handler(self, env, data):
        #insure_is_xhr(env)

        if env.request.method != 'POST':
            return DeleteItemHandler.__call__(self, env, data)

        self.stream.insure_has_permission(env, 'd')

        data.item.delete()

        log = self.stream.create_log_entry(env, data.item, 'delete')
        if log is not None:
            env.db.add(log)

        self.clear_tray(env, data.item)
        env.db.commit()

        stream_url = self.stream.url_for(env).qs_set(
                            data.filter_form.get_data())

        return env.json({'success': True,
                         'location': stream_url})
    __call__ = delete_flag_handler

    def is_available(self, env, item):
        if not hasattr(item, 'state'):
            return False
        return env.version == 'admin' and \
            DeleteItemHandler.is_available(self, env, item) and \
            item.state not in (item.ABSENT, item.DELETED)


class HasChangesListField(ListField):

    template='list_field_has_changes.html'

    def __init__(self, name='has_unpublished_changes', title='', **kwargs):
        kwargs.setdefault('link_to_item', False)
        kwargs.setdefault('transform', lambda x: x)
        kwargs.setdefault('classname', 'width-0')
        ListField.__init__(self, name, title, **kwargs)




class PublishStreamNoState(Stream):

    core_actions = [x for x in Stream.core_actions
                    if x.action not in ('delete', 'item')] + [
           PublishItemHandler(),
           DeleteFlagHandler(),
           PublishAction(),
           RevertAction(),
        ]

    list_base_template = 'lang_publish_stream.html'

    versions = (('admin', u'Редакторская версия'),
                ('front', u'Опубликованная версия'),)
    versions_dict = dict(versions)

    def uid(self, env, version=True):
        if version:
            return self.module_name
        return self.module_name + ':version=' + env.version

    def get_filter_form(self, env):
        cls = getattr(self.config, 'FilterForm', FilterForm)
        form = cls(env)
        form.model = self.get_model(env)
        return form

    @property
    def prefix_handler(self):
        @web.request_filter
        def set_models(env, data, nxt):
            #assert data.version in self.versions_dict.keys()
            env.models = getattr(env.models, data.version)
            env.version = data.version
            return nxt(env, data)

        version_prefix = web.prefix('/<any("%s"):version>' % \
                                     ('","'.join(self.versions_dict.keys())))
        #return version_prefix | set_models | \
        return super(PublishStreamNoState, self).prefix_handler |\
               version_prefix | set_models

    @cached_property
    def list_fields(self):
        fields = getattr(self.config, 'list_fields', {})
        cls = fields.__class__
        fields = fields.values()
        fields.insert(1, HasChangesListField())
        return cls(fields)

    @cached_property
    def item_template_name(self):
        return getattr(self.config, 'item_template', 'item_publish')

    def item_query(self, env):
        return env.db.query(self.get_model(env))

    def get_model(self, env):
        return getattr(env.models, self.config.Model)

    def get_edit_url(self, env, item):
        '''
        Checks if item belongs to the stream, and if it's true,
        returns an url to item edit page
        '''
        if hasattr(item, 'models'):
            model = getattr(item.models, self.config.Model, None)
            if model is not None and isinstance(item, model):
                item_ = self.item_query(env).filter_by(id=item.id).scalar()
                if item_ is not None:
                    return self.url_for(env, 'item', item=item.id)

    def commit_item_transaction(self, env, item, **kwargs):
        item._create_versions()
        if item._front_item is not None and (\
                not hasattr(item._front_item, 'state') or \
                item._front_item.state in [item.PRIVATE, item.PUBLIC]):
            # Do not mark NEW items as changed
            item.has_unpublished_changes = True
        Stream.commit_item_transaction(self, env, item, **kwargs)

    def url_for(self, env, name=None, **kwargs):
        kwargs.setdefault('version', getattr(env, 'version', self.versions[0][0]))
        return Stream.url_for(self, env, name, **kwargs)


class PublishStream(PublishStreamNoState):

    core_actions = [x for x in Stream.core_actions
                    if x.action not in ('delete', 'item')
                       and not isinstance(x, StreamListHandler)] + [
           PublishStreamListHandler(),
           PublishItemHandler(),
           DeleteFlagHandler(),
           PublishAction(),
           UnpublishAction(),
           RevertAction(),
        ]

    def item_query(self, env):
        query = PublishStreamNoState.item_query(self, env)
        if not getattr(env, 'absent_items', False): # XXX dirty hack
            Model = self.get_model(env)
            return query.filter(Model.existing)
        return query

