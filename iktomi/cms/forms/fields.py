# -*- coding: utf-8 -*-
from datetime import datetime, timedelta
from sqlalchemy import desc

from iktomi.forms.fields import *
from iktomi.cms.forms import convs, widgets
from iktomi.cms.publishing.model import WithState
from iktomi.forms import fields
from iktomi.unstable.forms.files import FileFieldSet


class AjaxFileField(FileFieldSet):

    widget = widgets.FieldSetWidget(template='widgets/ajax_fileinput')
    upload_endpoint = 'load_tmp_file'


class AjaxImageField(AjaxFileField):

    widget = widgets.FieldSetWidget(template='widgets/ajax_imageinput')
    #: used when file is uploaded
    thumb_size = None
    upload_endpoint = 'load_tmp_image'

    # Show the thumb or not. Works only with image option on
    show_thumbnail = True
    #: use js pre-upload thumbnail generation by canvas
    canvas_thumb_preview = False


def SplitDateTimeField(name, label, required=True,
                       get_initial=datetime.now,
                       template='widgets/fieldset-line'):
    return FieldSet(
        name,
        widget=widgets.FieldSetWidget(template=template),
        conv=convs.SplitDateTime(required=required),
        fields=[Field('date',
                      conv=convs.Date(required=required),
                      widget=widgets.Calendar),
                Field('time',
                      conv=convs.Time(required=required),
                      widget=widgets.TextInput(classname='timeinput'))],
        get_initial=get_initial,
        label=label)


class FieldBlock(fields.FieldBlock):

    widget = widgets.FieldBlockWidget


class DateFromTo(FieldSet):

    conv=convs.DateIntervalConv
    label=u'Дата'

    fields = [
        Field('since',
              conv=convs.Date(required=False),
              widget=widgets.Calendar,
              label=u'с'),
        Field('till',
              conv=convs.Date(required=False),
              widget=widgets.Calendar,
              label=u'по'),
    ]

    def filter_query(self, query, field, value):
        model = self.form.model
        if value['since'] is not None:
            query = query.filter(getattr(model, self.name)>=value['since'])
        if value['till'] is not None:
            next_day = value['till'] + timedelta(days=1)
            query = query.filter(getattr(model, self.name)<next_day)
        return query


_state_choices = ((WithState.PRIVATE, u'Скрытое'),
                  (WithState.PUBLIC, u'Опубликованное'))

def StateSelectField():
    return Field('state',
              conv=convs.EnumChoice(choices=_state_choices,
                                    conv=convs.Int()),
              widget=widgets.LabelSelect(render_type='full-width',
                                         null_label=u'Все'),
              )

def IdField(name='id', conv=convs.Int):
    return Field(name,
                 conv=convs.Int(required=False),
                 widget=widgets.TextInput(template="widgets/id_field",
                                          classname="small"),
                 label=u'Идентификатор',
                 )


class SortConverter(convs.EnumChoice):

    def to_python(self, value):
        value = convs.EnumChoice.to_python(self, value)
        value = value or self.field.get_initial()
        self.field.set_raw_value(self.field.form.raw_data,
                                 self.from_python(value))
        return value


class SortField(Field):

    conv = SortConverter
    widget = widgets.Select(classname='js-sort-field', render_type="hidden")
    # (db column, list_field name)
    choices = (('id', 'id'),)

    def __init__(self, *args, **kwargs):
        Field.__init__(self, *args, **kwargs)
        choices = sum([[(k, v), ('-'+k, '-'+v)]
                       for k, v in self.choices], [])
        self.conv = self.conv(choices=choices, required=True)

    def filter_query(self, query, field, value):
        is_desc = value.startswith('-')
        value = value.lstrip('-')
        method = getattr(self.form, 'order_by__' + value,
                         getattr(self, 'order_by__' + value,
                             self.order_by_default))
        return method(query, value, is_desc)

    def order_by_default(self, query, value, is_desc):
        if is_desc:
            value = desc(value)
        return query.order_by(value)


