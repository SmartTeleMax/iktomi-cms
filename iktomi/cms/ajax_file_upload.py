# -*- coding: utf-8 -*-

import os, logging, struct, time

from iktomi.web import WebHandler

logger = logging.getLogger(__file__)


def time_uid(**kw): #XXX accept slashed arg
    return (struct.pack('!d', time.time()) + os.urandom(2)).encode('hex')


class UploadedFileTmp(object):
    
    def __init__(self, orig_filename, path):
        self.orig_filename = orig_filename
        fname, ext = os.path.splitext(self.orig_filename)
        uid = time_uid()
        self.filename = uid + ext
        self.full_path = os.path.join(path, self.filename)


class UploadedFilePersist(object):
    pass


class FileUploadManager(object):
    tmp_dir = None
    persist_dir = None
    tmp_cls = None
    persist_cls = None

    def __init__(self, tmp_dir, persist_dir,\
                     tmp_cls=UploadedFileTmp, persist_cls=UploadedFilePersist):
        self.tmp_dir = tmp_dir
        self.persist_dir = persist_dir
        self.tmp_cls = tmp_cls
        self.persist_cls = persist_cls

    def save_tmp(self, orig_filename, read, length):
        tmp_file = self.tmp_cls(orig_filename, self.tmp_dir)
        fp = open(tmp_file.full_path, 'wb')
        pos, bufsize = 0, 100000
        while pos < length:
            bufsize = min(bufsize, length-pos)
            data = read(bufsize)
            fp.write(data)
            pos += bufsize
        fp.close()
        return tmp_file

    def save_persist(self, tmp_file):
        return self.persist_cls()

    def get_tmp_url(self, tmp_file, env):
        return ''

    def get_persist_url(self, persist_file, env):
        return ''

class FileUploadHandler(WebHandler):

    def __init__(self, manager):
        self.manager = manager

    def __call__(self, env, data):
        request = env.request

        if request.method =="POST":
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
                    logger.warning('YES! The Content-Length is in headers, '\
                                   'but it can not be found in WSGI env!\n')
                elif 'content-length' in request.GET:
                    length = int(request.GET['content-length'])
                    logger.warning('Using a value from GET args: %s\n' % \
                                                                    length)
                else:
                    logger.warning('There is no Content-Length either in '\
                                   'headers or in get args\n')
                    return env.json({'status': 'failure',
                                     'error': 'No Content-Length provided'})


             tmp_file = self.manager.save_tmp(request.GET["file"],\
                                                  request.environ['wsgi.input'].read,\
                                                  length)

             result = {
                 "status": 'ok',
                 "file": tmp_file.filename,
                 'file_url': self.manager.get_tmp_url(tmp_file, env)
                 }

             return env.json(result)
