# -*- coding: utf-8 -*-
# Common admin views
import logging

from webob.exc import HTTPMethodNotAllowed
from iktomi import web
from iktomi.cms.stream_handlers import insure_is_xhr
from .item_lock import ModelLockError

logger = logging.getLogger(__name__)


class IndexHandler(web.WebHandler):
    def __init__(self, dashboard):
        self.dashboard = dashboard

    def index(self, env, data):
        insure_is_xhr(env)

        def max_childs(menu):
            return reduce(max, [len(x.items) for x in menu.items], 1)

        return env.render_to_response('index', dict(
            title=u'Редакторский интерфейс сайта',
            menu='index',
            dashboard=self.dashboard(env),
            max_childs=max_childs,
        ))
    __call__ = index


def update_lock(env, data):
    if env.request.method != "POST":
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

