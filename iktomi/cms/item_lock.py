# -*- coding: utf-8 -*-

import os, logging
from time import time
import sqlalchemy.orm.util

logger = logging.getLogger(__name__)


class ModelLockError(Exception):

    def __str__(self):
        return u'Возникли проблемы с блокировкой объекта'


class ModelLockedByOther(ModelLockError):

    def __init__(self, user, edit_session):
        ModelLockError.__init__(self, user)
        self.user = user
        self.edit_session = edit_session

    def __str__(self):
        return u'Объект заблокирован пользователем: %s (%s)' % \
                                (self.user.name, self.user.login)


class ModelLockIsLost(ModelLockError):

    def __str__(self):
        return u'Блокировка объекта утеряна'


class ItemLock(object):

    _lock_prefix = 'lock-'

    def __init__(self, env):
        self.env = env

    def _create_edit_session(self):
        return os.urandom(5).encode('hex')

    @staticmethod
    def item_global_id(obj, view_in_obj=True):
        # XXX this look to the item is hacky
        if hasattr(obj, 'item_global_id') and view_in_obj:
            return obj.item_global_id()
        cls, ident = sqlalchemy.orm.util.identity_key(instance=obj)
        ident = '-'.join(map(str, ident))
        return '%s.%s:%s' % (cls.__module__, cls.__name__, ident)

    def _item_lock_key(self, obj):
        '''Construct key for memcache. obj should be either model object or its
        global identifier.'''
        if not isinstance(obj, basestring):
            obj = self.item_global_id(obj)
        return self._lock_prefix + str(obj)

    def _item_lock_value(self, edit_session):
        # edit_session - unique identifier of one open window
        # user_id - to show who locked the object
        # time - we need it since memcache doesn't guarantee it will prune a
        #        record imediately after timeout.
        return dict(edit_session=edit_session,
                    user_id=self.env.user.id,
                    time=time())

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
            old_value = cfg.CACHE.gets(key)
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

    def update_or_create(self, obj, edit_session):
        '''Updates item lock if edit_session is empty, otherwise creates a new
        lock. Returns edit_session if success or raises exception if failed'''
        if edit_session:
            self.update(obj, edit_session)
            return edit_session
        else:
            return self.create(obj)

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


def prepare_lock_data(env, data, item):
    request = env.request
    data.edit_session = request.POST.get('edit_session',
                                         request.GET.get('edit_session',
                                                         ''))
    data.owner_session = data.lock_message = ''
    if item is not None and item.id is not None:
        try:
            data.edit_session = env.item_lock.update_or_create(
                item, data.edit_session)
        except ModelLockedByOther, e:
            data.lock_message = unicode(e)
            data.owner_session = e.edit_session
        except ModelLockError, e:
            data.lock_message = unicode(e)

def lock_template_data(env, data, item):
    d = dict(item_lock=True,
             lock_timeout=env.cfg.MODEL_LOCK_RENEW)
    if item is not None and item.id is not None:
        return dict(d,
                    item_global_id=ItemLock.item_global_id(item),
                    lock_message=data.lock_message,
                    edit_session=data.edit_session or data.owner_session)
    return d
