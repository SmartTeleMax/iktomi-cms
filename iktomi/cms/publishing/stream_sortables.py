# -*- coding: utf-8 -*-

from iktomi.utils import cached_property
from iktomi.cms.stream_sortables import ListEditAction, ListItemForm


class PublishSortForm(ListItemForm):

    template = 'publish_stream_sortables.html'


class PublishSortAction(ListEditAction):

    def save_allowed(self, env):
        return self.stream.has_permission(env, 'w') and \
                self.stream.has_permission(env, 'p')

    @cached_property
    def ListItemForm(self):
        return getattr(self.stream.config, 'ListItemForm', PublishSortForm)

    def set_order(self, item, ordering_field, position):
        setattr(item, ordering_field, position)
        setattr(item._item_version('front'), ordering_field, position)

