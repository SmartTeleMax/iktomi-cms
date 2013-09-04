# -*- coding: utf-8 -*-
from iktomi.utils import cached_property
from iktomi import web
from webob.exc import HTTPForbidden
from .flashmessages import flash

class Loner(object):

    def __init__(self, module_name, config):
        self.config = config
        self.module_name = module_name

    def get_handler(self):
        return  web.match('/'+self.module_name, self.module_name) | self

    @property
    def title(self):
        return self.config.title

    @cached_property
    def template_name(self):
        return getattr(self.config, 'template', 'loner')

    def get_model(self, env):
        return self.config.Model

    def get_permissions(self, env):
        permissions = getattr(self.config, 'permissions', {})
        permissions.setdefault('wheel', 'rwxcd')
        user_permissions = set()
        for role in env.user.roles:
            user_permissions |= set(permissions.get(role, ''))
        return user_permissions

    def has_permission(self, env, permission):
        return permission in self.get_permissions(env)

    def insure_has_permission(self, env, permission):
        if not self.has_permission(env, permission):
            raise HTTPForbidden

    def get_item_form_class(self, env):
        return self.config.ItemForm

    def process_template_data(self, env, template_data):
        return template_data

    def __call__(self, env, data):
        self.insure_has_permission(env, 'w') # XXX Allow read-only mode
        if not env.request.is_xhr:
            return env.render_to_response('layout.html', {})

        extra_filters = getattr(self.config, 'model_filters', {})
        Model = self.get_model(env)
        item = env.db.query(Model)\
                    .filter_by(**extra_filters).scalar()
        if item is None:
            item = Model(**extra_filters)

        form = self.get_item_form(env, item)

        request = env.request
        if request.method=='POST':
            if form.accept(request.POST):
                form.update_instance(item)
                if item not in env.db:
                    env.db.add(item)

                self.commit_item_transaction(env, item)
                return env.json({'success': True})
            else:
                self.rollback_due_form_errors(env, item)
        template_data = dict(
                        loner=self,
                        title=self.title,
                        form=form,
                        roles=env.user.roles,
                        menu=env.current_location,
                        )
        template_data = self.process_template_data(env, template_data)
        return env.json({
            'html': env.render_to_string(self.template_name, template_data)
            })

    def commit_item_transaction(self, env, item, silent=False):
        '''commits request.db and flashes success message'''
        env.db.commit()
        if not silent:
            flash(env, u'Объект (%s) сохранен' % (item,), 'success')

    def rollback_due_form_errors(self, env, item, silent=False):
        env.db.rollback()
        if not silent:
            flash(env, u'Объект (%s) не был сохранен из-за ошибок' % (item,),
                       'failure')

    def url_for(self, env, name=None, **kwargs):
        name = name and '%s.%s' % (self.module_name, name) or self.module_name
        return env.url_for('loners.' + name, **kwargs)


