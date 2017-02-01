# -*- coding: utf-8 -*-
from iktomi import web
from webob.exc import HTTPForbidden


class StreamAction(web.WebHandler):

    item_lock = True
    accepts_item_form = True
    for_item = True
    action = title = cls = js_block = None
    allowed_for_new = False
    display = True
    hint = None
    xhr = True

    def is_available(self, env, item=None):
        """ Rewrite this method to add condition when action is avalible
        """
        if item is None or item.id is None:
            return self.allowed_for_new
        return True

    def is_visible(self, env, item=None):
        """ Tells if this action button is visible.
        """
        return self.is_available(env, item) and self.display

    def insure_is_available(self, env, item=None):
        """ Shortcut to check is_avalible rule on handle
        """
        if not self.is_available(env, item):
            raise HTTPForbidden

    def __init__(self, stream=None, **kw):
        self.init_kwargs = kw
        self.stream = stream
        self.action = kw.get('action', self.action)
        self.title = kw.get('title', self.title)
        self.cls = kw.get('cls', self.cls)
        self.allowed_for_new = kw.get('allowed_for_new', self.allowed_for_new)
        self.display = kw.get('display', self.display)
        self.hint = kw.get('hint', self.hint)
        if stream is not None and \
                getattr(stream.config, 'item_lock', None) == False:
            self.item_lock = False

    def bind(self, stream):
        return self.__class__(stream=stream, **self.init_kwargs)

    def url(self, env, item=None):
        kwargs = {}
        if item:
            kwargs['item'] = item.id
        return self.stream.url_for(env, self.action, **kwargs)

    def help_message(self, env):
        action_name = self.action or self.__class__.__name__
        helpkey = "/".join(['streams',
                            env.stream.module_name,
                            'Action',
                            action_name])
        return env.get_help(helpkey, 'Action')



class PostAction(StreamAction):

    mode = 'post'


class GetAction(StreamAction):

    mode = 'get'


class CustomAction(StreamAction):

    mode = 'custom'


class AfterPostAction(StreamAction):

    mode = 'after-post'


