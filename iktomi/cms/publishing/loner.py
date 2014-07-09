# -*- coding: utf-8 -*-
from iktomi import web
from iktomi.cms.loner import Loner
from iktomi.utils import cached_property
from .stream import PublishItemHandler, PublishAction, UnpublishAction, \
            RevertAction, PublishStreamNoState
from ..loner import LonerHandler, PrepareLonerHandler


class PublishLonerHandler(LonerHandler, PublishItemHandler):
    pass


class BaseLonerAction(object):
    PrepareItemHandler = PrepareLonerHandler

    @property
    def app(self):
        return web.match('/%s' % self.action, self.action) | \
               web.method('POST', strict=True) | \
               self.PrepareItemHandler(self) | self


class LonerPublishAction(BaseLonerAction, PublishAction):
    pass


class LonerUnpublishAction(BaseLonerAction, UnpublishAction):
    pass


class LonerRevertAction(BaseLonerAction, RevertAction):
    pass


class PublishLoner(PublishStreamNoState, Loner):

    core_actions = [PublishLonerHandler(),
                    LonerPublishAction(),
                    LonerRevertAction(),
                    LonerUnpublishAction()]

    def url_for(self, env, name=None, **kwargs):
        kwargs.setdefault('version', getattr(env, 'version', self.versions[0][0]))
        return Loner.url_for(self, env, name, **kwargs)

    @cached_property
    def perms(self):
        p = getattr(self.config, 'permissions', {})
        p.setdefault('wheel', 'rwp')
        return p


class PublishLonerNoState(PublishLoner):

    core_actions = [PublishLonerHandler(),
                    LonerPublishAction(),
                    LonerRevertAction()]



