# -*- coding: utf-8 -*-
# Common admin views

from webob.exc import HTTPMethodNotAllowed, HTTPForbidden
from iktomi import web
from iktomi.auth import SqlaModelAuth, LoginForm


@web.request_filter
def auth_required(env, data, next_handler):
    if getattr(env, 'user', None) is not None:
        return next_handler(env, data)

    if (env.request.method not in ('GET', 'HEAD') or \
           env.request.is_xhr or \
           '__ajax' in env.request.GET):
        raise HTTPForbidden()
    form = LoginForm(env)
    return env.render_to_response('login.html', dict(form=form))


class AdminAuth(SqlaModelAuth):

    def get_query(self, env, login):
        return SqlaModelAuth.get_query(self, env, login).filter_by(active=True)

    def identify_user(self, env, user_identity):
        user = SqlaModelAuth.identify_user(self, env, user_identity)
        if user is not None and user.active:
            return user

    def login(self):
        def _login(env, data):
            form = self._login_form(env)
            if env.request.method == 'POST':
                if form.accept(env.request.POST):
                    user_identity = self.get_user_identity(
                                                env, **form.python_data)
                    if user_identity is not None:
                        response = env.json({'success': True})
                        return self.login_identity(user_identity,
                                                   response=response)

                return env.json({'success': False, 'errors': form.errors})
            raise HTTPMethodNotAllowed()

        return web.match('/login', 'login') | _login

    def logout(self, redirect_to=None):
        return SqlaModelAuth.logout(self, redirect_to=redirect_to)


