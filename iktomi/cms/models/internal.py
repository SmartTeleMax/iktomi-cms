# -*- coding: utf-8 -*-

from webutils.database import *
from iktomi.auth import encrypt_password, check_password
from datetime import datetime
from .base import AdminModel


class AdminUser(AdminModel):

    id = Column(Integer, primary_key=True)
    name = Column(String(250), nullable=False, default='')
    login = Column(String(32), nullable=False, unique=True)
    email = Column(String(200), index=True)
    password = Column(String(250), nullable=False)
    creation_time = Column(DateTime, default=datetime.now, nullable=False)
    roles = Column(StringList(250), nullable=False, default=[])

    def __unicode__(self):
        if self.id is None:
            return u'Новый редактор'
        return u'Редактор: %s (%s)' % (self.name, self.login)

    def set_password(self, password):
        self.password = encrypt_password(password)
    
    def check_password(self, password):
        return check_password(password, self.password)
