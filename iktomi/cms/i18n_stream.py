# -*- coding: utf-8 -*-
from iktomi import web
from iktomi.cms.stream import Stream


class I18nStream(Stream):

    langs = [('ru', u'Русский'),
             ('en', u'Английский')]
    langs_dict = dict(langs)
    items_are_i18n = True
    list_base_template = 'lang_publish_stream.html' # XXX ?

    def uid(self, env, version=False):
        # Attention! Be careful!
        # Do not change format of uid unless you are sure it will not 
        # brake tray views, where stream_name and language are parsed out
        # from the uid
        return self.module_name + ':lang=' + env.lang

    @property
    def prefix_handler(self):
        @web.request_filter
        def set_models(env, data, nxt):
            env.models = getattr(env.models, data.lang)
            env.lang = data.lang
            return nxt(env, data)

        lang_prefix = web.prefix('/<any("%s"):lang>' % \
                                     ('","'.join(self.langs_dict.keys())))
        return Stream.prefix_handler.fget(self) | lang_prefix | set_models

    def url_for(self, env, name=None, **kwargs):
        kwargs.setdefault('lang', getattr(env, 'lang', None) or self.langs[0][0])
        return Stream.url_for(self, env, name, **kwargs)

    def get_model(self, env):
        return getattr(getattr(env.models, env.lang),
                       self.config.Model)
