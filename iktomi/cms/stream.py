# -*- coding: utf-8 -*-

import logging
import warnings
from collections import OrderedDict

from webob.exc import HTTPForbidden
from webob.multidict import MultiDict
from jinja2 import Markup

from iktomi import web
from iktomi.web.url_converters import Converter, default_converters
from iktomi.utils import cached_property
from iktomi.utils.storage import VersionedStorage
from iktomi.utils.deprecation import deprecated
from iktomi.cms.forms import Form
from iktomi.cms.item_lock import ItemLock
from iktomi.cms import stream_handlers as handlers
from iktomi.cms.flashmessages import flash

logger = logging.getLogger(__name__)


_none_converter_factory_cache = {}


def none_converter_factory(cls):
    if cls in _none_converter_factory_cache:
        return _none_converter_factory_cache[cls]

    class NoneConverter(cls):
        regex = Converter.regex

        def to_python(self, value, **kwargs):
            if value == '+':
                return None
            return super(NoneConverter, self).to_python(value, **kwargs)

        def to_url(self, value):
            if value is None:
                return '+'
            return super(NoneConverter, self).to_url(value)

    _none_converter_factory_cache[cls] = NoneConverter

    return NoneConverter


def I18nLabel(string, lang):
    return Markup(u'<span class="lang-%s">%s</span>' % (lang, string))


def ListFields(*args):
    fields = []
    for field in args:
        if not isinstance(field, ListField):
            field = ListField(*field)
        fields.append(field)
    if not fields or fields[0].name != 'id':
        fields.insert(0, ListField('id', 'ID', classname='width-0'))
    fields.insert(1, ItemLockListField())
    return OrderedDict(fields)


class ListField(object):

    template = 'list_field.html'

    # Use classname and define width in css files
    _obsolete = frozenset(['width'])

    def __init__(self, name, title, image=False,
                 transform=lambda f: u'—' if f is None else f,
                 static=False, link_to_item=True, classname='',
                 template=None, **kwargs):
        if self._obsolete & set(kwargs):
            raise TypeError('Obsolete parameters are used: {}'.format(
                list(self._obsolete & set(kwargs))))
        self.name = name
        self.title = title
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

    template = 'list_field_item_lock.html'

    def __init__(self, name='locked', title='', **kwargs):
        kwargs.setdefault('link_to_item', False)
        kwargs.setdefault('transform', lambda x: x)
        kwargs.setdefault('classname', 'width-0')
        ListField.__init__(self, name, title, **kwargs)

    def get_value(self, env, item, url, loop):
        lock = env.item_lock.check(item)
        if lock is not None:
            return dict(lock,
                        guid=env.item_lock.item_global_id(item),
                        user=env.db.query(env.auth_model)\
                                   .get(lock['user_id']))


class FilterForm(Form):

    fields = []

    js_block = 'filter-form'
    search_input = None # for live search widget
    help_category = 'FilterForm'

    def filter_by_scalar(self, query, field, value):
        return query.filter(getattr(self.model, field.name) == value)

    def filter_by_true(self, query, field, value):
        if value:
            return self.filter_by_scalar(query, field, value)
        return query

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
                    compact_data.add(key, value)
            data = compact_data
        return data

    def __nonzero__(self):
        # We don't want to display form when there is no fields
        return bool(self.fields)


class Stream(object):
    id_converter_name = 'int'

    actions = []
    core_actions = [handlers.StreamListHandler(),
                    handlers.EditItemHandler(),
                    handlers.DeleteItemHandler(),
                    handlers.GetReferrersHandler(),
                    ]

    buttons = ['save', 'save_and_continue', 'save_and_add_another', 'delete']

    lock_back_title = None
    lock_back_help = None

    def __init__(self, module_name, config):
        self.config = config
        self.module_name = module_name
        self.actions = [x.bind(self) for x in self.core_actions + self.actions]
        self.core_actions = []

    @cached_property
    def id_converter(self):
        return default_converters.get(self.id_converter_name)

    @cached_property
    def id_none_converter(self):
        return none_converter_factory(self.id_converter)

    @property
    def prefix_handler(self):
        """ Handler match stream path, setup stream namespace and env"""
        @web.request_filter
        def set_stream_handler(env, data, nxt):
            env.stream = self
            return nxt(env, data)

        part = self.module_name.rsplit('.', 1)[-1]
        return web.prefix('/' + part, name=part) | \
               set_stream_handler

    @property
    def app_handler(self):
        """ Handler add stream action's app handlers """
        apps = [action.app for action in self.actions]
        return web.cases(*apps)

    def get_handler(self):
        """ Get web handler for routing.
        """
        return self.prefix_handler | self.app_handler

    def url_for(self, env, name=None, **kwargs):
        name = name and '%s.%s' % (self.module_name, name) or self.module_name
        return env.url_for(name, **kwargs)

    def get_edit_url(self, env, item):
        '''
        Checks if item belongs to the stream, and if it's true,
        returns an url to item edit page
        '''
        # be careful, this method is redefined for publish streams
        if isinstance(item, self.get_model(env)):
            #cls, id = identity_key(instance=item)
            item_ = self.item_query(env).filter_by(id=item.id).scalar()
            if item_ is not None:
                return self.url_for(env, 'item', item=item.id)

    @cached_property
    def autosave(self):
        return getattr(self.config, 'autosave', True)

    @cached_property
    @deprecated("use `stream.edit_log_action is not None` instead")
    def edit_log(self):
        return any(x for x in self.actions if x.action == 'edit_log')

    @cached_property
    def referrers(self):
        return any(x for x in self.actions if x.action == 'referrers')

    @cached_property
    def app_namespace(self):
        if '.' in self.module_name:
            return self.module_name.rsplit('.', 1)[0]
        return ''

    @cached_property
    def perms(self):
        p = getattr(self.config, 'permissions', {})
        p.setdefault('wheel', 'rwxcdp')
        return p

    @cached_property
    def edit_action(self):
        for action in self.actions:
            if action.action == 'item':
                return action

    @cached_property
    def list_edit_action(self):
        for action in self.actions:
            if hasattr(action, 'ListItemForm'):
                return action

    @cached_property
    def preview_action(self):
        for action in self.actions:
            if action.action == 'preview':
                return action

    @cached_property
    def edit_log_action(self):
        for action in self.actions:
            if action.action == 'edit_log':
                return action

    def create_log_entry(self, env, item, type_):
        EditLog = getattr(env, 'edit_log_model', None)
        log_enabled = EditLog is not None and \
                      self.edit_log_action is not None
        if log_enabled:
            return EditLog(stream_name=self.uid(env),
                           type=type_,
                           object_id=item.id,
                           global_id=ItemLock.item_global_id(item),
                           users=[env.user])

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

    def uid(self, env, version=None):
        return self.module_name

    def get_filter_form(self, env):
        cls = getattr(self.config, 'FilterForm', FilterForm)
        form = cls(env)
        form.model = self.get_model(env)
        return form

    def process_item_template_data(self, env, template_data):
        '''Preprocessor for template variables.
           Can be overriden by descedant classes.'''
        return template_data

    def process_list_template_data(self, env, template_data):
        '''Preprocessor for template variables.
           Can be overriden by descedant classes.'''
        return template_data

    def lock_back_url(self, env, item, filter_form):
        return self.url_for(env).qs_set(filter_form.get_data())

    def order(self, query):
        return query

    def get_permissions(self, env):
        perms = set()
        for role in env.user.roles:
            # XXX how does it work for wheel?
            perms |= set(self.perms.get(role, ''))
        return perms

    def has_permission(self, env, permission):
        return permission in self.get_permissions(env)

    def insure_has_permission(self, env, permission):
        if not self.has_permission(env, permission):
            raise HTTPForbidden

    #def stream_endpoint(self, env):
    #    return self.module_name
    #def stream_url(self, request):
    #    return request.url_for(self.stream_endpoint(request))

    def get_model(self, env):
        return self.config.Model

    def __repr__(self):
        cls = self.__class__
        return '<%s.%s: %s>' % (cls.__module__, cls.__name__, self.module_name)

    def item_query(self, env):
        return env.db.query(self.get_model(env))

    # ========= Item actions ====

    def commit_item_transaction(self, env, item, silent=False):
        '''commits request.db and flashes success message'''
        env.db.commit()
        if not silent:
            flash(env, u'Объект (%s) сохранен' % (item,), 'success')

    def rollback_due_lock_lost(self, env, item, silent=False):
        '''rollbacks request.db and flashes failure message'''
        env.db.rollback()
        if not silent:
            flash(env, u'Объект (%s) не был сохранен из-за '
                       u'перехваченной блокировки' % (item,),
                       'failure')

    def rollback_due_form_errors(self, env, item, silent=False):
        env.db.rollback()
        if not silent:
            flash(env, u'Объект (%s) не был сохранен из-за ошибок' % (item,),
                       'failure')

    def get_help(self, env, title, category='StreamSubmenu'):
        helpkey = "/".join(['streams',
                            self.module_name,
                            category,
                            title])
        return env.get_help(helpkey, category)

def decode_stream_uid(stream_name):
    if ':' in stream_name:
        name = stream_name.split(':', 1)[0]
        params = dict([x.split('=', 1) for x in
                       stream_name.split(':')[1:]
                       if '=' in x])
        return name, params
    return stream_name, {}


def expand_stream(env, obj):
    stream_name, params = decode_stream_uid(obj.stream_name)

    stream_env = VersionedStorage()
    stream_env._storage._parent_storage = env

    if 'lang' in params:
        stream_env.models = getattr(env.models, params['lang'])
        stream_env.lang = params['lang']
    if stream_name not in env.streams:
        # Deleted or renamed stream
        raise NotImplementedError
    stream = env.streams[stream_name]
    item = stream.item_query(stream_env)\
                 .filter_by(id=obj.object_id).first()
    if item is not None:
        stream_title = stream.title
        if 'lang' in params:
            stream_title = I18nLabel(stream_title, params['lang'])
        url = stream.url_for(stream_env, 'item',
                             item=obj.object_id, **params)
        return (url, stream_title, stream, obj, item)
