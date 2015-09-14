# -*- coding: utf-8 -*-
from time import time
from iktomi.cms.item_lock.base import (BaseItemLock, ModelLockError, \
        ModelLockedByOther, ModelLockIsLost, logger)


class MemcachedItemLock(BaseItemLock):

    def create(self, obj, force=False):
        '''Marks model object as editted. Returns edit session on success or
        raises exception. obj should be either model object or its global
        identifier. When force is True the current lock is ignored.'''
        cfg = self.env.cfg
        cache = self.env.cache

        cache.cas_ids.clear()
        edit_session = self._create_edit_session()
        key = self._item_lock_key(obj)
        value = self._item_lock_value(edit_session)
        if force:
            if cache.set(key, value, time=cfg.MODEL_LOCK_TIMEOUT):
                return edit_session
            else:
                raise ModelLockError()
        for i in range(3):
            if cache.add(key, value, time=cfg.MODEL_LOCK_TIMEOUT):
                return edit_session
            old_value = cache.gets(key)
            if old_value is None:
                # Should try add() again
                continue
            if not old_value or \
                    time()-old_value['time']>cfg.MODEL_LOCK_TIMEOUT:
                # Somebody's lock is already expired
                if cache.cas(key, value,
                             time=cfg.MODEL_LOCK_TIMEOUT):
                    return edit_session
                else:
                    continue
            # Somebody holds active lock, no farther attempts
            break
        else:
            logger.error('Failed to lock model object. '\
                         'Problem with memcached?')
            raise ModelLockError()
        lock_user = self.env.db.query(self.env.auth_model)\
                                    .get(old_value['user_id'])
        raise ModelLockedByOther(lock_user, old_value['edit_session'])

    def update(self, obj, edit_session):
        '''Updates model object lock as being active. Raises exception on
        error. obj should be either model object or its global identifier.'''
        cfg = self.env.cfg
        cache = self.env.cache

        cache.cas_ids.clear()
        key = self._item_lock_key(obj)
        for i in range(3):
            old_value = cache.gets(key)
            if not old_value:
                raise ModelLockIsLost()
            elif old_value['edit_session']!=edit_session:
                lock_user = self.env.db.query(self.env.auth_model)\
                                            .get(old_value['user_id'])
                raise ModelLockedByOther(lock_user, old_value['edit_session'])
            new_value = self._item_lock_value(edit_session)
            if cache.cas(key, new_value,
                         time=cfg.MODEL_LOCK_TIMEOUT):
                return
        else:
            # No runtime error here since we want to give user a chance to
            # restore lock.
            raise ModelLockIsLost()

    def remove(self, obj, edit_session):
        '''Removes lock for model object. obj should be either model object or
        its global identifier.'''
        cache = self.env.cache

        cache.cas_ids.clear()
        key = self._item_lock_key(obj)
        # We can't garuantee memcache's delete method will remove only our
        # lock, so we update the record with empty value and minimal (1 sec)
        # timeout.
        old_value = cache.gets(key)
        # It's too late to do something in case of error, so we just ignore
        # returned value.
        if old_value and old_value['edit_session']==edit_session:
            cache.cas(key, '', time=1)

    def check(self, obj):
        cache = self.env.cache
        key = self._item_lock_key(obj)
        value = cache.get(key)
        return value or None

