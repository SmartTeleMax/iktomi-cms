# -*- coding: utf-8 -*-
from cStringIO import StringIO
from jinja2 import Markup
from iktomi.forms.form import Form
from iktomi.unstable.forms.files import FileFieldSet, FileFieldSetConv
from iktomi.unstable.forms.files_json import FileFieldSet
from iktomi.unstable.db.files import PersistentFile, TransientFile
from iktomi.unstable.db.sqla.files import FileAttribute
from iktomi.unstable.db.sqla.images import ImageProperty
from iktomi.unstable.utils.image_resizers import ResizeFit
from iktomi.utils import cached_property
from iktomi.cms.forms import convs, widgets
from PIL import Image


class AjaxFileField(FileFieldSet):

    widget = widgets.AjaxFileInput
    initial = {'mode':'empty', 
               'transient_name':None, 
               'original_name':None,
               'current_url': None}

    @property
    def upload_url(self):
        return self.env.root.load_tmp_file

    def __init__(self, *args, **kwargs):
        required = kwargs.pop('required', None)
        if required is not None:
            conv = kwargs.get('conv', self.conv)
            kwargs['conv'] = conv(required=required)
        FileFieldSet.__init__(self, *args, **kwargs)

    def get_data(self):
        data = {}

        for field in self.fields:
            data.update(field.get_data())
        # XXX we must return actual file state even in draft form
        file_field = self.form.get_field(self.input_name)
        if file_field:
            file_obj = file_field.clean_value
            if file_obj is not None:
                data['mode'] = 'existing'
                data['current_url'] = file_obj.url
                data['transient_name'] = None
                data['original_name'] = None
        return {self.name: data}


class ImageFieldSetConv(FileFieldSetConv):

    autocrop = False

    def to_python(self, value):
        if value["mode"] == "existing" and self.autocrop:
            source = self.field.form.get_field(self.field.fill_from)
            if not isinstance(source.clean_value, PersistentFile):
                value = dict(mode="empty")
        return FileFieldSetConv.to_python(self, value)


class AjaxImageField(AjaxFileField):

    widget = widgets.AjaxImageInput
    #: used when file is uploaded
    thumb_size = None
    model_field = None

    # Show the thumb or not. Works only with image option on
    show_thumbnail = True
    show_size = True
    #: use js pre-upload thumbnail generation by canvas
    #canvas_thumb_preview = False
    conv = ImageFieldSetConv()
    retina = False
    crop = True

    def __init__(self, *args, **kwargs):
        kwargs['_label'] = kwargs.pop('label', kwargs.get('_label'))
        AjaxFileField.__init__(self, *args, **kwargs)

    @property
    def upload_url(self):
        env = self.env
        # XXX looks like a hack
        if any(x for x in env.stream.actions if x.action=="image_upload"):
            return env.stream.url_for(env, 'image_upload',
                                      item=self.form.item.id,
                                      field_name=self.input_name)
        return env.root.load_tmp_file

    @property
    def crop_url(self):
        env = self.env
        # XXX looks like a hack
        if any(x for x in env.stream.actions if x.action=="image_upload"):
            return env.stream.url_for(env, 'image_upload.crop',
                                      item=self.form.item.id,
                                      field_name=self.input_name)

    @cached_property
    def name_parent(self):
        parent = self.parent
        while parent is not None:
            if isinstance(parent, Form) or getattr(parent, 'name', None):
                return parent
            parent = getattr(parent, 'parent', None)
        return None

    @cached_property
    def model(self):
        parent = self.name_parent
        if isinstance(parent, Form):
            if parent.item:
                return parent.item.__class__
            return parent.model
        elif isinstance(parent.conv, convs.ModelDictConv):
            if parent.clean_value is not None:
                return parent.clean_value.__class__
            return parent.conv.model
        else:
            return None

    @cached_property
    def model_field(self):
        if self.model is None:
            return None

        model_field = getattr(self.model, self.name)
        if isinstance(model_field, FileAttribute) and \
           isinstance(model_field.prop, ImageProperty):
            return model_field.prop

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
            if fill_from is not None:
                if '.' in self.input_name:
                    parent_name = self.input_name.rsplit('.', 1)[0]
                    fill_from = parent_name + '.' + fill_from

                if self.form.get_field(fill_from):
                    return fill_from

        return None

    def get_data(self):
        result = AjaxFileField.get_data(self)
        data = result[self.name]

        if self.fill_from:
            # XXX Hack to get original image source for cropping
            field = self.form.get_field(self.fill_from)
            original_data = field.get_data()[self.fill_from]
            if 'current_url' in original_data:
                data['source_url'] = original_data['current_url']
                data['source_mode'] = original_data['mode']
                data['source_transient'] = original_data['transient_name']
        data['upload_url'] = self.upload_url
        data['sizes'] = self.model_field.image_sizes

        return {self.name:data}
