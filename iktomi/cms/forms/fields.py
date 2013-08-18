from datetime import datetime

from iktomi.forms.fields import *
from iktomi.cms.forms import convs, widgets
from iktomi.forms import fields
from iktomi.unstable.forms.files import FileFieldSet


class AjaxFileField(FileFieldSet):

    template = 'widgets/ajax_fileinput'
    upload_endpoint = 'load_tmp_file'


class AjaxImageField(AjaxFileField):

    template = 'widgets/ajax_imageinput'
    #: used when file is uploaded
    thumb_size = None
    upload_endpoint = 'load_tmp_image'

    # Show the thumb or not. Works only with image option on
    show_thumbnail = True
    #: use js pre-upload thumbnail generation by canvas
    canvas_thumb_preview = False


def SplitDateTimeField(name, label, required=True,
                       get_initial=datetime.now,
                       template='fields/fieldset-line'):
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
