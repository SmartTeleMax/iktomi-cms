# -*- coding: utf-8 -*-

from distutils.core import setup

setup(
    name='iktomi.cms',
    version='0.1',
    packages=['iktomi',
              'iktomi.cms',
                    'iktomi.cms.forms',
                    'iktomi.cms.models',
                    'iktomi.cms.publishing',
                    'iktomi.cms.streams',
                    'iktomi.cms.utils'],

    package_data={
        'iktomi.cms': ['cms/templates/*',
                       'cms/static/*'],
    },
    requires=[
        'webob (>1.1b1)',
        'iktomi (>0.3)',
    ],
    author='Denis Otkidach',
    author_email='denis.otkidach@gmail.com',
    maintainer='Harut Dagesyan',
    maintainer_email='yes@harutune.name',
    description='CMS components for iktomi.',
    #long_description=open('README').read(),
    url='http://github.com/SmartTeleMax/iktomi-cms/',
    license='MIT',
    #keywords='',
)
