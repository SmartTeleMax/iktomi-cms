# -*- coding: utf-8 -*-
from datetime import datetime
from iktomi.utils import cached_property
from iktomi.cms.item_lock import lock_template_data, prepare_lock_data
from iktomi import web
from iktomi.utils.mdict import MultiDict
from webob.exc import HTTPForbidden
from .flashmessages import flash


class Loner(object):

    item_lock = True
    autosave = True

    def __init__(self, module_name, config):
        self.config = config
        self.module_name = module_name

    def get_handler(self):
        return  web.prefix('/'+self.module_name, name=self.module_name) | web.cases(
            web.match() | self,
            web.match('/autosave', 'autosave') | self.autosave,
            )

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

    def save_allowed(self, env):
        return self.has_permission(env, 'w')

    def get_item_form_class(self, env):
        return self.config.ItemForm

    def get_item_form(self, env, item, draft=None):
        save_allowed = self.save_allowed(env)
        form_kw = {}
        if not save_allowed:
            form_kw['permissions'] = 'r'

        form_cls = self.get_item_form_class(env)
        form = form_cls.load_initial(env, item, **form_kw)
        form.model = self.get_model(env)
        form.draft = draft
        if draft is not None:
            raw_data = MultiDict(draft.data)
            form.accept(raw_data) # XXX
        return form

    def process_template_data(self, env, template_data):
        return template_data

    def __call__(self, env, data):
        self.insure_has_permission(env, 'r') # XXX Allow read-only mode
        if not env.request.is_xhr:
            return env.render_to_response('layout.html', {})

        save_allowed = self.save_allowed(env)
        extra_filters = getattr(self.config, 'model_filters', {})
        Model = self.get_model(env)
        item = env.db.query(Model)\
                    .filter_by(**extra_filters).scalar()
        if item is None:
            item = Model(**extra_filters)
        prepare_lock_data(env, data, item if self.item_lock else None)
        lock_message = data.lock_message

        autosave_allowed = save_allowed and \
                           getattr(env, 'draft_form_model', None) and \
                           self.autosave
        autosave = autosave_allowed and getattr(data, 'autosave', False)
        if autosave_allowed:
            DraftForm = env.draft_form_model
            draft = DraftForm.get_for_item(env.db, 'loners.' + self.module_name,
                                           item, env.user)
        elif getattr(data, 'autosave', False):
            raise HTTPForbidden
        else:
            draft = None

        form = self.get_item_form(env, item, draft)

        request = env.request
        if request.method=='POST':
            if not save_allowed:
                raise HTTPForbidden()
            accepted = form.accept(request.POST)
            if accepted and not lock_message:
                form.update_instance(item)
                if item not in env.db:
                    env.db.add(item)

                self.commit_item_transaction(env, item)
                return env.json({'success': True})
            elif lock_message and autosave:
                self.rollback_due_lock_lost(env, item)
                return env.json({'success': False,
                                 'error': 'item_lock',
                                 'lock_message': lock_message})
            elif lock_message:
                self.rollback_due_lock_lost(env, item)
            elif autosave:
                self.rollback_due_form_errors(env, item, silent=True)
                if draft is None:
                    draft = DraftForm(stream_name='loners.'+self.module_name,
                                      object_id=item.id)
                    env.db.add(draft)
                draft.data = form.raw_data.items()
                if not env.user in draft.admins:
                    draft.admins.append(env.user)
                draft.update_time = datetime.now()
                env.db.commit()
                return env.json({'success': False,
                                 'error': 'draft',
                                 'draft_id': draft.id,
                                 'errors': form.errors,
                                 })
            else:
                self.rollback_due_form_errors(env, item)
        template_data = dict(
                        loner=self,
                        title=self.title,
                        form=form,
                        roles=env.user.roles,
                        menu=env.current_location,
                        save_allowed=save_allowed,
                        autosave_allowed=autosave_allowed,
                        )

        if self.item_lock:
            template_data.update(lock_template_data(env, data, item))

        template_data = self.process_template_data(env, template_data)
        return env.json({
            'html': env.render_to_string(self.template_name, template_data)
            })

    def autosave(self, env, data):
        data.autosave = True
        return self(env, data)

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

    def rollback_due_lock_lost(self, env, item, silent=False):
        '''rollbacks request.db and flashes failure message'''
        env.db.rollback()
        if not silent:
            flash(env, u'Объект (%s) не был сохранен из-за '
                       u'перехваченной блокировки' % (item,),
                       'failure')

    def url_for(self, env, name=None, **kwargs):
        name = name and '%s.%s' % (self.module_name, name) or self.module_name
        return env.url_for('loners.' + name, **kwargs)


