# -*- coding: utf-8 -*-
from cStringIO import StringIO
from jinja2 import Markup
from iktomi.forms.form import Form
from iktomi.forms.files import FileFieldSet, FileFieldSetConv
from iktomi.db.files import PersistentFile
from iktomi.db.sqla.files import FileAttribute
from iktomi.db.sqla.images import ImageProperty
from iktomi.unstable.utils.image_resizers import ResizeFit
from iktomi.utils import cached_property
from iktomi.cms.forms import convs, widgets
from PIL import Image


class AjaxFileField(FileFieldSet):

    widget = widgets.FieldSetWidget(template='widgets/ajax_fileinput')

    @property
    def upload_url(self):
        env = self.env
        # XXX looks like a hack
        if any(x for x in env.stream.actions if x.action=="file_upload"):
            return env.stream.url_for(env, 'file_upload',
                                      item=self.form.item.id,
                                      field_name=self.input_name)
        return env.root.load_tmp_file

    def __init__(self, *args, **kwargs):
        required = kwargs.pop('required', None)
        if required is not None:
            conv = kwargs.get('conv', self.conv)
            kwargs['conv'] = conv(required=required)
        FileFieldSet.__init__(self, *args, **kwargs)

    def set_raw_value(self, raw_data, value):
        FileFieldSet.set_raw_value(self, raw_data, value)
        # XXX hack!
        # XXX removing for_diff check breaks history logging, adding it breaks changed 
        #     fields indication. Workaround is needed
        if getattr(self.form, 'for_diff', False) and self.clean_value:
            raw_data[self.prefix+'path'] = self.clean_value.name

    def get_diff(field1, field2):
        path1 = field1.form.raw_data.get(field1.prefix+'path')
        path2 = field2.form.raw_data.get(field2.prefix+'path')
        if path1 != path2:
            return dict(label=field2.label,
                        name=field2.input_name,
                        before=lambda: path1,
                        after=lambda: path2,
                        changed=True)


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

    def set_raw_value(self, raw_data, value):
        AjaxFileField.set_raw_value(self, raw_data, value)
        # XXX hack!
        if getattr(self.form, 'for_diff', False) and \
                self.clean_value and \
                not self.conv.autocrop:
            resizer = ResizeFit()
            try:
                img = Image.open(self.clean_value.path)
            except IOError:
                pass
            else:
                img = resizer(img, (100, 100))
                img = img.convert('RGB')
                img_file = StringIO()
                img.save(img_file, format='jpeg')
                data = "data:image/jpeg;base64," + \
                        img_file.getvalue().encode('base64').replace('\n', '')
                raw_data[self.prefix+'image'] = data

    def get_diff(field1, field2):
        path1 = field1.form.raw_data.get(field1.prefix+'path')
        path2 = field2.form.raw_data.get(field2.prefix+'path')
        if path1 != path2:
            img1 = field1.form.raw_data.get(field1.prefix+'image')
            img2 = field2.form.raw_data.get(field2.prefix+'image')
            if img1 or img2:
                if img1:
                    before = lambda: Markup("<img src='{}'/>").format(img1)
                else:
                    before = lambda: ''
                if img2:
                    after = lambda: Markup("<img src='{}'/>").format(img2)
                else:
                    after = lambda: ''
                return dict(label=field2.label,
                            name=field2.input_name,
                            before=before,
                            after=after,
                            changed=True)
            elif not field1.conv.autocrop and not field2.conv.autocrop:
                return dict(label=field2.label,
                            name=field2.input_name,
                            before=lambda: path1,
                            after=lambda: path2,
                            changed=True)



