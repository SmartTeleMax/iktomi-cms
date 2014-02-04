# -*- coding: utf-8 -*-
from iktomi.utils import cached_property
from iktomi import web
from .stream_handlers import EditItemHandler, PrepareItemHandler, insure_is_xhr
from .item_lock import prepare_lock_data
from .stream import Stream

class PrepareLonerHandler(PrepareItemHandler):

    def retrieve_item(self, env, item):
        stream = self.action.stream
        Model = stream.get_model(env)
        extra_filters = stream.extra_filters

        item = env.db.query(Model)\
                     .filter_by(**extra_filters).scalar()
        if item is None:
            item = Model(**extra_filters)
        return item

    def prepare_item_handler(self, env, data):
        '''Item actions dispatcher'''
        insure_is_xhr(env)

        stream = self.action.stream
        stream.insure_has_permission(env, 'r')

        data.filter_form = stream.get_filter_form(env) # XXX

        data.item = self.retrieve_item(env, None)
        prepare_lock_data(env, data, data.item if self.action.item_lock else None)
        return self.next_handler(env, data)
    __call__ = prepare_item_handler


class LonerHandler(EditItemHandler):

    PrepareItemHandler = PrepareLonerHandler

    @property
    def app(self):
        return self.PrepareItemHandler(self) | web.cases(
                web.match('', '') | self,
                web.match('/autosave', 'autosave') | \
                        web.method('POST', strict=True) | self.autosave
            )

    def create_allowed(self, env):
        return False

    def delete_allowed(self, env, item=None):
        return False

    def get_item_template(self, env, item):
        return self.stream.template_name


class Loner(Stream):

    core_actions = [LonerHandler()]

    #def uid(self, env, version=True):
    #    # Attention! Be careful!
    #    # Do not change format of uid unless you are sure it will not 
    #    # brake tray views, where stream_name and language are parsed out
    #    # from the uid
    #    return 'loners.' + self.module_name

    @cached_property
    def extra_filters(self):
        return getattr(self.config, 'model_filters', {})

    @cached_property
    def template_name(self):
        return getattr(self.config, 'template', 'loner')

    def url_for(self, env, name=None, **kwargs):
        kwargs.pop('item', 0)
        if name and name[:5] in ['item.', 'item']:
            name = name[5:] # XXX
        name = name and '%s.%s' % (self.module_name, name) or self.module_name
        return env.url_for('loners.' + name, **kwargs)


