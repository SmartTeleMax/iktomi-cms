# -*- coding: utf-8 -*-
from sqlalchemy import Column, ForeignKey, Integer, PickleType, DateTime, \
        Index, String
from sqlalchemy.dialects.mysql import MEDIUMBLOB
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import register_model

__all__ = ['DraftForm', 'DraftFormAdminUser']


# XXX MySQL-specific type. How to resulve this?
class MediumPickleType(PickleType):

    impl = MEDIUMBLOB


@register_model('BaseModel')
def DraftFormAdminUser(models):

    admin_id  = Column(ForeignKey(models.AdminUser.id,
                                  ondelete="CASCADE"),
                       primary_key=True)
    draft_id  = Column(Integer, ForeignKey(models.DraftForm.id,
                                           ondelete="CASCADE"),
                       primary_key=True)


@register_model('BaseModel')
def DraftForm(models):

    id = Column(Integer, primary_key=True)
    stream_name = Column(String(50), nullable=False, default='')
    # object id can be string, so we use string here
    object_id = Column(String(50), nullable=True)
    data = Column(MediumPickleType, default=[])
    creation_time = Column(DateTime, default=datetime.now, nullable=False)
    update_time = Column(DateTime, default=datetime.now, nullable=False)

    users = relationship(models.AdminUser,
                          secondary=models.DraftFormAdminUser.__table__)

    @classmethod
    def get_for_item(cls, db, stream_name, item, user):
        '''Get DraftForm instance related to given item and stream.
           If the item is None, then DraftForm instances are filtered
           also by users
        '''
        query = db.query(cls).filter_by(stream_name=stream_name)
        if item is None or item.id is None:
            return query.filter(cls.users.contains(user) &
                                (cls.object_id == None)).first()
        return query.filter(cls.object_id == str(item.id)).first()

    Index('draft_index', stream_name, object_id)
