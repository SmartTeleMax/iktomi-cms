# -*- coding: utf-8 -*-
from iktomi import web
from iktomi.cms.stream import Loner
from iktomi.utils import cached_property
from webob.exc import HTTPNotFound
from iktomi.cms.flashmessages import flash

class PublishLoner(Loner):

    def get_handler(self):
        return web.prefix('/'+self.module_name, name=self.module_name) | web.cases(
                web.match('', '') | self,
                web.match('/published-version', 'published_version') | \
                    self.published_version,
                web.match('/publish', 'publish') | 
                    web.method('POST', strict=True) |
                    self.publish,
                web.match('/revert', 'revert') |
                    web.method('POST', strict=True) |
                    self.revert,
            )

    def get_item_form(self, env, item, **kwargs):
        is_front = kwargs.pop('front', False)
        form = self.config.ItemForm.load_initial(env, item, **kwargs)
        if is_front:
            form.model = self.config.Model._front_model
        else:
            form.model = self.config.Model
        return form

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

    def published_version(self, env, data):
        self.insure_has_permission(env, 'r')
        if not env.request.is_xhr:
            return env.render_to_response('layout.html', {})

        extra_filters = getattr(self.config, 'model_filters', {})
        Model = self.config.Model._front_model
        item = env.db.query(Model)\
                    .filter_by(**extra_filters).scalar()
        if item is None:
            item = Model(**extra_filters)
        form = self.get_item_form(env, item, front=True)

        return env.json({'html': env.render_to_string(self.template_name, dict(
                        title=self.config.title,
                        form=form,
                        loner=self,
                        roles=env.user.roles,
                        front_version=True,
                        ))})

    def _get_item_for_action(self, env):
        self.insure_has_permission(env, 'w')
        Model = self.config.Model
        extra_filters = getattr(self.config, 'model_filters', {})
        item = env.db.query(Model)\
                    .filter_by(**extra_filters).scalar()
        if item is None:
            raise HTTPNotFound()
        return item

    def publish(self, env, data):
        item = self._get_item_for_action(env)
        item.publish()
        env.db.commit()
        flash(env, u'Объект «%s» опубликован' % item, 'success')
        return env.json({'result': 'success',
                         'location': env.url_for('loners.' + self.module_name)})

    def revert(self, env, data):
        item = self._get_item_for_action(env)
        item.revert_to_published()
        env.db.commit()
        flash(env, u'Объект «%s» восстановлен из фронтальной версии' % item, 'success')
        return env.json({'result': 'success',
                         'location': env.url_for('loners.' + self.module_name)})


