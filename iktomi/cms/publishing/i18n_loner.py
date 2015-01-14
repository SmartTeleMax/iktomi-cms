# -*- coding: utf-8 -*-
from iktomi.cms.loner import Loner
from iktomi.cms.publishing.loner import PublishLoner, PublishLonerNoState
from .i18n_stream import I18nStreamMixin


class I18nLonerMixin(I18nStreamMixin):

    def url_for(self, env, name=None, **kwargs):
        kwargs.setdefault('version', getattr(env, 'version', None) or self.versions[0][0])
        kwargs.setdefault('lang', getattr(env, 'lang', None) or self.langs[0][0])
        return Loner.url_for(self, env, name, **kwargs)


class I18nPublishLonerNoState(I18nLonerMixin, PublishLonerNoState):
    pass


class I18nPublishLoner(I18nLonerMixin, PublishLoner):
    pass


