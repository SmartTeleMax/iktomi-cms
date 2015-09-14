# -*- coding: utf-8 -*-
# Common admin views
from webob.exc import HTTPNotFound, HTTPBadRequest, HTTPForbidden
from iktomi import web
from iktomi.cms.stream import expand_stream
from iktomi.web.shortcuts import Rule
from iktomi.cms.forms import Form, convs
from iktomi.cms.forms.fields import Field, object_ref_fields


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

    @property
    def app(self):
        return web.prefix('/tray') | web.cases(
            Rule('/<int:tray>', self.tray),
            web.prefix('/_') | web.method('POST', strict=True) | web.cases(
                Rule('/put', self.put_to_tray),
                Rule('/user/put', self.put_to_user_tray),
                Rule('/delete', self.delete_from_tray),
            )
        )

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

    # XXX deleting on GET 
    def clear_tray(self, env, obj_items):
        for obj, item in obj_items:
            if item is None:
                env.db.delete(obj)
        env.db.commit()

    def tray(self, env, data):
        #insure_is_xhr(env)
        env.models = env.models.admin
        env.version = 'admin'
        tray = env.db.query(self.Tray).get(data.tray)
        if tray is None:
            raise HTTPNotFound()
        objects = env.db.query(self.ObjectTray).filter_by(tray=tray).all()
        items = [expand_stream(env, obj) for obj in objects]
        if None in items:
            self.clear_tray(env, zip(objects, items))
        items = [item for item in items if item is not None]
        #changed.sort(key=lambda x: x.date_changed)
        return env.render_to_response('tray', dict(
            tray = tray,
            items = items,
            menu = env.current_location,
            title = tray.title,
        ))
