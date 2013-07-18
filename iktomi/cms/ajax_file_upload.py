# -*- coding: utf-8 -*-

import logging
from iktomi.web import WebHandler

logger = logging.getLogger(__file__)


class FileUploadHandler(WebHandler):

    def get_length(self, request):
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

    def __call__(self, env, data):
        request = env.request

        if request.method =="POST":
            length = self.get_length(request)
            if not length:
                return env.json({'status': 'failure',
                                 'error': 'No Content-Length provided'})

            tmp_file = env.file_manager.create_transient(
                                       request.environ['wsgi.input'],\
                                       request.GET["file"],\
                                       length=length)

            result = {
                "status": 'ok',
                "file": tmp_file.name,
                'file_url': env.file_manager.get_transient_url(tmp_file, env)
                }

            if 'thumb_width' in request.GET and 'thumb_height' in request.GET:
                # XXX implement thumbnails
                pass
                #img = Image.open(tmp_file.path)

            return env.json(result)
