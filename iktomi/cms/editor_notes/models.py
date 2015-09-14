# -*- coding: utf-8 -*-

from sqlalchemy import Column, ForeignKey, Integer, DateTime, \
        Index, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from iktomi.cms.models.base import register_model

__all__ = ['EditorNote']

@register_model('BaseModel')
def EditorNote(models):

    id = Column(Integer, primary_key=True)
    stream_name = Column(String(50), nullable=False, default='')
    # object id can be string, so we use string here
    object_id = Column(String(50), nullable=True)
    created_dt = Column(DateTime, default=datetime.now, nullable=False)
    editor_id = Column(Integer, ForeignKey(models.AdminUser.id), nullable=False)
    editor = relationship(models.AdminUser)
    body = Column(Text, nullable=False)

    @classmethod
    def get_for_item(cls, db, stream_name, item):
        query = db.query(cls).filter_by(stream_name=stream_name)
        return query.filter(cls.object_id == str(item.id)).all()

    Index('draft_index', stream_name, object_id)
