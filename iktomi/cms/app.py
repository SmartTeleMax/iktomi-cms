# -*- coding: utf-8 -*-
from functools import partial
import json

from jinja2 import Markup
from webob.exc import HTTPSeeOther

from iktomi import web
from iktomi.utils.storage import storage_cached_property, storage_method, storage_property
from iktomi.templates import BoundTemplate
from iktomi.utils import cached_property, quote_js
# XXX include i18n package into iktomi
#from i18n.translation import get_translations


class AdminEnvironment(web.AppEnvironment):

    # Provide following attributes in your subclass:
    #
    # cfg = cfg
    # redis = redis_client
    #   or
    # cache = memcached_client
    # file_manager = file_manager
    # streams = streams
    # models = models
    # static = static
    # db_maker = db_maker
    # template_loader = template_loader
    # get_help = get_help
    #
    # @storage_cached_property
    # def template(storage):
    #     return BoundTemplate(storage, storage.template_loader)

    login = None
    lang = None
    site_lang = 'ru'

    @cached_property
    def url_for(self):
        return self.root.build_url

    @cached_property
    def url_for_static(self):
        return self.static.url_for_static

    @storage_property
    def render_to_string(storage):
        return storage.template.render

    @storage_property
    def render_to_response(storage):
        return storage.template.render_to_response

    @storage_method
    def redirect_to(storage, name, qs, **kwargs):
        url = storage.url_for(name, **kwargs)
        if qs:
            url = url.qs_set(qs)
        return HTTPSeeOther(location=str(url))

    @storage_method
    def json(self, data):
        if getattr(self, '_flash', None):
            assert '_flashmessages' not in data
            data = dict(data, _flashmessages=self._flash)
        return web.Response(json.dumps(data), content_type="application/json")

    @cached_property
    def db(self):
        return self.db_maker()

    @storage_cached_property
    def auth_model(storage):
        return storage.models_.admin.AdminUser

    @storage_cached_property
    def draft_form_model(storage):
        return storage.models_.admin.DraftForm

    @storage_cached_property
    def edit_log_model(storage):
        return storage.models_.admin.EditLog

    @storage_cached_property
    def object_tray_model(storage):
        return storage.models_.admin.ObjectTray

    @storage_cached_property
    def tray_model(storage):
        return storage.models_.admin.Tray

    @storage_method
    def get_edit_url(storage, x):
        return storage.streams.get_edit_url(storage, x)

    def __init__(self, *args, **kwargs):
        web.AppEnvironment.__init__(self, *args, **kwargs)
        self.models_ = self.models # XXX bad naming!!

    # XXX include i18n package into iktomi
    #def get_translations(self, lang):
    #    return get_translations(self.cfg.I18N_TRANSLATIONS_DIR, lang,
    #                            ['iktomi-forms'])

    #@cached_property
    #def _translations(self):
    #    return self.get_translations(self.site_lang)

    #@storage_method
    #def gettext(self, msgid):
    #    message = self._translations.gettext(unicode(msgid))
    #    if isinstance(msgid, Markup):
    #        message = Markup(message)
    #    return message

    #@storage_method
    #def ngettext(self, msgid1, msgid2, n):
    #    message = self._translations.ngettext(unicode(msgid1),
    #                                          unicode(msgid2), n)
    #    if isinstance(msgid1, Markup):
    #        message = Markup(message)
    #    return message

    # XXX include RedisItemLock into iktomi
    #@storage_cached_property
    #def item_lock(storage):
    #    return RedisItemLock(storage)


class AdminContext(object):

    def __init__(self, env):
        self.env = env

    @cached_property
    def top_menu(self):
        # redefine this in your app
        raise NotImplementedError

    def item_trays(self, stream, item):
        ObjectTray = self.env.object_tray_model
        return self.env.db.query(ObjectTray)\
                          .filter_by(stream_name=stream.uid(self.env, version=False),
                                     object_id=item.id).all()

    @cached_property
    def users(self):
        AdminUser = self.env.auth_model
        return self.env.db.query(AdminUser).filter_by(active=True).all()

    @cached_property
    def user_tray(self):
        Tray = self.env.tray_model
        user = self.env.user
        tray = self.env.db.query(Tray).filter_by(editor=user).first()
        if tray is None:
            tray = Tray(editor=user, title=user.name or user.login)
            self.env.db.add(tray)
            self.env.db.commit()
        return tray

    @property
    def flashmessages(self):
        return getattr(self.env, '_flash', [])


class AdminBoundTemplate(BoundTemplate):

    # packer = packer
    # Context = Context
    constant_template_vars = {
        'quote_js': quote_js,
    }

    def get_template_vars(self):
        d = dict(
            self.constant_template_vars,
            env=self.env,
            user=getattr(self.env, 'user', None),
            url_for=self.env.url_for,
            url_for_static=self.env.url_for_static,
            packed_js_tag=partial(self.packer.js_tag, self.env),
            packed_css_tag=partial(self.packer.css_tag, self.env),
            context=self.Context(self.env),
        )
        import_settings = getattr(self.env.cfg, 'TEMPLATE_IMPORT_SETTINGS', [])
        for key in import_settings:
            d[key] = getattr(self.env.cfg, key)
        return d

    def render(self, template_name, __data=None, **kw):
        r = BoundTemplate.render(self, template_name, __data, **kw)
        return Markup(r)
