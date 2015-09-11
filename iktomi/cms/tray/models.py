# -*- coding: utf-8 -*-
from datetime import datetime

from sqlalchemy import Column, ForeignKey, Integer, DateTime, \
        Index, String, Text
from sqlalchemy.orm import relationship, object_session
from sqlalchemy import func

from iktomi.utils import cached_property
from iktomi.cms.models.base import register_model

__all__ = ['Tray']


@register_model('BaseModel')
def ObjectTray(models):
    id = Column(Integer, primary_key=True)
    stream_name = Column(String(50), nullable=False, default='')
    # object id can be string, so we use string here
    object_id = Column(String(100), nullable=True)

    tray_id = Column(Integer, ForeignKey('Tray.id'))
    tray = relationship('Tray')
    sender_id = Column(Integer, ForeignKey(models.AdminUser.id),
                       nullable=True)
    sender = relationship(models.AdminUser)

    comment = Column(Text, nullable=False, default='')
    created_dt = Column(DateTime, default=datetime.now, nullable=False)

    Index('draft_index', stream_name, object_id)

    def can_delete(self, user):
        if self.tray.editor is not None:
            return user in (self.tray.editor, self.sender)
        return True


@register_model('BaseModel')
def Tray(models):

    id = Column(Integer, primary_key=True)
    title = Column(String(250), nullable=False)
    editor_id = Column(Integer, ForeignKey(models.AdminUser.id),
                       nullable=True, unique=True)
    editor = relationship(models.AdminUser)

    @cached_property
    def object_count(self):
        session = object_session(self)
        ObjectTray = self.models.ObjectTray
        return session.query(func.count(ObjectTray.id))\
                      .filter(ObjectTray.tray==self)\
                      .scalar()

