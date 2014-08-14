from iktomi.cms.forms import Form
from webob.multidict import MultiDict


class FilterForm(Form):

    fields = []

    def filter_by_scalar(self, query, field, value):
        return query.filter(getattr(self.model, field.name)==value)

    def filter_by_true(self, query, field, value):
        if value:
            return self.filter_by_scalar(query, field, value)
        return query

    def filter_by_list(self, query, field, values):
        prop = getattr(self.model, field.name)
        for value in values:
            query = query.filter(prop.contains(value))
        return query

    def filter_by_default(self, query, field, value):
        if field.multiple:
            return self.filter_by_list(query, field, value)
        else:
            return self.filter_by_scalar(query, field, value)

    def filter(self, query):
        '''Modifies query'''
        # XXX will not work with FieldBlocks!
        for field in self.fields:
            filter_value = self.python_data[field.name]
            if filter_value or filter_value == 0:
                method = getattr(self, 'filter_by__%s' % field.name,
                                 getattr(field, 'filter_query',
                                         self.filter_by_default))
                query = method(query, field, filter_value)
        return query

    def defaults(self):
        return {}

    def get_mdict(self):
        data = self.get_data()
        return to_multidict(data)

    def __nonzero__(self):
        # We don't want to display form when there is no fields
        return bool(self.fields)

def to_scalar(value):
    if value in ('', None):
        return None
    if isinstance(value, basestring):
        return value
    elif type(value) in (int, float): # XXX
        return str(value)
    raise TypeError('Can not convert to json-like object {}'.format(value))

def to_multidict(value, key=''):
    md = MultiDict()
    prefix = key + '.' if key else ''
    if isinstance(value, list):
        for i, val in enumerate(value):
            md.extend(to_multidict(val, prefix + str(i)))
    elif isinstance(value, dict):
        for k, val in value.items():
            md.extend(to_multidict(val, prefix + k))
    else:
        val = to_scalar(value)
        if val is not None:
            md.add(key, val)
    return md



