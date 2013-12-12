# -*- coding: utf-8 -*-
from iktomi import web
from iktomi.cms.loner import Loner
from iktomi.cms.publishing.loner import PublishLoner


class I18nLonerMixin(object):

    langs = (('ru', u'Русский'),
             ('en', u'Английский'),)
    langs_dict = dict(langs)

    def uid(self, env, version=True):
        # Attention! Be careful!
        # Do not change format of uid unless you are sure it will not 
        # brake tray views, where stream_name and language are parsed out
        # from the uid
        if version:
            return self.module_name + ':version=' + env.version + ':lang=' + env.lang
        return self.module_name + ':lang=' + env.lang

    def get_prefix_handler(self):
        @web.request_filter
        def set_models(env, data, nxt):
            #assert data.version in self.versions_dict.keys()
            env.models = getattr(env.models, data.version)
            env.models = getattr(env.models, data.lang)
            env.version = data.version
            env.lang = data.lang
            return nxt(env, data)

        version_prefix = web.prefix('/<any("%s"):version>' % \
                                     ('","'.join(self.versions_dict.keys())))
        lang_prefix = web.prefix('/<any("%s"):lang>' % \
                                     ('","'.join(self.langs_dict.keys())))
        return Loner.get_prefix_handler(self) |\
               version_prefix | lang_prefix | set_models

    def url_for(self, env, name=None, **kwargs):
        kwargs.setdefault('version', getattr(env, 'version', self.versions[0][0]))
        kwargs.setdefault('lang', getattr(env, 'lang', self.langs[0][0]))
        return Loner.url_for(self, env, name, **kwargs)


#class I18nPublishLonerNoState(I18nLonerMixin, PublishLonerNoState):
#    pass


class I18nPublishLoner(I18nLonerMixin, PublishLoner):

    pass


