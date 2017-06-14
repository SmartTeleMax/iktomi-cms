# -*- coding: utf-8 -*-

from distutils.core import setup

setup(
    name='iktomi.cms',
    version='0.2.3',
    packages=['iktomi',
              'iktomi.cms',
                    'iktomi.cms.auth',
                    'iktomi.cms.edit_log',
                    'iktomi.cms.editor_notes',
                    'iktomi.cms.forms',
                    'iktomi.cms.item_lock',
                    'iktomi.cms.models',
                    'iktomi.cms.publishing',
                    'iktomi.cms.tray'],

    package_dir={
        'iktomi.cms': 'iktomi/cms'
    },
    package_data={
        'iktomi.cms': ['templates/*.html',
                       'templates/*/*.html',
                       'templates/*/*/*.html',
                       'static/js/*.js',
                       'static/js/*.json',
                       'static/js/*/*.js',
                       'static/js/Manifest',
                       'static/css/*.css',
                       'static/css/*/*.css',
                       'static/css/Manifest',
                       'static/images/*.*',
                       'static/images/*/*.*',
                       ],
    },
    requires=[
        'webob (>1.1b1)',
        'iktomi (>0.4.2)',
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
