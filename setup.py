# -*- coding: utf-8 -*-

from distutils.core import setup

setup(
    name='iktomi.cms',
    version='0.1',
    packages=['iktomi', 'iktomi.cms'],
    requires=[
        'webob (>1.1b1)',
        'iktomi (>0.3)',
    ],
    author='Denis Otkidach',
    author_email='denis.otkidach@gmail.com',
    maintainer='Tim Perevezentsev',
    maintainer_email='riffm2005@gmail.com',
    description='CMS components for iktomi.',
    #long_description=open('README').read(),
    url='http://github.com/SmartTeleMax/iktomi-cms/',
    license='MIT',
    #keywords='',
)
