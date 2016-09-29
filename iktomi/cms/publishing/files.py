# -*- coding: utf-8 -*-
from iktomi.db.sqla.files import FileProperty, FileEventHandlers
from iktomi.db.sqla.images import ImageProperty, ImageEventHandlers
from sqlalchemy.orm import object_session

from .model import _FrontReplicated, _WithState

# ======================================================================

class ReplicatedHandlersMixin(object):

    def _get_file_name_to_delete(self, target, changes):
        if changes and changes.deleted:
            old_name = changes.deleted[0]
            if old_name != getattr(target._other_version, self.prop.column.key):
                return old_name


class PublicatedHandlersMixin(object):

    def before_update(self, mapper, connection, target):
        super(PublicatedHandlersMixin, self)\
                                    .before_update(mapper, connection, target)
        self.update_symlinks(target)

    def update_symlinks(self, target):
        if isinstance(target, _FrontReplicated):
            if isinstance(target, _WithState):
                session = object_session(target)
                source = target._admin_item
                attr = getattr(type(target), self.prop.key)
                target_file = getattr(target, self.prop.key)
                source_file = getattr(source, self.prop.key)
                if target_file is not None:
                    file_manager = session.find_file_manager(target)
                    if target.public:
                        file_manager.create_symlink(source_file, target_file)
                    else:
                        file_manager.delete(target_file)


class ReplicatedImageEventHandlers(ReplicatedHandlersMixin, ImageEventHandlers):
    pass

class ReplicatedFileEventHandlers(ReplicatedHandlersMixin, FileEventHandlers):
    pass

class PublicatedFileEventHandlers(
    PublicatedHandlersMixin,
    ReplicatedHandlersMixin,
    FileEventHandlers
): pass

class PublicatedImageEventHandlers(
    PublicatedHandlersMixin,
    ReplicatedHandlersMixin,
    ImageEventHandlers
): pass



# XXX name of class in too long
class ReplicatedFileProperty(FileProperty):
    event_cls = ReplicatedFileEventHandlers


class ReplicatedImageProperty(ImageProperty):
    event_cls = ReplicatedImageEventHandlers


class PublicatedFileProperty(FileProperty):
    event_cls = PublicatedFileEventHandlers


class PublicatedImageProperty(ImageProperty):
    event_cls = PublicatedImageEventHandlers

