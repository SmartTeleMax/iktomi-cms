# -*- coding: utf-8 -*-

import os
import logging
from webob.exc import HTTPMethodNotAllowed, HTTPBadRequest, HTTPNotFound
from iktomi import web
from iktomi.cms.stream_actions import PostAction
from iktomi.cms.forms.fields import AjaxImageField
from iktomi.cms.forms import convs
from iktomi.cms.stream_handlers import PrepareItemHandler, NoneIntConv
from iktomi.unstable.db.sqla.files import FileAttribute
from iktomi.unstable.db.sqla.images import ImageProperty
from iktomi.unstable.forms.files import check_file_path
from PIL import Image

logger = logging.getLogger(__file__)


class FileUploadHandler(web.WebHandler):

    def get_length(self, request):
        length = int(request.environ.get('CONTENT_LENGTH', 0))
        if not length:
            from StringIO import StringIO
            from pprint import pprint
            sio = StringIO()
            sio.write('No content-length provided! \nHeaders:\n')
            pprint(request.headers.items(), sio)
            sio.write('\nEnviron:\n')
            pprint(request.environ, sio)
            sio.write('\nTrying to read directly from headers...')
            logger.warning(sio.getvalue())

            if request.headers.get('Content-Length'):
                length = int(request.headers.get('Content-Length'))
                logger.warning('YES! The Content-Length is in headers, '\
                               'but it can not be found in WSGI env!\n')
            elif 'content-length' in request.GET:
                length = int(request.GET['content-length'])
                logger.warning('Using a value from GET args: %s\n' % \
                                                                length)
            else:
                logger.warning('There is no Content-Length either in '\
                               'headers or in get args\n')
        return length

    def _save_file(self, env, data, length):
        request = env.request
        return env.file_manager.create_transient(
                                   request.body_file_raw,\
                                   request.GET["file"],\
                                   length=length)

    def save_file(self, env, data, length):
        original_name = env.request.GET["file"]
        transient = self._save_file(env, data, length)
        return {
            "file": transient.name,
            'file_url': env.file_manager.get_transient_url(transient, env),
            'original_name': original_name,
            }

    def __call__(self, env, data):
        request = env.request

        if request.method != "POST":
            raise HTTPMethodNotAllowed()

        length = self.get_length(request)
        if not length:
            return env.json({'status': 'failure',
                             'error': 'No Content-Length provided'})

        result = dict(status="ok")
        result.update(self.save_file(env, data, length))
        return env.json(result)



class StreamImageUploadHandler(PostAction, FileUploadHandler):

    item_lock = False
    force_autocrop = True
    for_item = True
    allowed_for_new = True
    display=False
    action = 'image_upload'

    @property
    def app(self):
        prefix = web.prefix('/<noneint:item>/'+self.action+'/<field_name>',
                            name=self.action,
                            convs={'noneint': NoneIntConv})
        prepare = PrepareItemHandler(self)
        return prefix | web.cases(
                  web.match() | prepare | self,
                  web.match('/crop', 'crop') | prepare | self.crop,
                  )

    def _collect_related_fields(self, env, form_field, image,
                                original_name, ext):
        rel_images = []
        for name in dir(form_field.model):
            rel_field = getattr(form_field.model, name)
            if isinstance(rel_field, FileAttribute) and \
                    isinstance(rel_field.prop, ImageProperty) and \
                    rel_field.prop.fill_from == form_field.name:
                rel_form_field = form_field.name_parent.get_field(name)
                if rel_form_field is None:
                    continue
                if not self.force_autocrop and \
                        not getattr(rel_form_field.conv, 'autocrop', False):
                    continue

                resizer = rel_field.prop.resize
                target_size = rel_field.prop.image_sizes
                transforms = resizer.transformations(image, target_size)
                rel_image = resizer(image, target_size)
                rel_transient = env.file_manager.new_transient(ext)
                rel_image.save(rel_transient.path)

                #rel_images.append({
                #    "name": rel_form_field.input_name,
                #    "file": rel_transient.name,
                #    'file_url': env.file_manager.get_transient_url(rel_transient, env),
                #    'fill_from': form_field.input_name,
                #    'transformations': transforms,
                #    'source_size': image.size,
                #    'original_name': original_name,
                #    })
                rel_images.append({rel_form_field.input_name:{
                    "current_url":env.file_manager.get_transient_url(rel_transient, env),
                    "transient_name":rel_transient.name,
                    "original_name": original_name,
                    "mode":"transient",
                    }
                })
                rel_images += self._collect_related_fields(
                                        env, rel_form_field,
                                        rel_image, original_name, ext)
        return rel_images

    def _get_form(self, env, data):
        item = data.item
        initial = {}
        if item is None:
            initial = data.filter_form.defaults()
            item = self.stream.get_model(env)(**initial)
        return self.stream.config.ItemForm.load_initial(env, item, initial=initial)

    def save_file(self, env, data, length):
        form = self._get_form(env, data)
        #form.model = self.stream.get_model(env)
        field = form.get_field(data.field_name)
        if not isinstance(field, AjaxImageField) or \
                field.model is None:
            return FileUploadHandler.save_file(self, env, data, length)

        transient = self._save_file(env, data, length)
        try:
            image = Image.open(transient.path)
        except IOError:
            return {'status': 'failure',
                    'error': 'Invalid image'}

        original_name = env.request.GET["file"]
        ext = os.path.splitext(original_name)[1]
        ext = ext or ('.' + (image.format or 'jpeg')).lower()

        rel_images = self._collect_related_fields(env, field, image,
                                                  original_name, ext)
        related_files = {}
        for image in rel_images:
            related_files.update(image)
        original_name = env.request.GET["file"]
        return {
            "file": transient.name,
            'file_url': env.file_manager.get_transient_url(transient, env),
            'original_name': original_name,
            'related_files': related_files,
            }

    def crop(self, env, data):
        item = data.item

        if env.request.method != 'POST':
            raise HTTPMethodNotAllowed()

        fail = lambda msg: env.json(dict(status='failure', error=msg))

        form = self._get_form(env, data)
        #form.model = self.stream.get_model(env)
        form_field = form.get_field(data.field_name)
        if not isinstance(form_field, AjaxImageField) or \
                form_field.model is None:
            raise HTTPNotFound()

        model_field = getattr(form_field.model, form_field.name)

        if not model_field.prop.fill_from:
            raise HTTPNotFound()

        if env.request.POST.get('mode') == 'existing':
            fill_from = model_field.prop.fill_from
            source = getattr(item, fill_from)
            if source is None:
                raise HTTPNotFound
            source = source.path
        elif env.request.POST.get('mode') == 'transient':
            transient_name = env.request.POST.get('transient_name')
            try:
                transient_name = check_file_path(None, transient_name)
            except convs.ValidationError:
                raise HTTPBadRequest()
            source = env.file_manager.get_transient(transient_name).path
        else:
            return fail('Invalid mode')

        _, original_name = os.path.split(source)

        try:
            image = Image.open(source)
        except IOError:
            return fail('Invalid image')

        box = ()
        for f in  ['left', 'top', 'right', 'bottom']:
            try:
                box += (int(env.request.POST.get(f, '')), )
            except ValueError:
                return fail('Invalid coordinates')

        image = image.crop(box)
        ext = os.path.splitext(source)[1]
        ext = ext or ('.' + (image.format or 'jpeg')).lower()
        transient = env.file_manager.new_transient(ext)
        image.save(transient.path, quality=100)

        rel_images = self._collect_related_fields(
                                    env, form_field, image, original_name, ext)

        return env.json({
            'status': 'ok',
            'file': transient.name,
            'file_url': env.file_manager.get_transient_url(transient, env),
            'original_name': original_name,
            'related_files': rel_images,
            })
