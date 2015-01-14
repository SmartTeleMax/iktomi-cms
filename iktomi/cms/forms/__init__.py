# -*- coding: utf-8 -*-
import json
from collections import defaultdict
from time import time
import struct, os
from iktomi.utils import cached_property
from iktomi.forms.form_json import Form
from .fields import FieldBlock, DiffFieldSetMixIn

class Form(Form):

    @cached_property
    def id(self):
        '''Random ID for given form input'''
        # Time part is repeated in about 3 days period
        time_part = struct.pack('!d', time())[3:]
        return 'form'+(time_part+os.urandom(1)).encode('hex')

    def json_data(self):
        errors = _defaultdict()
        for key, err in self.errors.items():
            d = errors
            for part in key.split('.'):
                d = d[part]
            d['.'] = err

        # do not use raw_value to get actual transformed data
        data = self.get_data()

        return {'data': data,
                'errors': errors,
                'widgets': [x.widget.render() for x in self.fields]}

    def json(self):
        return json.dumps(self.json_data(), ensure_ascii=False)


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


def _defaultdict():
    return defaultdict(_defaultdict)

