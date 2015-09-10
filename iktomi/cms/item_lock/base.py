# -*- coding: utf-8 -*-

import os, logging
from time import time
import sqlalchemy.orm.util

logger = logging.getLogger('iktomi.cms.item_lock')


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


class BaseItemLock(object):

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
        raise NotImplementedError()

    def update(self, obj, edit_session):
        '''Updates model object lock as being active. Raises exception on
        error. obj should be either model object or its global identifier.'''
        raise NotImplementedError()

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
        raise NotImplementedError()

    def check(self, obj):
        raise NotImplementedError()


class ItemLockData(object):

    def __init__(self, env, stream, item, filter_form,
                 edit_session, owner_session, message):
        self.env, self.filter_form, self.stream, self.item = \
                env, filter_form, stream, item
        self.edit_session, self.owner_session, self.message = \
                edit_session, owner_session, message

    def render(self):
        env, stream = self.env, self.stream
        back_url = stream.lock_back_url(env, self.item, self.filter_form)
        global_id = BaseItemLock.item_global_id(self.item)
        tdata = dict(self.__dict__,
                     global_id=global_id,
                     lock_timeout=env.cfg.MODEL_LOCK_RENEW,
                     back_title = stream.lock_back_title,
                     back_help = stream.lock_back_help,
                     back_url = back_url)
        return env.render_to_string("macros/item_lock", tdata)

    @classmethod
    def for_item(cls, env, stream, item, filter_form=None):
        request = env.request
        edit_session = request.POST.get('edit_session',
                                        request.GET.get('edit_session', ''))
        owner_session = message = ''
        if item is not None and item.id is not None:
            try:
                edit_session = env.item_lock.update_or_create(
                    item, edit_session)
            except ModelLockedByOther, e:
                message = unicode(e)
                owner_session = e.edit_session
            except ModelLockError, e:
                message = unicode(e)
        return cls(env, stream, item, filter_form,
                   edit_session, owner_session, message)

