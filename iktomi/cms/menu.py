from iktomi.utils import cached_property, weakproxy

class Menu(object):

    template = 'menu/menu'

    def __init__(self, title, link=None, endpoint=None, params=None,
                 items=None, env=None, template_vars={},
                 permissions= {'*': 'rwxcd'}):
        self.parent = None
        self.title = title
        self.link = link
        self.endpoint = endpoint
        self.params = params or {}
        self.items = items or []
        self._env = env
        self.template_vars = template_vars
        self.perms = {'wheel': 'rwxcd'}
        self.perms.update(permissions)
        for item in self.items:
            item.parent = weakproxy(self)

    @cached_property
    def env(self):
        return self._env or (self.parent.env if self.parent else None)

    @cached_property
    def request(self):
        return self.env.request

    @cached_property
    def get_permissions(self):
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
            title=self.title, **self.template_vars))


class StreamMenu(Menu):

    template = 'menu/stream_menu'

    def __init__(self, streams, stream_name, title=None, create=True,
                 filters=None, items=None, template_vars={},
                 env=None):
        self.streams = streams
        self.stream_name = stream_name
        if title is not None:
            self.title = title
        self.create = create
        self.filters = filters or {}
        self.items = items or []
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
        return self.streams[self.stream_name]

    @cached_property
    def title(self):
        return self.stream.title

    @cached_property
    def url(self):
        return self.env.url_for(self.stream_name).qs_set(self.filters)

    @cached_property
    def create_url(self):
        return self.env.url_for(self.stream_name + '.item', item=None)\
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
    def url(self):
        return self.env.url_for(self.stream_name + '.action',
                                action=self.action)(self.filters)


class LonerMenu(Menu):

    def __init__(self, loners, loner_name, title=None, items=None,
                 template_vars={}, env=None):
        self.loners = loners
        self.loner_name = loner_name
        if title is not None:
            self.title = title
        self.items = items or []
        self.template_vars = template_vars
        self._env = env
        for item in self.items:
            item.parent = weakproxy(self)

    @cached_property
    def loner(self):
        return self.loners[self.loner_name]

    @cached_property
    def title(self):
        return self.loner.title

    @cached_property
    def url(self):
        return self.env.url_for('loners.'+self.loner_name)

    @cached_property
    def get_permissions(self):
        return self.loner.get_permissions(self.env)

    @cached_property
    def endpoint_name(self):
        return 'loners.'+self.loner_name

