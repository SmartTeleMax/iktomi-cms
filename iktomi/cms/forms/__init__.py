from ...forms import Form


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
        for field in self.fields:
            # XXX Check permissions?
            method = getattr(self, 'update__' + field.name, self.update_default)
            method(obj, field.name, self.python_data[field.name])

    @classmethod
    def load_initial(cls, env, item, initial=None, **kwargs):
        initial = initial or {}
        if item.id is not None:
            for field in cls.fields:
                # XXX side-effect!
                initial[field.name] = getattr(item, field.name)
        return cls(env, initial, item=item, **kwargs)
