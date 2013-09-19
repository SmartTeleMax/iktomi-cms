# -*- coding: utf-8 -*-
from iktomi.unstable.db.sqla.files import FileProperty, FileEventHandlers
from iktomi.unstable.db.sqla.images import ImageProperty, ImageEventHandlers

# ======================================================================

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
