from iktomi.cms.forms import convs
import models # XXX

class ReplicatedModelConverter(object):

    @property
    def model(self):
        item_model = self.field.form.model
        module_name = item_model.__module__.split('.')[1]
        module = getattr(models, module_name)
        class_name = self._model.__name__
        return getattr(module, class_name)

    def _get_kwargs(self, **kwargs):
        if 'model' in kwargs:
            kwargs['_model'] = kwargs.pop('model')
        return kwargs


class ModelChoice(ReplicatedModelConverter, convs.ModelChoice):

    def __init__(self, *args, **kwargs):
        kwargs = self._get_kwargs(**kwargs)
        convs.ModelChoice.__init__(self, *args, **kwargs)


class ModelDictConv(ReplicatedModelConverter, convs.ModelDictConv):

    def __init__(self, *args, **kwargs):
        kwargs = self._get_kwargs(**kwargs)
        convs.ModelDictConv.__init__(self, *args, **kwargs)
