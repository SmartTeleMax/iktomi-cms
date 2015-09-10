# -*- coding: utf-8 -*-
from webob.exc import HTTPMethodNotAllowed
from iktomi.cms.item_lock import ModelLockError, ModelLockedByOther
from iktomi import web
from iktomi.web.shortcuts import Rule


class ItemLockView(object):

    @property
    def app(self):
        return web.method('POST') | web.cases(
            Rule('/_update_lock/<string:item_id>/<string:edit_session>',
                 self.update_lock),
            Rule('/_force_lock/<string:item_id>',
                 self.force_lock),
            Rule('/_release_lock/<string:item_id>/<string:edit_session>',
                 self.release_lock))

    @staticmethod
    def failure_lock_message(e):
        if isinstance(e, ModelLockedByOther):
            return {'status': 'fail',
                    'message': unicode(e),
                    'locked_session': e.edit_session}
        return {'status': 'fail',
                'message': unicode(e)}

    def update_lock(self, env, data):
        if env.request.method != "POST":
            raise HTTPMethodNotAllowed()
        try:
            env.item_lock.update(data.item_id, data.edit_session)
        except ModelLockError, e:
            return env.json(self.failure_lock_message(e))
        return env.json({'status':'updated'})

    def force_lock(self, env, data):
        if env.request.method != "POST":
            raise HTTPMethodNotAllowed()
        try:
            edit_session = env.item_lock.create(data.item_id, True)
        except ModelLockError, e:
            return env.json(self.failure_lock_message(e))

        return env.json({'status':'captured',
                        'edit_session': edit_session})

    def release_lock(self, env, data):
        if env.request.method != "POST":
            raise HTTPMethodNotAllowed()
        env.item_lock.remove(data.item_id, data.edit_session)
        return env.json({'status':'ok'})



