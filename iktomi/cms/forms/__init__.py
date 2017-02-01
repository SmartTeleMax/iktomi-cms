# -*- coding: utf-8 -*-
from webob.multidict import MultiDict
from time import time
import struct, os
from iktomi.utils import cached_property
from ...forms import Form as BaseForm
from .fields import FieldBlock, DiffFieldSetMixIn

class Form(BaseForm):

    help_category = 'ItemForm'

    @property
    def stream(self):
        if self.env and self.env.stream:
            return self.env.stream

    @cached_property
    def id(self):
        '''Random ID for given form input'''
        # Time part is repeated in about 3 days period
        time_part = struct.pack('!d', time())[3:]
        return 'form'+(time_part+os.urandom(1)).encode('hex')

    def get_help(self, fieldname):
        if self.env.stream:
            helpkey = "/".join(['streams',
                                self.env.stream.module_name,
                                self.help_category,
                                fieldname])
            return self.env.get_help(helpkey, self.help_category)


def _get_field_data(form, field):
    md = MultiDict()
    rv = field.from_python(form.python_data[field.name])
    field.set_raw_value(md, rv)
    return md


class ModelForm(Form, DiffFieldSetMixIn):

    # XXX It's a hack to support inheritance
    def __init__(self, env, initial={}, item=None, for_diff=False, **kwargs):
        #required to check unique field values
        self.item = item
        self.for_diff = for_diff
        Form.__init__(self, env, initial, **kwargs)

    def update_default(self, obj, name, value):
        setattr(obj, name, value)

    def update_pass(self, obj, name, value):
        pass

    def update_instance(self, obj):
        self._update_instance(obj, self.fields)

    def _update_instance(self, obj, fields):
        for field in fields:
            if field.writable:
                if isinstance(field, FieldBlock):
                    self._update_instance(obj, field.fields)
                else:
                    method = getattr(self, 'update__' + field.name, self.update_default)
                    method(obj, field.name, self.python_data[field.name])

    @classmethod
    def load_initial(cls, env, item, initial=None, **kwargs):
        if item.id is not None:
            initial = cls._load_initial(item, initial, cls.fields)
        return cls(env, initial, item=item, **kwargs)

    @classmethod
    def _load_initial(cls, item, initial, fields):
        initial = dict(initial or {})
        for field in fields:
            if isinstance(field, FieldBlock):
                initial.update(cls._load_initial(item, initial, field.fields))
            elif field.name:
                initial[field.name] = getattr(item, field.name)
        return initial
