# -*- coding: utf-8 -*-

from webob.exc import HTTPNotFound

from iktomi import web
from iktomi.cms.stream_actions import GetAction
from iktomi.cms.loner import Loner


class PreviewHandler(GetAction):

    item_lock = True
    allowed_for_new = False
    cls = 'preview'
    action = 'preview'
    title = u'Предпросмотр'

    @property
    def PrepareItemHandler(self):
        return self.stream.edit_action.PrepareItemHandler

    @property
    def app(self):
        if isinstance(self.stream, Loner):
            prefix = web.prefix('/'+self.action, name=self.action)
        else:
            prefix = web.prefix('/<idconv:item>/'+self.action, name=self.action,
                                convs={'idconv': self.stream.id_converter})
        return prefix | self.PrepareItemHandler(self) | self

    def item_url(self, env, data, item):
        raise NotImplementedError

    def external_url(self, env, data, item):
        raise NotImplementedError

    def is_available(self, env, item=None):
        return GetAction.is_available(self, env, item) and \
                getattr(env, 'version', None) != 'front'

    def preview(self, env, data):
        #insure_is_xhr(env)
        if not self.is_available(env, data.item):
            raise HTTPNotFound

        item = data.item

        tdata = dict(filter_form=data.filter_form,
                     roles=env.user.roles,
                     item=item,
                     item_url=self.item_url(env, data, item),
                     item_lock = data.item_lock,
                     external_url=self.external_url(env, data, item),
                     stream=self.stream,
                     stream_url=self.stream.url_for(env),
                     stream_title=self.stream.config.title,
                     title=unicode(item),
                     menu=self.stream.module_name,
                     actions=[x for x in self.stream.actions 
                              if x.for_item and x.is_visible(env, item)
                                and x.action not in ('preview', 'delete')])
        return env.render_to_response('preview', tdata)

    __call__ = preview


