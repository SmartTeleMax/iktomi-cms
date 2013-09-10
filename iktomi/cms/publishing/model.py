# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm.collections import collection_adapter
from sqlalchemy.orm.attributes import instance_state, instance_dict
from iktomi.unstable.db.sqla.files import FileProperty, FileEventHandlers
from iktomi.unstable.db.sqla.images import ImageProperty, ImageEventHandlers

from datetime import datetime


class WithState(object):

    ABSENT = 0
    PRIVATE = 1
    PUBLIC = 2
    DELETED = 3

    @declared_attr
    def state(self):
        return Column(Integer, nullable=True, default=self.ABSENT)

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


class AdminWithLanguage(object):

    _langs = ('ru', 'en')

    def _create_versions(self):
        # be careful! makes flush!
        db = object_session(self)
        modelname = self.__class__.__name__
        for lang in self._langs:
            if modelname.endswith(lang.title()):
                modelname = modelname[:-len(lang)]
                break

        # The first language is default. It is used as id autoincrement
        if self.models.lang != self._langs[0] and self.id is None:
            # XXX self.models is not an interface!
            ru = getattr(self.models, modelname + lang.title())()
            # Flush ru model first to get autoincrement id.
            # Do not flush english model yet, but return it to pending
            # state after the flush
            db.add(ru)
            db.expunge(self)
            db.flush()
            db.add(self)
            self.id = ru.id
        elif self.id is None:
            db.flush()

        for lang in self._langs:
            # create all en/ru admin/front versions
            if lang == self.models.lang:
                item = self
            else:
                model = getattr(self.models, modelname + lang.title())
                item = db.query(model).get(self.id)
                if item is None:
                    item = model(id=self.id)
                    db.add(item)

            if not item._front_item:
                # XXX it is better to do this automatically on before_insert or
                #     after_insert
                item._create_front_object()
            # flush changes for each language separately
            # to force queries in right order aloso on the front
            db.flush()

        if self.state is None or self.state == item.ABSENT:
            self.state = self.PRIVATE


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
from sqlalchemy.orm.properties import ColumnProperty, RelationshipProperty
from sqlalchemy import Boolean


def _reflect(source, model):
    db = object_session(source)
    ident = identity_key(instance=source)[1]
    assert ident is not None
    return db.query(model).get(ident)

def _replicate_attributes(source, target):
    '''Replicates common SA attributes from source to target'''
    target_manager = manager_of_class(type(target))
    for attr in manager_of_class(type(source)).attributes:
        if attr.key not in target_manager:
            # It's not common attribute
            continue
        target_attr = target_manager[attr.key]
        if isinstance(attr.property, ColumnProperty):
            assert isinstance(target_attr.property, ColumnProperty)
            setattr(target, attr.key, getattr(source, attr.key))
        elif isinstance(attr.property, RelationshipProperty):
            assert isinstance(target_attr.property, RelationshipProperty)
            target_attr_model = target_attr.property.argument
            value = getattr(source, attr.key)
            if attr.property.cascade.delete_orphan:
                # Private, replicate
                if attr.property.uselist:
                    adapter = collection_adapter(value)
                    if adapter:
                        # Convert any collection to flat iterable
                        value = adapter.adapt_like_to_iterable(value)
                    reflection = _replicate_filter(value, target_attr_model)
                    impl = instance_state(target).get_impl(attr.key)
                    # Set any collection value from flat list
                    impl._set_iterable(instance_state(target),
                                       instance_dict(target),
                                       reflection)
                else:
                    reflection = target_attr_model()
                    _replicate_attributes(value, reflection)
                    setattr(target, attr.key, reflection)
            elif attr.property.secondary is not None:
                # Many-to-many, reflect
                reflection = _reflect_filter(value, target_attr_model)
                setattr(target, attr.key, reflection)

def _replicate(source, model):
    '''Replicates an object to other model class and returns its reflection'''
    target = model()
    _replicate_attributes(source, target)
    db = object_session(source)
    return db.merge(target)

def _replicate_filter(sources, model):
    '''Replicates list of objects to other model class and returns their
    reflection'''
    targets = []
    for source in sources:
        assert filter(None, identity_key(instance=source))
        target = model()
        _replicate_attributes(source, target)
        targets.append(target)
    return targets

def _reflect_filter(sources, model):
    '''Returns reflection of list of objects to other model class'''
    targets = [_reflect(source, model) for source in sources]
    # Some objects may not be available in target DB (not published), so we
    # have to exclude None from the list.
    return [target for target in targets if target is not None]


class AdminFront(object):
    '''Model that is replicated (published) to front. You always have two
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

    def _create_versions(self):
        # be careful! makes flush!
        if not self._front_item:
            object_session(self).flush()
            # XXX it is better to do this automatically on before_insert or
            #     after_insert
            self._create_front_object()
        # the item is created, we set PRIVATE state as default
        if self.state is None or self.state == self.ABSENT:
            self.state = self.PRIVATE

    def _create_front_object(self):
        _replicate(self, self._front_model)

    def _copy_to_front(self):
        _replicate(self, self._front_model)

    def _copy_from_front(self):
        _replicate_attributes(self._front_item, self)

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
