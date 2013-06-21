from iktomi.forms.convs import *


def DBUnique(model, message=u'An object with such value already exists'):

    @validator(message)
    def to_python(conv, value):
        if value not in ('', None):
            field = getattr(model, conv.field.name)
            # don't use env.db since we don't want to use public_condition
            query = Query(model, session=conv.env.db)
            item = query.filter(field==value).first()
            if item is not None and item != conv.field.form.item:
                return False
        return True
    return to_python
