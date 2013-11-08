# -*- coding: utf-8 -*-
from iktomi import web
from iktomi.cms.loner import Loner
from iktomi.utils import cached_property
from webob.exc import HTTPNotFound, HTTPMethodNotAllowed
from iktomi.cms.flashmessages import flash

class PublishLoner(Loner):

    versions = (('admin', u'Редакторская версия'),
                ('front', u'Фронтальная версия'),)
    versions_dict = dict(versions)
    with_state = False

    def get_prefix_handler(self):
        @web.request_filter
        def set_models(env, data, nxt):
            assert data.version in self.versions_dict.keys()
            env.models = getattr(env.models, data.version)
            env.version = data.version
            return nxt(env, data)

        version_prefix = web.prefix('/<any("%s"):version>' % \
                                     ('","'.join(self.versions_dict.keys())))
        return Loner.get_prefix_handler(self) | version_prefix | set_models

    def get_app_handler(self):
        handlers = [
            web.match() | self,
            web.match('/autosave', 'autosave') | self.autosave,
            #web.match('/published-version', 'published_version') | \
            #    self.published_version,
            web.match('/publish', 'publish') | 
                web.method('POST', strict=True) |
                self.publish,
            web.match('/revert', 'revert') |
                web.method('POST', strict=True) |
                self.revert,
            ]
        if self.with_state:
            handlers.append(
                web.match('/unpublish', 'unpublish') |
                    web.method('POST', strict=True) |
                    self.unpublish)
        return web.cases(*handlers)

    def uid(self, env, version=True):
        # Attention! Be careful!
        # Do not change format of uid unless you are sure it will not 
        # brake tray views, where stream_name and language are parsed out
        # from the uid
        if version:
            return self.module_name + ':version=' + env.version
        return self.module_name

    def url_for(self, env, name=None, **kwargs):
        kwargs.setdefault('version', getattr(env, 'version', self.versions[0][0]))
        return Loner.url_for(self, env, name, **kwargs)

    def save_allowed(self, env):
        return env.version == 'admin' and Loner.save_allowed(self, env)

    def get_model(self, env):
        return getattr(env.models, self.config.Model)

    @cached_property
    def template_name(self):
        return getattr(self.config, 'template', 'loner_publish')

    def commit_item_transaction(self, env, item):
        item.has_unpublished_changes = True
        if not item._front_item:
            env.db.flush()
            # XXX it is better to do this automatically on before_insert or
            #     after_insert
            item._create_front_object()
        Loner.commit_item_transaction(self, env, item)

    def process_template_data(self, env, template_data):
        return dict(template_data,
                    version=env.version)

    def _get_item_for_action(self, env):
        self.insure_has_permission(env, 'w')
        Model = self.get_model(env)
        extra_filters = getattr(self.config, 'model_filters', {})
        item = env.db.query(Model)\
                    .filter_by(**extra_filters).scalar()
        if item is None:
            raise HTTPNotFound()
        return item

    def __call__(self, env, data):
        if env.version != 'admin' and env.request.method == 'POST':
            raise HTTPMethodNotAllowed
        return Loner.__call__(self, env, data)

    def publish(self, env, data):
        if env.version != 'admin':
            raise HTTPNotFound
        self.insure_has_permission(env, 'w')
        item = self._get_item_for_action(env)
        item.publish()
        env.db.commit()
        flash(env, u'Объект «%s» опубликован' % item, 'success')
        return env.json({'result': 'success',
                         'location': self.url_for(env)})

    def revert(self, env, data):
        if env.version != 'admin':
            raise HTTPNotFound
        self.insure_has_permission(env, 'w')
        item = self._get_item_for_action(env)
        item.revert_to_published()
        env.db.commit()
        flash(env, u'Объект «%s» восстановлен из фронтальной версии' % item, 'success')
        return env.json({'result': 'success',
                         'location': self.url_for(env)})

    def unpublish(self, env, data):
        if env.version != 'admin':
            raise HTTPNotFound
        self.insure_has_permission(env, 'w')
        item = self._get_item_for_action(env)
        #if data.lock_message:
        #    self.stream.rollback_due_lock_lost(env, data.item)
        #    return env.json({})

        item.unpublish()
        env.db.commit()

        flash(env, u'Объект «%s» снят с публикации' % item, 'success')
        return env.json({'result': 'success',
                         'location': self.url_for(env)})
