# -*- coding: utf-8 -*-
from iktomi.forms.fields import *
from iktomi.forms.fields import __all__ as _all1
from iktomi.forms.form import Form

from datetime import datetime, timedelta
from sqlalchemy import desc
from sqlalchemy.orm.util import identity_key
from sqlalchemy.orm.exc import UnmappedInstanceError

from iktomi.cms.forms import convs, widgets
from iktomi.cms.publishing.model import WithState
from iktomi.cms.edit_log.models import _get_field_data, make_diff
from iktomi.forms import fields
_all2 = locals().keys()

# place this after _all2 to add them to __all__
from .files import AjaxImageField, AjaxFileField

def optional_unicode(value):
    return unicode(value) if hasattr(value, '__unicode__') else ''

class DiffFieldSetMixIn(object):

    def get_diff(form1, form2):
        # diff for edit log
        fields = sum([x.field_names for x in form1.fields], [])
        diffs = []
        for field_name in fields:
            if not field_name:
                continue
            field1 = form1.get_field(field_name)
            field2 = form2.get_field(field_name)
            if field2.widget.render_type == "hidden":
                continue
            if hasattr(field1, 'get_diff'):
                child_diff = field1.get_diff(field2)
                if child_diff is not None:
                    diffs.append(child_diff)
            elif hasattr(field1.widget, 'get_diff'):
                child_diff = field1.widget.get_diff(field1, field2)
                if child_diff is not None:
                    diffs.append(child_diff)
            else:
                data1 = _get_field_data(form1, field1)
                data2 = _get_field_data(form2, field2)
                if data1 != data2:
                    diff = make_diff(field1, field2,
                                     changed=True)
                    diffs.append(diff)
        if diffs:
            if isinstance(form1, Form):
                label = name = ''
                before = lambda: optional_unicode(form1.item)
                after = lambda: optional_unicode(form2.item)
            else:
                label = form1.label or form1.name
                name = form1.input_name
                before = lambda: optional_unicode(form1.clean_value)
                after = lambda: optional_unicode(form2.clean_value)
            return dict(label=label or '',
                        name=name or '',
                        before=before,
                        after=after,
                        children=diffs,
                        changed=True)


class FieldSet(FieldSet, DiffFieldSetMixIn):
    pass


class FieldBlock(FieldBlock, DiffFieldSetMixIn):
    pass


class FieldList(FieldList):

    @staticmethod
    def _is_pair(field1, field2):
        if field1.conv.__class__ == field2.conv.__class__:
            if isinstance(field1.conv, convs.ModelDictConv):
                try:
                    ident1 = identity_key(instance=field1.clean_value)[1]
                    ident2 = identity_key(instance=field2.clean_value)[1]
                    return ident1 == ident2
                except UnmappedInstanceError:
                    pass
            # XXX how to implement indication in this case?
            return True
        return False

    def get_diff(fieldlist1, fieldlist2):
        reordered = False
        fields1 = []
        fields2 = []
        for index in fieldlist1.form.raw_data.getall(fieldlist1.indices_input_name):
            fields1.append(fieldlist1.field(name=index))
        for index in fieldlist2.form.raw_data.getall(fieldlist2.indices_input_name):
            fields2.append(fieldlist2.field(name=index))

        diffs = []
        while fields1:
            field2 = None
            field1 = fields1.pop(0)
            if fields2 and fieldlist1._is_pair(field1, fields2[0]):
                field2 = fields2.pop(0)

            if field1.widget.render_type == "hidden":
                continue
            if field2 is not None:
                if hasattr(field1, 'get_diff'):
                    diff = field1.get_diff(field2)
                    if diff is not None:
                        diffs.append(diff)
                elif hasattr(field1.widget, 'get_diff'):
                    diff = field1.widget.get_diff(field1, field2)
                    if diff is not None:
                        diffs.append(diff)
                else:
                    data1 = _get_field_data(fieldlist1, field1)
                    data2 = _get_field_data(fieldlist2, field2)
                    if data1 != data2:
                        diff = make_diff(field1, field2,
                                        changed=True)
                        diffs.append(diff)
            else:
                diff = make_diff(field1, None,
                                 changed=False)
                diffs.append(diff)
                reordered = True

        while fields2:
            field2 = fields2.pop(0)
            diff = make_diff(None, field2,
                            changed=True)
            diffs.append(diff)

        if not reordered:
            diffs = [x for x in diffs if x['changed'] or x]
        if diffs:
            return dict(label=fieldlist1.label or '',
                        name=fieldlist1.input_name,
                        before=lambda: '',
                        after=lambda: '',
                        children=diffs,
                        changed=True)


def SplitDateTimeField(name, label, required=True,
                       get_initial=datetime.now,
                       template='widgets/fieldset-line'):
    return FieldSet(
        name,
        widget=widgets.FieldSetWidget(js_block='datetime',
                                      template=template),
        conv=convs.SplitDateTime(required=required),
        fields=[Field('date',
                      conv=convs.Date(required=required),
                      widget=widgets.Calendar(js_block='calendar-simple')),
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


class SortWidget(widgets.Select):

    classname='js-sort-field'
    render_type="hidden"

    def get_options(self, value):
        options = widgets.Select.get_options(self, value)
        if not value:
            initial_value = self.field.conv.from_python(
                    self.field.get_initial())
            for option in options:
                option['selected'] = option['value'] == initial_value
        return options


class SortField(Field):

    conv = SortConverter()
    widget = SortWidget()
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
        value = getattr(self.form.model, value)
        if is_desc:
            value = desc(value)
        return query.order_by(value)

    def set_raw_value(self, raw_data, value):
        if value == self.conv.from_python(self.get_initial()):
            raw_data[self.input_name] = ''
        else:
            raw_data[self.input_name] = value


object_ref_fields = [
    Field('stream_name',
          conv=convs.Char(convs.length(0, 100), required=True)),
    Field('object_id',
          conv=convs.Char(convs.length(0, 100), required=True)),
]


# Expose all variables defined after imports and all variables imported from
# parent module
__all__ = [x for x
           in set(locals().keys()) - (set(_all2) - set(_all1))
           if not x.startswith('_')]
del _all1, _all2
