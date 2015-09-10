# -*- coding: utf-8 -*-
from __future__ import absolute_import

import json
from iktomi.cms.item_lock.base import BaseItemLock, ModelLockError, ModelLockedByOther, \
        ModelLockIsLost, logger
from redis import WatchError

def loads(value):
    if value:
        return json.loads(value)


class RedisItemLock(BaseItemLock):

    def create(self, obj, force=False):
        '''Marks model object as editted. Returns edit session on success or
        raises exception. obj should be either model object or its global
        identifier. When force is True the current lock is ignored.'''
        cfg = self.env.cfg
        redis = self.env.redis

        edit_session = self._create_edit_session()
        key = self._item_lock_key(obj)
        value = self._item_lock_value(edit_session)
        if force:
            redis.set(key, json.dumps(value))
            redis.expire(key, cfg.MODEL_LOCK_TIMEOUT)
            return edit_session

        with redis.pipeline() as pipe:
            for i in range(2):
                try:
                    # put a WATCH on the key that holds our sequence value
                    pipe.watch(key)
                    # after WATCHing, the pipeline is put into immediate execution
                    # mode until we tell it to start buffering commands again.
                    # this allows us to get the current value of our sequence
                    old_value = loads(pipe.get(key))

                    if old_value is None:
                        # now we can put the pipeline back into buffered mode with MULTI
                        pipe.multi()
                        pipe.set(key, json.dumps(value))
                        pipe.expire(key, cfg.MODEL_LOCK_TIMEOUT)
                        # and finally, execute the pipeline (the set command)
                        pipe.execute()
                        # if a WatchError wasn't raised during execution, everything
                        # we just did happened atomically.
                        return edit_session
                    else:
                        lock_user = self.env.db.query(self.env.auth_model)\
                                                    .get(old_value['user_id'])
                        raise ModelLockedByOther(lock_user, old_value['edit_session'])
                except WatchError:
                    continue
        logger.error('Failed to lock model object. '\
                     'Problem with redis?')
        raise ModelLockError()


    def update(self, obj, edit_session):
        '''Updates model object lock as being active. Raises exception on
        error. obj should be either model object or its global identifier.'''
        cfg = self.env.cfg
        redis = self.env.redis
        key = self._item_lock_key(obj)

        with redis.pipeline() as pipe:
            for i in range(2):
                try:
                    # put a WATCH on the key that holds our sequence value
                    pipe.watch(key)
                    old_value = loads(pipe.get(key))

                    if old_value is None:
                        raise ModelLockIsLost()
                    elif old_value['edit_session']==edit_session:
                        # now we can put the pipeline back into buffered mode with MULTI
                        pipe.multi()
                        pipe.expire(key, cfg.MODEL_LOCK_TIMEOUT)
                        pipe.execute()
                        return edit_session
                    else:
                        lock_user = self.env.db.query(self.env.auth_model)\
                                                    .get(old_value['user_id'])
                        raise ModelLockedByOther(lock_user, old_value['edit_session'])
                except WatchError:
                    continue
        logger.error('Failed to update model object lock. '\
                     'Problem with redis?')
        raise ModelLockError()

    def remove(self, obj, edit_session):
        '''Removes lock for model object. obj should be either model object or
        its global identifier.'''
        redis = self.env.redis
        key = self._item_lock_key(obj)

        with redis.pipeline() as pipe:
            try:
                # put a WATCH on the key that holds our sequence value
                pipe.watch(key)
                old_value = loads(pipe.get(key))

                if old_value is not None and old_value['edit_session']==edit_session:
                    # now we can put the pipeline back into buffered mode with MULTI
                    pipe.multi()
                    pipe.delete(key)
                    pipe.execute()
                return
            except WatchError:
                logger.info('Collision on lock removal')

    def check(self, obj):
        redis = self.env.redis
        key = self._item_lock_key(obj)
        value = loads(redis.get(key))
        return value or None
