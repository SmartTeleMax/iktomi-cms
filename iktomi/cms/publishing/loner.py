# -*- coding: utf-8 -*-
from iktomi import web
from iktomi.forms import Form
from iktomi.cms.loner import Loner
from iktomi.utils import cached_property
from webob.exc import HTTPNotFound, HTTPMethodNotAllowed
from iktomi.cms.flashmessages import flash

class PublishLoner(Loner):

    versions = (('admin', u'Редакторская версия'),
                ('front', u'Фронтальная версия'),)
    versions_dict = dict(versions)

    def get_handler(self):
        @web.request_filter
        def set_models(env, data, nxt):
            assert data.version in self.versions_dict.keys()
            env.models = getattr(env.models, data.version)
            env.version = data.version
            return nxt(env, data)

        version = '/<any("%s"):version>' % \
                                     '","'.join(self.versions_dict.keys())
        return web.prefix('/'+self.module_name+version, name=self.module_name) | \
            set_models | \
            web.cases(
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
            )

    def url_for(self, env, name=None, **kwargs):
        kwargs.setdefault('version', getattr(env, 'version', self.versions[0][0]))
        return Loner.url_for(self, env, name, **kwargs)

    def save_allowed(self, env):
        return env.version == 'admin' and Loner.save_allowed(self, env)

    def get_model(self, env):
        return getattr(env.models, self.config.Model)

    def get_item_form_class(self, env):
        # if the class is not subclass of Form, then it should be a class_factory.
        # we call it with env.models to get the actual class bound to current models.
        # XXX check is not obvious
        cls = self.config.ItemForm
        if not (isinstance(cls, type) and issubclass(cls, Form)):
            cls = cls(env.models)
            cls.__module__ = self.config.__name__
        return cls

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
        item = self._get_item_for_action(env)
        item.publish()
        env.db.commit()
        flash(env, u'Объект «%s» опубликован' % item, 'success')
        return env.json({'result': 'success',
                         'location': self.url_for(env)})

    def revert(self, env, data):
        if env.version != 'admin':
            raise HTTPNotFound
        item = self._get_item_for_action(env)
        item.revert_to_published()
        env.db.commit()
        flash(env, u'Объект «%s» восстановлен из фронтальной версии' % item, 'success')
        return env.json({'result': 'success',
                         'location': self.url_for(env)})

