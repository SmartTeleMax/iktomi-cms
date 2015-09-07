# -*- coding: utf-8 -*-
from iktomi.utils import cached_property
from iktomi import web
from .stream_handlers import EditItemHandler, PrepareItemHandler
from .stream import Stream

class PrepareLonerHandler(PrepareItemHandler):

    def retrieve_item(self, env, item):
        return self.action.stream.retrieve_item(env, item)

    def prepare_item_handler(self, env, data):
        '''Item actions dispatcher'''
        #insure_is_xhr(env)

        stream = self.action.stream
        stream.insure_has_permission(env, 'r')

        data.filter_form = stream.get_filter_form(env) # XXX

        data.item = self.retrieve_item(env, None)
        self.take_lock(env, data)
        return self.next_handler(env, data)
    __call__ = prepare_item_handler


class LonerHandler(EditItemHandler):

    PrepareItemHandler = PrepareLonerHandler

    @property
    def app(self):
        prepare = self.PrepareItemHandler(self)
        return web.cases(
                web.match('', '') | prepare | self,
                web.match('/autosave', 'autosave') | \
                        web.method('POST', strict=True) | prepare | self.autosave
            )


class Loner(Stream):

    core_actions = [LonerHandler()]

    lock_back_title = u'Вернуться на главную'
    lock_back_help = u'Вернуться на главную страницу'

    #def uid(self, env, version=True):
    #    # Attention! Be careful!
    #    # Do not change format of uid unless you are sure it will not 
    #    # brake tray views, where stream_name and language are parsed out
    #    # from the uid
    #    return 'loners.' + self.module_name

    @cached_property
    def extra_filters(self):
        return getattr(self.config, 'model_filters', {})

    def url_for(self, env, name=None, **kwargs):
        kwargs.pop('item', 0)
        if name and name[:5] in ['item.', 'item']:
            name = name[5:] # XXX
        name = name and '%s.%s' % (self.module_name, name) or self.module_name
        return env.url_for(name, **kwargs)

    @cached_property
    def perms(self):
        p = getattr(self.config, 'permissions', {})
        p.setdefault('wheel', 'rw')
        return p

    def lock_back_url(self, env, item, filter_form):
        return env.root.index

    def retrieve_item(self, env, item):
        Model = self.get_model(env)
        extra_filters = self.extra_filters

        item = env.db.query(Model)\
                     .filter_by(**extra_filters).scalar()
        if item is None:
            item = Model(**extra_filters)
        return item


