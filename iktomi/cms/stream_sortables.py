# -*- coding: utf-8 -*-
from webutils.forms import Form, Field, FieldSet, FieldList, FormJSRef, FormCSSRef, convs
from .stream_actions import StreamAction
from .stream_handlers import see_other
from .item_lock import ModelLockedByOther, ModelLockError
from .flashmessages import flash
from iktomi.utils import cached_property
from iktomi.forms.media import FormJSInline
from iktomi import web

BR = '\n'

def getListItemForm(Model):
    class ListItemForm(Form):
        fields = [
            FieldList(
                'items', 
                template='list_item_form',
                field=FieldSet(
                    'item', 
                    fields=[
                        Field('item', conv=convs.ModelChoice(model=Model, required=False),
                              label=u'item'
                              ),
                        Field('order',
                              conv=convs.Int(),
                              label=u'Порядок'),
                        ]
                    )
                )
            ]
        @classmethod
        def for_items(cls, env, items):
            initial = {'items': [{'item': item, 'order': item.order}
                                 for item in items]}
            return cls(env, initial=initial)

    return ListItemForm

#def getGroupedListItemForm(Model, init_js='stream_sortable_grouped_init.js'):
#    # FieldSet('group', ...) added to avoid custom stream row template
#    class GroupedListItemForm(Form):
#        media = Form.media + [
#            FormJSRef('stream_sortable.js'),
#            FormJSRef(init_js),
#            FormCSSRef('stream_sortable.css'),
#            ]
#    
#        fields = [
#            FieldList(
#                'groups',
#                field=FieldSet(
#                    'group',
#                    fields=[
#                        FieldList(
#                            'items', 
#                            field=FieldSet(
#                                'item', 
#                                fields=[
#                                    Field('item', conv=convs.ModelChoice(model=Model, required=False),
#                                          label=u'item'
#                                          ),
#                                    Field('order',
#                                          conv=convs.Int(),
#                                          label=u'order'),
#                                    ]
#                                )
#                            )
#                        ]
#                    )
#                )
#            ]
#    return GroupedListItemForm


class ListEditAction(StreamAction):

    action='list_edit'
    item_lock=True
    display = False
    for_item = False
    title=u'Редактировать'

    @cached_property
    def ListItemForm(self):
        return getattr(self.stream.config, 'ListItemForm')

    def __call__(self, env, data):
        list_item_form = self.ListItemForm(env)
        if list_item_form is not None:

            if list_item_form.accept(env.request.POST):
                modified_items = []
                lock_messages = []
                edit_sessions = {}
                for item in list_item_form.python_data['items']:
                    if item['item'].order != item['order']:
                        try:
                            edit_sessions[item['item']] = env.item_lock.create(item['item'])
                        except ModelLockedByOther, e:
                            lock_messages.append(unicode(e))
                        except ModelLockError, e:
                            lock_messages.append(unicode(e))

                        item['item'].order=item['order']   
                        modified_items.append(item['item'])

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
            else:
                flash(env,
                    u'Изменения не были сохранены из-за ошибок в форме:\n%s' %
                    '\n'.join(list_item_form.errors), 'failure')

        return see_other(env.url_for(self.stream.module_name))

    @property
    def app(self):
        return web.method('POST') | web.match('/edit', 'list_edit') | self


#class StreamGrouped(BaseStream):
#    #items must be order by group_by field
#    default_group = None
#    group_by = None
#
#    def prepare_data(self, request, **filter_params):
#        data = BaseStream.prepare_data(self, request, **filter_params)
#        paginator = data['paginator']
#        data['grouped_items'] = []
#        prev_group = self.default_group
#        for item in paginator.items:
#            if getattr(item, self.group_by) != prev_group:
#                data['grouped_items'].append([])
#                prev_group = getattr(item, self.group_by)
#
#            data['grouped_items'][-1].append(item)
#            
#        data['list_item_form_items'] = data['grouped_items']
#        return data
#
#    def getListItemFormInitial(self, items=[]):
#        return {'groups': [{'items': [{'item': item, 'order': item.order} for item in group_items ]}
#                for group_items in items]}
#
#    def list_edit(self, request):
#        list_item_form = self.getListItemForm(request)
#        if list_item_form is not None:
#            
#            if list_item_form.accept(request.form):
#                modified_items = []
#                lock_messages = []
#                edit_sessions = {}
#
#                for group in list_item_form.python_data['groups']:
#                    for item in group['items']:
#                        if item['item'].order != item['order']:
#                            try:
#                                edit_sessions[item['item']] = request.create_item_lock(item['item'])
#                            except ModelLockedByOther, e:
#                                lock_messages.append(unicode(e))
#                            except ModelLockError, e:
#                                lock_messages.append(unicode(e))
#
#                            item['item'].order=item['order']   
#                            modified_items.append(item['item'])
#
#                if len(lock_messages) > 0:
#                    request.db.rollback()
#                    request.flash(
#                        Markup(u'Изменения не были сохранены:<br/>%s') %
#                        BR.join(lock_messages),
#                        'failure')
#                elif len(modified_items) > 0:
#                    request.db.commit()
#                    request.flash(BR.join([u'Объект (%s) сохранен' % (item,) for item in modified_items]), 'success')
#                    [request.remove_item_lock(item, edit_session) for item, edit_session in edit_sessions.items()]
#
#            else:
#                request.flash(
#                    Markup(u'Изменения не были сохранены из-за ошибок в форме:<br/>%s') % 
#                    BR.join(list_item_form.errors), 'failure') 
#        return see_other(self.stream_url(request))
