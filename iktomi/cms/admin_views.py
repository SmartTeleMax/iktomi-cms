# -*- coding: utf-8 -*-
# Common admin views
import logging

from webob.exc import HTTPForbidden, HTTPMethodNotAllowed
from iktomi import web
from insadmin.item_lock import ModelLockError
from insadmin.stream_views import Stream

logger = logging.getLogger(__name__)


class IndexHandler(web.WebHandler):
    def __init__(self, dashboard, streams):
        self.dashboard = dashboard
        self.streams = streams

    def __call__(self, env, data):
        if not env.request.is_xhr:
            return env.render_to_response('layout.html', {})

        dash = []
        for row in self.dashboard:
            _row = []
            for col in row:
                _col = [col[0]]
                for endpoint in col[1:]:
                    if isinstance(endpoint, basestring) and \
                            endpoint in self.streams:
                        s = self.streams[endpoint]
                        if issubclass(type(s), Stream):
                            if s.has_permission(env, 'x'):
                                _col.append(endpoint)
                        else:
                            _col.append(endpoint)
                    else:
                        if type(endpoint) is tuple:
                            add_pair = False
                            for e in endpoint:
                                if e in self.streams:
                                    s = self.streams[e]
                                    if issubclass(type(s), Stream):
                                        if s.has_permission(env, 'x'):
                                            add_pair = True
                            if add_pair:
                                _col.append(endpoint)
                        else:
                            _col.append(endpoint)
                if len(_col) > 1:
                    _row.append(_col)
            if _row:
                dash.append(_row)
        html = env.render_to_string('index', dict(
            title=u'Редакторский интерфейс сайта',
            menu='index',
            flashmessages=[], # XXX
            dashboard=dash,
            get_stream_title=self.get_stream_title,
        ))
        return env.json({
            'html': html,
            'flashmessages': [], # XXX
        })

    def get_stream_title(self, name):
        return self.streams[name].title


def check_role(*roles):
    def decorate(func):
        def wrap(request, *args, **kwargs):
            if 'wheel' in request.user.roles:
                return func(request, *args, **kwargs)
            for role in roles:
                if role in request.user.roles:
                    return func(request, *args, **kwargs)
            raise HTTPForbidden
        return wrap
    return decorate


def update_lock(env, data):
    if env.request.method != "POST": # XXX to app.py
        raise HTTPMethodNotAllowed()
    try:
        env.item_lock.update(data.item_id, data.edit_session)
    except ModelLockError, e:
        return env.json({'status': 'fail', 'message': unicode(e)})
    return env.json({'status':'updated'})

def force_lock(env, data):
    if env.request.method != "POST":
        raise HTTPMethodNotAllowed()
    try:
        edit_session = env.item_lock.create(data.item_id, True)
    except ModelLockError, e:
        return env.json({'status': 'fail', 'message': unicode(e)})

    return env.json({'status':'captured',
                    'edit_session': edit_session,
                    'update_lock_url': env.url_for('update_lock', item_id=data.item_id,
                                                   edit_session=edit_session),
                    'release_lock_url': env.url_for('release_lock', item_id=data.item_id,
                                                    edit_session=edit_session),
                    })

def release_lock(env, data):
    if env.request.method != "POST":
        raise HTTPMethodNotAllowed()
    env.item_lock.remove(data.item_id, data.edit_session)
    return env.json({'status':'ok'})

