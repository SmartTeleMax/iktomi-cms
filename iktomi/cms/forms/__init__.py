from ...forms import Form
from .fields import FieldBlock


class ModelForm(Form):

    # XXX It's a hack to support inheritance
    def __init__(self, env, initial={}, item=None, **kwargs):
        #required to check unique field values
        self.item = item
        Form.__init__(self, env, initial, **kwargs)

    def update_default(self, obj, name, value):
        setattr(obj, name, value)

    def update_pass(self, obj, name, value):
        pass

    def update_instance(self, obj):
        self._update_instance(obj, self.fields)

    def _update_instance(self, obj, fields):
        for field in fields:
            if isinstance(field, FieldBlock):
                self._update_instance(obj, field.fields)
            else:
                # XXX Check permissions?
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
            else:
                initial[field.name] = getattr(item, field.name)
        return initial
