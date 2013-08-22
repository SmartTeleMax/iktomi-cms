# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.ext.hybrid import hybrid_property
from iktomi.unstable.db.sqla.files import FileProperty, FileEventHandlers
from iktomi.unstable.db.sqla.images import ImageProperty, ImageEventHandlers

from datetime import datetime


class WithState(object):

    NEW = 0
    PUBLIC = 1
    DELETED = 2
    UNPUBLISHED = 3

    @declared_attr
    def state(self):
        return Column(Integer, nullable=True, default=self.NEW)

    @declared_attr
    def created_dt(self):
        return Column(DateTime, nullable=False, default=datetime.now)

    @declared_attr
    def updated_dt(self):
        return Column(DateTime, nullable=False, default=datetime.now,
                      onupdate=datetime.now)

    @hybrid_property
    def public(self):
        return self.state==self.PUBLIC

from sqlalchemy.orm import object_session
from sqlalchemy.orm.util import identity_key
from iktomi.utils import cached_property, cached_class_property
from iktomi.cms.item_lock import ItemLock

class FrontReplicated(object):

    @cached_property
    def has_unpublished_changes(self):
        return self._admin_item.has_unpublished_changes

    @cached_class_property
    def _admin_model(cls):
        # XXX
        return getattr(AdminFront.admin, cls.__name__)

    @cached_property
    def _admin_item(self):
        db = object_session(self)
        assert db is not None
        ident = identity_key(instance=self)[1]
        assert ident is not None
        return db.query(self._admin_model).get(ident)

    @cached_property
    def _other_version(self):
        return self._admin_item

    @cached_property
    def item_global_id(self):
        return ItemLock.item_global_id(self._admin_item)

# ======================================================================

from sqlalchemy.orm.attributes import manager_of_class
from sqlalchemy.orm import ColumnProperty
from sqlalchemy import Boolean

def _reflect(source, model):
    db = object_session(source)
    ident = identity_key(instance=source)[1]
    assert ident is not None
    return db.query(model).get(ident)

def _replicate(source, model, condition=True):
    '''Update target model. Returns target object.
    Model can also be item to copy to.
    '''
    if isinstance(model, type):
        target = model()
    else:
        target = model

    for name in _get_column_names(source) & _get_column_names(target):
        setattr(target, name, getattr(source, name))
    db = object_session(source)
    return db.merge(target)

def _replicate_filter(obj, sources, model):
    '''Replicates list of objects to other model class and returns their
    reflection'''
    db = object_session(obj)
    targets = []
    for source in sources:
        assert filter(None, identity_key(instance=source))
        targets.append(_replicate(source, target))
    return targets

def _reflect_filter(sources, model):
    '''Returns reflection of list of objects to other model class'''
    targets = [_reflect(source, model) for source in sources]
    # Some objects may not be available in target DB (not published), so we
    # have to exclude None from the list.
    return [target for target in targets if target is not None]

def _replicate_relations(source, target, models,
                         replicatable, reflectable):
    for key, model_name in replicatable:
        model = getattr(models, model_name)
        value = getattr(source, key)
        reflection = _replicate_filter(source, value, model)
        setattr(target, key, reflection)
    for key, model_name in reflectable:
        model = getattr(models, model_name)
        value = getattr(source, key)
        reflection = _reflect_filter(value, model)
        setattr(target, key, reflection)

def _get_column_names(source):
    return set(a.key for a in manager_of_class(source.__class__).attributes
               if isinstance(a.property, ColumnProperty))


class AdminFront(object):
    '''Model that is replacated (published) to front. You always have two
    versions: current and published.
    Don't use it for secondary table models that are not replicated directly
    (use AdminModel instead).'''

    @cached_class_property
    def front(cls):
        # XXX
        from models import front
        return front

    @cached_class_property
    def admin(cls):
        # XXX cycled imports
        from models import admin
        return admin

    @cached_class_property
    def _front_model(cls):
        return getattr(AdminFront.front, cls.__name__)

    @cached_property
    def _front_item(self):
        db = object_session(self)
        assert db is not None
        ident = identity_key(instance=self)[1]
        assert ident is not None
        return db.query(self._front_model).get(ident)

    @cached_property
    def _other_version(self):
        return self._front_item

    def _create_front_object(self):
        _replicate(self, self._front_model)

    def _copy_to_front(self):
        target = _replicate(self, self._front_model)
        _replicate_relations(self, target, AdminFront.front,
                             getattr(self, 'replicatable_relations', []),
                             getattr(self, 'reflectable_relations', []))

    def _copy_from_front(self):
        source = self._front_item
        _replicate(source, self)
        _replicate_relations(source, self, AdminFront.admin,
                             getattr(self, 'replicatable_relations', []),
                             getattr(self, 'reflectable_relations', []))

    @declared_attr
    def has_unpublished_changes(self):
        '''Was the object updated after publishing? Does it differ from
        published version?'''
        return Column(Boolean, nullable=False, default=True, onupdate=True)

    def publish(self):
        '''Publish current version: copy to front and change auxiliary fields
        appropriately.'''
        self.has_unpublished_changes = False
        self._copy_to_front()

    def revert_to_published(self):
        '''Revert to published version (undo all changes after the object was
        last published).'''
        self._copy_from_front()
        self.has_unpublished_changes = False


# ======================================================================

def common_attrs(__locals, *attrs):
    def wrap(func):
        func(__locals, *attrs)
        return staticmethod(func)
    return wrap


class ReplicatedHandlersMixin(object):

    def _get_file_name_to_delete(self, target, changes):
        if changes and changes.deleted:
            old_name = changes.deleted[0]
            if old_name != getattr(target._other_version, self.prop.column.key):
                return old_name

class ReplicatedImageEventHandlers(ReplicatedHandlersMixin, ImageEventHandlers):
    pass

class ReplicatedFileEventHandlers(ReplicatedHandlersMixin, FileEventHandlers):
    pass


# XXX name of class in too long
class ReplicatedFileProperty(FileProperty):
    event_cls = ReplicatedFileEventHandlers


class ReplicatedImageProperty(ImageProperty):
    event_cls = ReplicatedImageEventHandlers
