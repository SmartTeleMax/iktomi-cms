# -*- coding: utf-8 -*-

import logging, warnings

from webob.exc import HTTPForbidden
from jinja2 import Markup

from iktomi.utils import cached_property
from iktomi.utils.odict import OrderedDict
from iktomi.utils.mdict import MultiDict
from iktomi import web
from iktomi.forms import Form
from iktomi.forms.media import FormJSInline, FormJSRef
from . import stream_handlers as handlers
from .flashmessages import flash

logger = logging.getLogger(__name__)


def I18nLabel(string, lang):
    return Markup(u'<span class="lang-%s">%s</span>' % (lang, string))


def ListFields(*args):
    fields = []
    for field in args:
        if not isinstance(field, ListField):
            field = ListField(*field)
        fields.append(field)
    if not fields or fields[0].name != 'id':
        fields.insert(0, ListField('id', 'ID', '0%'))
    fields.insert(1, ItemLockListField())
    return OrderedDict(fields)


class ListField(object):

    template='list_field.html'

    def __init__(self, name, title, width='auto', image=False,
                 transform=lambda f: u'—' if f is None else f,
                 static=False, link_to_item=True, classname='',
                 template=None):
        self.name = name
        self.title = title
        self.width = width
        self.image = image
        self.static = static
        self.transform = transform
        self.link_to_item = link_to_item
        self.classname = classname
        self.template = template or self.template

    def __iter__(self):
        yield self.name
        yield self

    def __call__(self, env, item, url, loop):
        field_val = self.get_value(env, item, url, loop)
        if self.transform is not None:
            return self.transform(field_val)
        return field_val

    def get_value(self, env, item, url, loop):
        return getattr(item, self.name)


class ItemLockListField(ListField):

    template='list_field_item_lock.html'

    def __init__(self, name='locked', title='', **kwargs):
        kwargs.setdefault('link_to_item', False)
        kwargs.setdefault('transform', lambda x: x)
        kwargs.setdefault('width', '0%')
        return ListField.__init__(self, name, title, **kwargs)

    def get_value(self, env, item, url, loop):
        lock = env.item_lock.check(item)
        if lock is not None:
            return env.db.query(env.auth_model)\
                         .get(lock['user_id'])


class FilterForm(Form):

    media = [FormJSRef('filter_form.js')]

    fields = []

    def filter_by_scalar(self, query, field, value):
        return query.filter(getattr(self.model, field.name)==value)

    def filter_by_list(self, query, field, values):
        prop = getattr(self.model, field.name)
        for value in values:
            query = query.filter(prop.contains(value))
        return query

    def filter_by_default(self, query, field, value):
        if field.multiple:
            return self.filter_by_list(query, field, value)
        else:
            return self.filter_by_scalar(query, field, value)

    def filter(self, query):
        '''Modifies query'''
        # XXX will not work with FieldBlocks!
        for field in self.fields:
            filter_value = self.python_data[field.name]
            if filter_value or filter_value == 0:
                method = getattr(self, 'filter_by__%s' % field.name,
                                 getattr(field, 'filter_query',
                                         self.filter_by_default))
                query = method(query, field, filter_value)
        return query

    def defaults(self):
        return {}

    def get_data(self, compact=True):
        data = MultiDict(self.raw_data) # XXX
        if compact:
            compact_data = MultiDict()
            for key, value in data.iteritems():
                if value:
                    compact_data.append(key, value)
            data = compact_data
        return data

    def __nonzero__(self):
        # We don't want to display form when there is no fields
        return bool(self.fields)

    def get_media(self):
        return [
            FormJSInline('new FilterForm("%s");' % self.id),
        ] + Form.get_media(self)


class Stream(object):

    actions = []
    core_actions = [handlers.StreamListHandler(),
                    handlers.EditItemHandler(),
                    handlers.DeleteItemHandler(),
                    handlers.CleanFormFieldHandler(),
                    ]

    buttons = ['save', 'save_and_continue', 'save_and_add_another', 'delete']

    def __init__(self, module_name, config):
        self.config = config
        self.module_name = module_name
        self.actions = [x.bind(self) for x in self.core_actions + self.actions]
        self.core_actions = []

    @property
    def prefix_handler(self):
        """ Handler match stream path, setup stream namespace and env"""
        @web.request_filter
        def set_stream_handler(env, data, nxt):
            env.stream = self
            return nxt(env, data)

        part = self.module_name.rsplit('.', 1)[-1]
        return web.prefix('/' +part) | \
               web.namespace(part) | \
               set_stream_handler

    @property
    def app_handler(self):
        """ Handler add stream action's app handlers """
        apps = [action.app for action in self.actions]
        return web.cases(*apps)

    def get_handler(self, from_ns=None):
        """ Get web handler for routing.

        from_ns -- passed in case we need relative handler,
                   that later we will place inside existing namespace
        """
        assert from_ns is None or self.module_name.startswith(from_ns), \
            "from_ns should point out namespace that we are already in, "\
            "that also part of curent stream module_name"

        return self.prefix_handler | self.app_handler

    def url_for(self, env, name=None, **kwargs):
        name = name and '%s.%s' % (self.module_name, name) or self.module_name
        return env.url_for(name, **kwargs)

    @cached_property
    def app_namespace(self):
        if '.' in self.module_name:
            return self.module_name.rsplit('.', 1)[0]
        return ''

    @cached_property
    def perms(self):
        p = getattr(self.config, 'permissions', {})
        p.setdefault('wheel', 'rwxcd')
        return p

    @cached_property
    def list_edit_action(self):
        for action in self.actions:
            if hasattr(action, 'ListItemForm'):
                return action

    @cached_property
    def ListItemForm(self):
        if self.list_edit_action:
            return self.list_edit_action.ListItemForm

    @cached_property
    def stream_template_name(self):
        if hasattr(self.config, 'stream_template'):
            return self.config.stream_template
        if hasattr(self.config, 'template'):
            warnings.warn("Stream.config.template is deprecated",
                          category=DeprecationWarning)
            return self.config.template
        return 'stream'

    @cached_property
    def row_template_name(self):
        return getattr(self.config, 'row_template', 'stream_row')

    @cached_property
    def item_template_name(self):
        return getattr(self.config, 'item_template', 'item')

    @cached_property
    def template_data(self):
        return getattr(self.config, 'template_data', {})

    @cached_property
    def live_search(self):
        return getattr(self.config, 'live_search', False)

    @cached_property
    def list_fields(self):
        return getattr(self.config, 'list_fields', {})

    @cached_property
    def title(self):
        return getattr(self.config, 'title', self.module_name)

    @cached_property
    def FilterForm(self):
        return getattr(self.config, 'FilterForm', FilterForm)

    def process_item_template_data(self, env, template_data):
        '''Preprocessor for template variables.
           Can be overriden by descedant classes.'''
        return template_data

    def process_list_template_data(self, env, template_data):
        '''Preprocessor for template variables.
           Can be overriden by descedant classes.'''
        return template_data

    def order(self, query):
        return query

    def get_permissions(self, env):
        perms = set()
        for role in env.user.roles:
            perms |= set(self.perms.get(role, ''))
        return perms

    def has_permission(self, env, permission):
        return permission in self.get_permissions(env)

    def insure_has_permission(self, env, permission):
        if not self.has_permission(env, permission):
            raise HTTPForbidden

    def stream_endpoint(self, env):
        return self.module_name

    def stream_url(self, request):
        return request.url_for(self.stream_endpoint(request))

    def __repr__(self):
        return '<%s.%s: %s>' % (self.__class__.__module__, self.__class__.__name__, self.module_name)

    def item_query(self, env):
        query = env.db.query(self.config.Model)
        return query

    # ========= Item actions ====

    def commit_item_transaction(self, env, item):
        '''commits request.db and flashes success message'''
        env.db.commit()
        flash(env, u'Объект (%s) сохранен' % (item,), 'success')

    def rollback_due_lock_lost(self, env, item):
        '''rollbacks request.db and flashes failure message'''
        env.db.rollback()
        flash(env, u'Объект (%s) не был сохранен из-за '
                   u'перехваченной блокировки' % (item,),
                   'failure')

    def rollback_due_form_errors(self, env, item):
        env.db.rollback()
        flash(env, u'Объект (%s) не был сохранен из-за ошибок' % (item,),
                   'failure')


class Loner(object):

    def __init__(self, module_name, config):
        self.config = config
        self.module_name = module_name

    def get_handler(self):
        return  web.match('/'+self.module_name, self.module_name) | self

    @property
    def title(self):
        return self.config.title

    @cached_property
    def template_name(self):
        return getattr(self.config, 'template', 'loner')

    def get_model(self, env):
        return self.config.Model

    def get_permissions(self, env):
        permissions = getattr(self.config, 'permissions', {})
        permissions.setdefault('wheel', 'rwxcd')
        user_permissions = set()
        for role in env.user.roles:
            user_permissions |= set(permissions.get(role, ''))
        return user_permissions

    def has_permission(self, env, permission):
        return permission in self.get_permissions(env)

    def insure_has_permission(self, env, permission):
        if not self.has_permission(env, permission):
            raise HTTPForbidden

    def get_item_form(self, env, item, **kwargs):
        return self.config.ItemForm.load_initial(env, item, **kwargs)

    def __call__(self, env, data):
        self.insure_has_permission(env, 'w') # XXX Allow read-only mode
        if not env.request.is_xhr:
            return env.render_to_response('layout.html', {})

        extra_filters = getattr(self.config, 'model_filters', {})
        item = env.db.query(self.config.Model)\
                    .filter_by(**extra_filters).scalar()
        if item is None:
            item = self.config.Model(**extra_filters)

        form = self.get_item_form(env, item)

        request = env.request
        if request.method=='POST':
            if form.accept(request.POST):
                form.update_instance(item)
                if item not in env.db:
                    env.db.add(item)

                self.commit_item_transaction(env, item)
                return env.json({'success': True})
            else:
                self.rollback_due_form_errors(env, item)
        return env.json({'html': env.render_to_string(self.template_name, dict(
                        loner=self,
                        title=self.config.title,
                        form=form,
                        roles=env.user.roles,
                        menu=(env.namespace + '.' + env.current_url_name).rstrip('.'),
                        ))})

    def commit_item_transaction(self, env, item):
        '''commits request.db and flashes success message'''
        env.db.commit()
        flash(env, u'Объект (%s) сохранен' % (item,), 'success')

    def rollback_due_form_errors(self, env, item):
        env.db.rollback()
        flash(env, u'Объект (%s) не был сохранен из-за ошибок' % (item,),
                   'failure')


