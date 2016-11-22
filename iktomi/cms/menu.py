# -*- coding: utf-8 -*-
from iktomi.utils import cached_property, weakproxy
from iktomi.utils.storage import VersionedStorage
from iktomi import web
#from iktomi.cms.stream_handlers import insure_is_xhr


class Menu(object):

    template = 'menu/menu'
    rel = None

    def __init__(self, title, link=None, endpoint=None, params=None,
                 items=None, env=None, template_vars={}, template=None,
                 permissions={'*': 'rwxcd'}, rel=None):
        self.parent = None
        self.title = title
        self.link = link
        self.endpoint = endpoint
        self.params = params or {}
        self.items = filter(None, items or [])
        self._env = env
        self.template = template or self.template
        self.template_vars = template_vars
        self.perms = {'wheel': 'rwxcd'}
        self.perms.update(permissions)
        for item in self.items:
            item.parent = weakproxy(self)
        self.rel = self.rel or rel

    @cached_property
    def env(self):
        return self._env or (self.parent.env if self.parent else None)

    @cached_property
    def request(self):
        return self.env.request

    @cached_property
    def get_permissions(self):
        if self.url is None and not self.has_children:
            return ''
        perms = set(self.perms.get('*', ''))
        if self.env is None:
            return perms
        for role in self.env.user.roles:
            perms |= set(self.perms.get(role, ''))
        return perms

    @cached_property
    def has_children(self):
        for item in self.items:
            if len(item.get_permissions) > 0:
                return True
        return False

    @cached_property
    def url(self):
        if self.link:
            return self.link
        if self.endpoint:
            return self.env.url_for(self.endpoint, **self.params)
        return None

    @cached_property
    def active(self):
        return self.request.path == self.url

    @cached_property
    def endpoint_name(self):
        return self.endpoint

    def __iter__(self):
        for item in self.items:
            yield item

    def render(self):
        if len(self.get_permissions) == 0:
            return ''
        # check if allowed menu has no allowed children nor direct link
        if self.url is None and not self.has_children:
            return ''
        return self.env.render_to_string(self.template, dict(
            menu=self, url=self.url, active=self.active,
            title=self.title, rel=self.rel, **self.template_vars))

    def child_count(self):
        return len(self.items)

    def max_childs(self):
        return reduce(max, [x.child_count() for x in self.items], 1)


class StreamMenu(Menu):

    template = 'menu/stream_menu'

    def __init__(self, stream_name, title=None, create=True,
                 filters=None, items=None, template_vars={},
                 env=None, template=None):
        self.stream_name = stream_name
        if title is not None:
            self.title = title
        self.create = create
        self.filters = filters or {}
        self.items = items or []
        self.template = template or self.template
        self.template_vars = template_vars
        self._env = env
        for item in self.items:
            item.parent = weakproxy(self)

    @cached_property
    def get_permissions(self):
        return self.stream.get_permissions(self.env)

    @cached_property
    def active(self):
        if self.filters:
            return self.url == '%s?%s' % (self.request.path,
                                          self.request.query_string)
        return self.url == self.request.path

    @cached_property
    def stream(self):
        return self.env.streams[self.stream_name]

    @cached_property
    def title(self):
        return self.stream.title

    @cached_property
    def url(self):
        return self.stream.url_for(self.env).qs_set(self.filters)

    @cached_property
    def create_url(self):
        return self.stream.url_for(self.env, 'item', item=None)\
                                                .qs_set(self.filters)

    @cached_property
    def endpoint_name(self):
        return self.stream_name


class ActionMenu(Menu):

    def __init__(self, stream_name, action, title=None, filters=None):
        Menu.__init__(self, title)
        self.stream_name = stream_name
        self.action = action
        self.filters = filters or {}

    @cached_property
    def active(self):
        if self.filters:
            return self.url == '%s?%s' % (self.request.path,
                                          self.request.query_string)
        return self.url == self.request.path

    @cached_property
    def stream(self):
        return self.env.streams[self.stream_name]

    @cached_property
    def url(self):
        return self.stream.url_for(self.env, self.action)(self.filters)


class LonerMenu(StreamMenu):

    #template = 'menu/loner_menu'

    def __init__(self, stream_name, title=None, items=None,
                 template_vars={}, env=None, template=None):
        StreamMenu.__init__(self, stream_name,
                            title=title, items=items,
                            template_vars=template_vars, env=env,
                            template=template)
        self.filters = {}
        self.create = False


class DashCol(Menu):

    template = 'menu/dashboard-col'


class MenuGroup(Menu):

    def __init__(self, items, env=None, template=None):
        Menu.__init__(self, None, items=items, env=env, template=template)


class LangStreamMenu(StreamMenu):

    def __init__(self, *args, **kwargs):
        self.lang = kwargs.pop('lang')
        StreamMenu.__init__(self, *args, **kwargs)

    @cached_property
    def env(self):
        # XXX hack
        env = super(LangStreamMenu, self).env
        vs = VersionedStorage(lang=self.lang)
        vs._storage._parent_storage = env
        return vs


class LangLonerMenu(LonerMenu):
    # XXX DRY

    def __init__(self, *args, **kwargs):
        self.lang = kwargs.pop('lang')
        LonerMenu.__init__(self, *args, **kwargs)

    @cached_property
    def env(self):
        # XXX hack
        env = super(LangLonerMenu, self).env
        vs = VersionedStorage(lang=self.lang)
        vs._storage._parent_storage = env
        return vs


class DashRow(MenuGroup):

    template = 'menu/dashboard'


def DashI18nStream(*args, **kwargs):
    return MenuGroup([LangStreamMenu(*args, **dict(kwargs, lang=lang))
                      for lang in ('ru', 'en')],
                      template="menu/dashboard-row-i18n")


def DashI18nLoner(*args, **kwargs):
    return MenuGroup([LangLonerMenu(*args, **dict(kwargs, lang=lang))
                      for lang in ('ru', 'en')],
                      template="menu/dashboard-row-i18n")


def DashStream(*args, **kwargs):
    kwargs.setdefault('template', 'menu/dashboard-row')
    return StreamMenu(*args, **kwargs)


def DashMenu(*args, **kwargs):
    kwargs.setdefault('template', 'menu/dashboard-row')
    return Menu(*args, **kwargs)


def DashLoner(*args, **kwargs):
    kwargs.setdefault('template', 'menu/dashboard-row')
    return LonerMenu(*args, **kwargs)


class IndexHandler(web.WebHandler):
    "A view for index page"

    def __init__(self, dashboard):
        self.dashboard = dashboard

    def index(self, env, data):
        #insure_is_xhr(env)

        return env.render_to_response('index', dict(
            title=u'Редакторский интерфейс сайта',
            menu='index',
            dashboard=self.dashboard(env),
        ))
    __call__ = index




