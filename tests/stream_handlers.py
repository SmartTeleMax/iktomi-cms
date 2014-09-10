# -*- coding: utf-8 -*-

import unittest
from sqlalchemy.schema import MetaData, Column
from sqlalchemy import Integer, ForeignKey, create_engine
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from iktomi.db.sqla.declarative import AutoTableNameMeta
from iktomi.cms.stream_handlers import _get_referers

metadata = MetaData()
Base = declarative_base(metadata=metadata, name='Base',
                        metaclass=AutoTableNameMeta)


class ObjBase(Base):
    id = Column(Integer, primary_key=True)
    type = Column(Integer, nullable=False)
    __mapper_args__ = {'polymorphic_on': type}

class Obj1(ObjBase):
    id = Column(ForeignKey(ObjBase.id), primary_key=True)
    children = relationship('Obj2', primaryjoin='Obj1.id==foreign(Obj2.parent_id)')
    __mapper_args__ = {'polymorphic_identity': 1}

class Obj2(ObjBase):
    id = Column(ForeignKey(ObjBase.id), primary_key=True)
    parent_id = Column(ForeignKey(Obj1.id))
    __mapper_args__ = {'polymorphic_identity': 2}


class ReferersTests(unittest.TestCase):

    def setUp(self):
        self.db = sessionmaker(bind=create_engine('sqlite://'))()

    def test_relation_to_inheritance_leaf(self):
        obj2 = Obj2(id=1, type=2)
        obj1 = Obj1(id=2, type=1, children=[obj2])
        metadata.create_all(bind=self.db.bind)
        self.db.add(obj1)
        self.db.commit()
        referers = _get_referers(self.db, obj2)
        self.assertEqual(len(referers), 1)
        self.assertIn(Obj1, referers)
        self.assertEqual(referers[Obj1].keys(), [Obj1.children.prop])
        self.assertEqual(referers[Obj1][Obj1.children.prop][0], 1)
        self.assertEqual(referers[Obj1][Obj1.children.prop][1].all(), [obj1])

