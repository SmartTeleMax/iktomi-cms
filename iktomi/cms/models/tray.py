# -*- coding: utf-8 -*-

from sqlalchemy import Column, ForeignKey, Integer, DateTime, \
        Index, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import register_model

__all__ = ['Tray']


@register_model('BaseModel')
def ObjectTray(models):
    id = Column(Integer, primary_key=True)
    stream_name = Column(String(50), nullable=False, default='')
    # object id can be string, so we use string here
    object_id = Column(String(50), nullable=True)
    tray_id = Column(Integer, ForeignKey('Tray.id'))
    tray = relationship('Tray')
    comment = Column(Text, nullable=False, default='')

    Index('draft_index', stream_name, object_id)


@register_model('BaseModel')
def Tray(models):

    id = Column(Integer, primary_key=True)
    title = Column(String(250), nullable=False)
    editor_id = Column(Integer, ForeignKey(models.AdminUser.id),
                       nullable=True, unique=True)
    editor = relationship(models.AdminUser)


