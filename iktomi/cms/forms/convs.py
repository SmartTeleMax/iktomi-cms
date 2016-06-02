# -*- coding: utf-8 -*-
from iktomi.forms.convs import *
from iktomi.forms.convs import __all__ as _all1
#_all1 = locals().keys()
from sqlalchemy.orm import Query
from iktomi.cms.publishing.model import WithState
from datetime import date
_all2 = locals().keys()


def DBUnique(model=None, message=u'An object with such value already exists'):
    '''
      Checks if an object with the same value does not exist in db,
      except the current object.

      Be careful with unique indexes in published models. They are not actually
      deleted from database on delete action, but their state is changed
      to DELETED. So they may exist in index, but be ignored by DBUnique, 
      and you will get an exception.
    '''

    @validator(message)
    def to_python(conv, value):
        model_ = model or conv.field.form.model
        if value not in ('', None):
            field = getattr(model_, conv.field.name)
            # XXX Using db.query() won't work properly with custom
            # auto-filtering query classes. But silently replacing the class is
            # not good too.
            query = Query(model_, session=conv.env.db)
            if issubclass(model_, WithState):
                states = WithState.PRIVATE, WithState.PUBLIC
                query = query.filter(model_.state.in_(states))
            item = query.filter(field==value).scalar()
            if item is not None and item != conv.field.form.item:
                return False
        return True
    return to_python


class DateIntervalConv(Converter):

    def to_python(self, value):
        if type(value['since']) is date \
                and type(value['till']) is date \
                and value['since'] > value['till']:
            raise ValidationError(
                        u'дата начала не может быть больше даты завершения')
        return value

# Expose all variables defined after imports and all variables imported from
# parent module
__all__ = [x for x
           in set(locals().keys()) - (set(_all2) - set(_all1))
           if not x.startswith('_')]
del _all1, _all2
