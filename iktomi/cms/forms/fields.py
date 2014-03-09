# -*- coding: utf-8 -*-
from iktomi.forms.fields import *
from iktomi.forms.fields import __all__ as _all1

from datetime import datetime, timedelta
from sqlalchemy import desc

from iktomi.cms.forms import convs, widgets
from iktomi.cms.publishing.model import WithState
from iktomi.forms import fields
from iktomi.forms.form import Form
from iktomi.unstable.forms.files import FileFieldSet, FileFieldSetConv
from iktomi.unstable.db.files import PersistentFile
from iktomi.unstable.db.sqla.files import FileAttribute
from iktomi.unstable.db.sqla.images import ImageProperty
from iktomi.utils import cached_property
_all2 = locals().keys()


class AjaxFileField(FileFieldSet):

    widget = widgets.FieldSetWidget(template='widgets/ajax_fileinput')
    upload_endpoint = 'load_tmp_file'

    def __init__(self, *args, **kwargs):
        required = kwargs.pop('required', None)
        if required is not None:
            conv = kwargs.get('conv', self.conv)
            kwargs['conv'] = conv(required=required)
        FileFieldSet.__init__(self, *args, **kwargs)


class ImageFieldSetConv(FileFieldSetConv):

    autocrop = False

    def to_python(self, value):
        if value["mode"] == "existing" and self.autocrop:
            source = self.field.form.get_field(self.field.fill_from)
            if not isinstance(source.clean_value, PersistentFile):
                value = dict(mode="empty")
        return FileFieldSetConv.to_python(self, value)


class AjaxImageField(AjaxFileField):

    widget = widgets.FieldSetWidget(template='widgets/ajax_imageinput')
    #: used when file is uploaded
    thumb_size = None
    model_field = None
    upload_endpoint = 'load_tmp_image'

    # Show the thumb or not. Works only with image option on
    show_thumbnail = True
    show_size = True
    #: use js pre-upload thumbnail generation by canvas
    canvas_thumb_preview = False
    conv = ImageFieldSetConv()
    retina = False
    crop = True

    def __init__(self, *args, **kwargs):
        kwargs['_label'] = kwargs.pop('label', kwargs.get('_label'))
        AjaxFileField.__init__(self, *args, **kwargs)

    @cached_property
    def model_field(self):
        model = None
        parent = self.parent
        while parent is not None:
            if isinstance(parent, Form):
                model = parent.model
                break
            elif isinstance(parent.conv, convs.ModelDictConv):
                model = parent.conv.model
                break
            elif getattr(parent, 'name', None):
                break
            parent = getattr(parent, 'parent', None)

        if model is not None:
            model_field = getattr(model, self.name)
            if isinstance(model_field, FileAttribute) and \
               isinstance(model_field.prop, ImageProperty):
                return model_field.prop
        return None

    @cached_property
    def size(self):
        if self.model_field is not None:
            return self.model_field.image_sizes

    @cached_property
    def thumb_size(self):
        if self.retina and self.size is not None:
            w, h = self.size
            return w/2, h/2
        return self.size

    @cached_property
    def label(self):
        if self.size is not None and self._label and self.show_size:
            return self._label + u' ({}×{})'.format(*self.size)
        return self._label

    @cached_property
    def fill_from(self):
        if self.model_field is not None:
            fill_from = self.model_field.fill_from
            if '.' in self.input_name:
                parent_name = self.input_name.rsplit('.', 1)[0]
                fill_from = parent_name + '.' + fill_from

            if self.form.get_field(fill_from):
                return fill_from

        return None




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

    # this does not work well, but default sort value is redundant in raw_data
    # and accordingly in query string. We need other way to do that.
    #def from_python(self, value):
    #    value = convs.EnumChoice.from_python(self, value)
    #    if value == self.field.get_initial():
    #        return ''
    #    return value


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
        value = getattr(self.form.model, value)
        if is_desc:
            value = desc(value)
        return query.order_by(value)



class EditorNoteField(Field):

    permissions = 'r'
    widget = widgets.Widget(template="widgets/editor_notes")

    def get_data(self):
        item = self.form.item
        if item is None or item.id is None:
            return []
        EditorNote = self.model
        env = self.env
        return EditorNote.get_for_item(env.db, env.stream.uid(env, version=False), item)

    @property
    def submit_url(self):
        return self.env.url_for('post_note')


# Expose all variables defined after imports and all variables imported from
# parent module
__all__ = [x for x
           in set(locals().keys()) - (set(_all2) - set(_all1))
           if not x.startswith('_')]
del _all1, _all2
