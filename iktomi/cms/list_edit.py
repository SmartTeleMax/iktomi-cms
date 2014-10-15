# -*- coding: utf-8 -*-

from iktomi import web
from iktomi.utils import cached_property
from iktomi.forms import Form, Field, FieldSet, FieldList
from iktomi.cms.forms import convs

from .stream_actions import StreamAction
from .item_lock import ModelLockedByOther, ModelLockError
from .flashmessages import flash
from webob.exc import HTTPForbidden


class ListItemModelChoice(convs.ModelChoice):

    @property
    def model(self):
        return self.env.stream.get_model(self.env)


class ListItemForm(Form):

    template = 'stream_sortables.html'

    def __init__(self, *args, **kwargs):
        kwargs['initial'] = self.initial_for_items(kwargs.pop('items', []))
        Form.__init__(self, *args, **kwargs)

    fields = [
            FieldList(
                'items',
                widget=FieldList.widget(
                    template='list_item_form'),
                field=FieldSet(
                    'item',
                    fields=[
                        Field('item',
                              conv=ListItemModelChoice(required=False),
                              label=u'item'),
                    ]
                ),
            ),
        ]

    def initial_for_item(self, item):
        return {'item': item}

    def initial_for_items(self, items):
        return {'items': [self.initial_for_item(item)
                          for item in items]}


class ListEditAction(StreamAction):

    action='list_edit'
    item_lock=True
    display = False
    for_item = False
    title=u'Редактировать'
    use_with_filters = False

    def save_allowed(self, env):
        return self.stream.has_permission(env, 'w')

    @cached_property
    def ListItemForm(self):
        return getattr(self.stream.config, 'ListItemForm', ListItemForm)

    def __call__(self, env, data):
        raise NotImplementedError

    @property
    def app(self):
        return web.method('POST') | web.match('/edit', 'list_edit') | self


