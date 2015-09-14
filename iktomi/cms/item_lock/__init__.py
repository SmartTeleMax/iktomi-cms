# -*- coding: utf-8 -*-
'''Instrument for locking individual objects by one and only one editor in time'''

from iktomi.cms.item_lock.memcached import MemcachedItemLock as ItemLock # default
from iktomi.cms.item_lock.base import (ItemLockData, ModelLockError, \
        ModelLockedByOther, ModelLockIsLost, logger)
