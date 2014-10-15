# -*- coding: utf-8 -*-
from iktomi.forms import Field, FieldSet, FieldList
from iktomi.cms.forms import convs
from iktomi.cms.list_edit import ListItemForm as BaseListItemForm, \
        ListEditAction as BaseListEditAction, ListItemModelChoice

from .item_lock import ModelLockedByOther, ModelLockError
from .flashmessages import flash
from webob.exc import HTTPForbidden


class ListItemForm(BaseListItemForm):

    ordering_field = 'order'
    template = 'stream_sortables.html'

    def __init__(self, *args, **kwargs):
        self.ordering_field = kwargs.pop('ordering_field', self.ordering_field)
        BaseListItemForm.__init__(self, *args, **kwargs)

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
                        Field("order",
                              conv=convs.Int(),
                              label=u'Порядок'),
                    ]
                ),
            ),
        ]

    def initial_for_item(self, item):
        return {"item": item,
                "order": getattr(item, self.ordering_field)}


class ListEditAction(BaseListEditAction):

    def set_order(self, item, ordering_field, position):
        setattr(item, ordering_field, position)

    def list_edit(self, env, data):
        if not self.save_allowed(env):
            raise HTTPForbidden()

        list_item_form = self.ListItemForm(env)
        ordering_field = list_item_form.ordering_field
        if list_item_form is not None:

            if list_item_form.accept(env.request.POST):
                modified_items = []
                lock_messages = []
                edit_sessions = {}
                for value in list_item_form.python_data['items']:
                    item = value['item']
                    if getattr(item, ordering_field) != value["order"]:
                        try:
                            edit_sessions[item] = env.item_lock.create(item)
                        except ModelLockedByOther, e:
                            lock_messages.append(unicode(e))
                        except ModelLockError, e:
                            lock_messages.append(unicode(e))
                        self.set_order(item, ordering_field, value['order'])
                        modified_items.append(item)

                if len(lock_messages) > 0:
                    env.db.rollback()
                    flash(env, u'Изменения не были сохранены:\n%s' % 
                               '\n'.join(lock_messages),
                        'failure')
                elif len(modified_items) > 0:
                    env.db.commit()
                    flash(env,
                          '\n'.join([u'Объект (%s) сохранен' % (item,)
                                     for item in modified_items]),
                          'success')
                    [env.item_lock.remove(item, data.edit_session)
                     for item, data.edit_session in edit_sessions.items()]
                return env.json({'success': True })
            else:
                flash(env,
                    u'Изменения не были сохранены из-за ошибок в форме:\n%s' %
                    '\n'.join(list_item_form.errors), 'failure')

        return env.json({'success': False})
    __call__ = list_edit

