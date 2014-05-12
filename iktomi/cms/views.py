# -*- coding: utf-8 -*-
# Common admin views
import logging

from webob.exc import HTTPMethodNotAllowed, HTTPNotFound, HTTPBadRequest, HTTPForbidden
from iktomi import web
from iktomi.cms.stream import expand_stream
from iktomi.cms.stream_handlers import insure_is_xhr
from iktomi.auth import SqlaModelAuth, LoginForm
from .item_lock import ModelLockError, ModelLockedByOther
from iktomi.cms.forms import Form, convs
from iktomi.forms.fields import Field

logger = logging.getLogger(__name__)


class IndexHandler(web.WebHandler):
    def __init__(self, dashboard):
        self.dashboard = dashboard

    def index(self, env, data):
        insure_is_xhr(env)

        return env.render_to_response('index', dict(
            title=u'Редакторский интерфейс сайта',
            menu='index',
            dashboard=self.dashboard(env),
        ))
    __call__ = index


def failure_lock_message(e):
    if isinstance(e, ModelLockedByOther):
        return {'status': 'fail',
                'message': unicode(e),
                'locked_session': e.edit_session}
    return {'status': 'fail',
            'message': unicode(e)}


def update_lock(env, data):
    if env.request.method != "POST":
        raise HTTPMethodNotAllowed()
    try:
        env.item_lock.update(data.item_id, data.edit_session)
    except ModelLockError, e:
        return env.json(failure_lock_message(e))
    return env.json({'status':'updated'})

def force_lock(env, data):
    if env.request.method != "POST":
        raise HTTPMethodNotAllowed()
    try:
        edit_session = env.item_lock.create(data.item_id, True)
    except ModelLockError, e:
        return env.json(failure_lock_message(e))

    return env.json({'status':'captured',
                    'edit_session': edit_session})

def release_lock(env, data):
    if env.request.method != "POST":
        raise HTTPMethodNotAllowed()
    env.item_lock.remove(data.item_id, data.edit_session)
    return env.json({'status':'ok'})


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
                        return self.login_identity(user_identity, response=response)

                return env.json({'success': False, 'errors': form.errors})
            raise HTTPMethodNotAllowed()

        return web.match('/login', 'login') | _login

    def logout(self, redirect_to=None):
        return SqlaModelAuth.logout(self, redirect_to=redirect_to)


object_ref_fields = [
    Field('stream_name',
          conv=convs.Char(convs.limit(0, 50), required=True)),
    Field('object_id',
          conv=convs.Char(convs.limit(0, 50), required=True)),
    ]

class PostNote(web.WebHandler):

    def __init__(self, model):
        self.model = model
        class EditorNoteForm(Form):

            fields = object_ref_fields + [
                Field('body',
                      conv=convs.Char(required=True)),
            ]
        self.EditorNoteForm = EditorNoteForm

    def post_note(self, env, data):
        form = self.EditorNoteForm(env)
        if not form.accept(env.request.POST):
            return env.json({'success': False})
        note = self.model(editor=env.user,
                          **form.python_data)
        env.db.add(note)
        env.db.commit()
        return env.json({'success': True})
    __call__ = post_note



class TrayView(web.WebHandler):

    def __init__(self, Tray, ObjectTray, AdminUser):
        self.Tray = Tray
        self.ObjectTray = ObjectTray

        class MyTrayObjectForm(Form):

            fields = object_ref_fields + [
                Field('comment',
                      conv=convs.Char(required=False)),
            ]

        class TrayObjectForm(Form):

            fields = MyTrayObjectForm.fields + [
                Field('tray',
                      conv=convs.ModelChoice(model=Tray, required=True)),
            ]

        class UserTrayObjectForm(Form):

            fields = MyTrayObjectForm.fields + [
                Field('user',
                      conv=convs.ModelChoice(model=AdminUser,
                                             condition=AdminUser.active==True,
                                             required=True)),
            ]

        self.TrayObjectForm = TrayObjectForm
        self.MyTrayObjectForm = MyTrayObjectForm
        self.UserTrayObjectForm = UserTrayObjectForm


    def put_to_tray(self, env, data):
        form = self.TrayObjectForm(env)
        if not form.accept(env.request.POST):
            return env.json({'success': False,
                             'errors': form.errors})
        return self._put_to_tray(env, **form.python_data)

    def put_to_user_tray(self, env, data):
        form = self.UserTrayObjectForm(env)
        if not form.accept(env.request.POST):
            return env.json({'success': False,
                             'errors': form.errors})
        return self._put_to_user_tray(env, form.python_data['user'], form)

    def _put_to_user_tray(self, env, user, form):
        tray = env.db.query(self.Tray).filter_by(editor=user).first()
        if tray is None:
            tray = self.Tray(editor=user,
                             title=user.name or user.login)
            env.db.add(tray)
            env.db.flush()
        return self._put_to_tray(env, tray=tray, **form.python_data)

    def _put_to_tray(self, env, stream_name=None, object_id=None,
                     tray=None, comment=None, user=None):
        filter_args = dict(stream_name=stream_name,
                           object_id=object_id,
                           tray=tray)
        object_tray = env.db.query(self.ObjectTray)\
                            .filter_by(**filter_args).first()
        if object_tray is not None:
            return env.json({'success': False,
                             'error': u'Объект уже находится в папке'})
        object_tray = self.ObjectTray(**filter_args)
        env.db.add(object_tray)
        object_tray.comment = comment
        object_tray.sender = env.user
        env.db.commit()
        return env.json({'success': True,
                         'id': object_tray.id,
                         'tray_id': tray.id,
                         'title': tray.title})

    def delete_from_tray(self, env, data):
        try:
            id = int(env.request.POST.get('id', ''))
        except ValueError:
            raise HTTPBadRequest()
        obj = env.db.query(self.ObjectTray).get(id)
        if obj is None:
            raise HTTPBadRequest()
        if not obj.can_delete(env.user):
            raise HTTPForbidden()
        env.db.delete(obj)
        env.db.commit()
        return env.json({'success': True})

    def tray(self, env, data):
        insure_is_xhr(env)
        env.models = env.models.admin
        env.version = 'admin'
        tray = env.db.query(self.Tray).get(data.tray)
        if tray is None:
            raise HTTPNotFound()
        objects = env.db.query(self.ObjectTray).filter_by(tray=tray).all()
        items = [expand_stream(env, obj) for obj in objects]

        #changed.sort(key=lambda x: x.date_changed)
        return env.render_to_response('tray', dict(
            tray = tray,
            items = items,
            menu = env.current_location,
            title = tray.title,
        ))

