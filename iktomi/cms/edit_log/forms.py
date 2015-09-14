# -*- coding: utf-8 -*-
from iktomi.cms.stream import FilterForm
from iktomi.cms.forms import convs, widgets
from iktomi.cms.forms.fields import Field, DateFromTo, SortField


#def all_by_default(conv, value):
#    if not value:
#        return [k for k, v in conv.conv.choices]
#    return value


class EditLogItemFilterForm(FilterForm):

    def __init__(self, *args, **kwargs):
        # XXX hack! do not do in this way. Use class_factory
        streams = kwargs.pop('streams', None)
        types = kwargs.pop('types')
        models = kwargs.pop('models')
        env = args[0]
        fields = []
        for field in self.fields:
            field = field()
            if field.name == 'users':
                AdminUser = env.auth_model
                field = field(conv=convs.ModelChoice(model=AdminUser,
                                                     title_field="login"))
            if field.name == 'streams':
                field = field(conv=convs.ListOf(
                            convs.EnumChoice(choices=streams),
                            #all_by_default
                            ))
            if field.name == 'type':
                field = field(conv=convs.EnumChoice(choices=types))
            fields.append(field)
        self.fields = fields
        FilterForm.__init__(self, *args, **kwargs)

    fields = [
        Field('object_id',
              label=u"ID",
              widget=widgets.TextInput(classname="small")),
        Field('type',
              label=u'Тип',
              #conv=convs.EnumChoice(),
              widget=widgets.PopupFilteredSelect()),
        Field('users',
              label=u'Пользователь',
              #conv=convs.ModelChoice(model=models.AdminUser),
              widget=widgets.PopupFilteredSelect()),
        DateFromTo('creation_time'),
        SortField('sort',
                  choices=(('id', 'id'),
                           ('type', 'type'),
                           ('title', 'title'),
                           ('date', 'date')),
                  initial='-id'),
    ]

    def filter_by__streams(self, query, field, value):
        EditLog = self.model
        cond = EditLog.stream_name.in_(value)
        for stream_name in value:
            cond |= EditLog.stream_name.startswith(stream_name + ':')
        return query.filter(cond)

    def filter_by__users(self, query, field, value):
        return query.filter(self.model.users.contains(value))


class EditLogFilterForm(EditLogItemFilterForm):

    fields = [
        Field('streams',
              label=u'Потоки',
              #conv=convs.ListOf(convs.EnumChoice()),
              widget=widgets.PopupFilteredSelect())
    ] + EditLogItemFilterForm.fields


