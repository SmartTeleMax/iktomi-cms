from iktomi.unstable.forms.convs import *
from sqlalchemy.orm import Query


def DBUnique(model=None, message=u'An object with such value already exists'):

    @validator(message)
    def to_python(conv, value):
        model_ = model or conv.field.form.model
        if value not in ('', None):
            field = getattr(model_, conv.field.name)
            # XXX Using db.query() won't work properly with custom
            # auto-filtering query classes. But silently replacing the class is
            # not good too.
            query = Query(model_, session=conv.env.db)
            item = query.filter(field==value).scalar()
            if item is not None and item != conv.field.form.item:
                return False
        return True
    return to_python
