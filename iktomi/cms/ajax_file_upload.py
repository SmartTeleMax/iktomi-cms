# -*- coding: utf-8 -*-
from webutils.forms import files
from iktomi.forms.convs import ValidationError
from iktomi.web import WebHandler
from webutils.forms import *
import os
import logging

logger = logging.getLogger(__file__)

class DNDFileField(files.FileFieldSet):

    media = [FormJSRef('dragupload.js'),
             FormJSRef('progressbar.js'),
             FormJSRef('presave/Files.js'),
             FormCSSRef('dragupload.css')]
    template = 'widgets/dropfile'
    upload_endpoint = 'load_tmp_file'

    def __init__(self, *args, **kwargs):
        super(DNDFileField, self).__init__(*args, **kwargs)
        if 'parent' in kwargs:
            try:
                form = self.form
                form.presavehooks = getattr(form, 'presavehooks', [])
                if 'CheckFilesUploaded' not in form.presavehooks:
                    form.presavehooks = form.presavehooks + ['CheckFilesUploaded']
            except AttributeError: pass


class DNDImageField(DNDFileField):

    template = 'widgets/dropimage'
    #: used when file is uploaded
    temp_file_cls = files.TempImageFile
    thumb_size = None
    thumb_sufix = '__thumb' # XXX not really used in AJAX upload view, but used by TempImageFile
    upload_endpoint = 'load_tmp_image'

    # Show the thumb or not. Works only with image option on
    show_thumbnail = True
    #: use js pre-upload thumbnail generation by canvas
    canvas_thumb_preview = False


class FileUploadHandler(WebHandler):
    temp_dir = None

    def __init__(self, cls=files.TempUploadedFile, temp_dir=None):
        self.temp_file_cls = cls
        self.temp_dir = temp_dir or self.temp_dir

    def __call__(self, env, data):
        tmp_dir = self.temp_dir or env.cfg.FORM_TEMP
        request = env.request

        if request.method =="POST":
            #if "delete" in request.args:
            #    # XXX separate view
            #    filename = request.GET["delete"]
            #    fm.delete_file(filename)
            #    return HttpResponse(content = ('{"result":"ok"}'))

            fname, ext = os.path.splitext(request.GET["file"])
            uid = files.time_uid()
            filename = uid + ext
            full_path = os.path.join(tmp_dir, filename)

            length = int(request.environ.get('CONTENT_LENGTH', 0))
            if not length:
                from StringIO import StringIO
                from pprint import pprint
                sio = StringIO()
                sio.write('No content-length provided! \nHeaders:\n')
                pprint(request.headers, sio)
                sio.write('\nEnviron:\n')
                pprint(request.environ, sio)
                sio.write('\nTrying to read directly from headers...')
                logger.warning(sio.getvalue())

                length = int(request.headers.get('Content-Length'))
                if length:
                    logger.warning('YES! The Content-Length is in headers, but it can not be found in WSGI env!\n')
                elif 'content-length' in request.GET:
                    length = int(request.GET['content-length'])
                    logger.warning('Using a value from GET args: %s\n' % length)
                else:
                    logger.warning('There is no Content-Length either in headers or in get args\n')
                    return env.json({'status': 'failure',
                                     'error': 'No Content-Length provided'})

            read = request.environ['wsgi.input'].read
            fp = open(full_path, 'wb')
            pos, bufsize = 0, 100000
            while pos < length:
                bufsize = min(bufsize, length-pos)
                data = read(bufsize)
                fp.write(data)
                pos += bufsize
            fp.close()

            result = {
                "status": 'ok',
                "file": filename,
                'file_url': env.cfg.FORM_TEMP_URL + filename
                }


            if self.temp_file_cls != files.TempUploadedFile:
                tmp_file = self.temp_file_cls(tmp_dir, fname, ext, uid)
                if request.GET.get('image'):
                    try:
                        tmp_file.thumb_size = (int(request.GET['thumb_width']),
                                               int(request.GET['thumb_height']))
                    except (KeyError, TypeError):
                        tmp_file.thumb_size = None
                        result['thumbnail'] = env.cfg.FORM_TEMP_URL + filename
                    else:
                        tmp_file.thumb_sufix = '__thumb' # XXX hardcoded
                        result['thumbnail'] = env.cfg.FORM_TEMP_URL + uid + '__thumb.png'

                fp = open(full_path)
                try:
                    tmp_file.save(fp, inherited=False)
                except ValidationError, e:
                    os.unlink(full_path)
                    result = {'status': 'failure', 'error': e.message}
                finally:
                    fp.close()
            return env.json(result)


