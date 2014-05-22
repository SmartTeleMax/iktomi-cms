# -*- coding: utf-8 -*-

import re
import json
import logging, binascii
from jinja2 import Markup
from functools import partial
from os import path
from iktomi import web
from iktomi.web import WebHandler

from webob.exc import HTTPNotModified


logger = logging.getLogger(__name__)

def is_absolute(url):
    return url.startswith('/') or url.startswith('http://') \
                               or url.startswith('https://')

class StaticPacker(WebHandler):

    def response_with_etag(self, request, content, headers=None,
                           check=None, mimetype='text/html'):
        headers = headers or {}
        check = check or content
        etag_request = request.headers.get('If-None-Match')
        # XXX may be another algorythm?
        check = check.encode('utf-8') if isinstance(check, unicode) else check
        etag_response = str(binascii.crc32(check))
        if etag_request == etag_response:
            raise HTTPNotModified()

        headers['ETag'] = etag_response
        response = web.Response(content)
        response.headers['Content-Type'] = mimetype
        for name, value in headers.items():
            response.headers[name] = value
        return response

    def import_css(self, base_url, base_path, match):
        url = match.group(1)
        media = match.group(2)
        if is_absolute(url):
            return '@import url("%s") %s;' % (url, media)
        return self.get_css_contents(base_url, base_path, path.join(base_path, url))

    def fix_url(self, base_url, match):
        url = match.group(1).strip('"\'')
        if is_absolute(url):
            return 'url(%s)' % url
        url = base_url + url
        return 'url(%s)' % url

    def get_css_contents(self, base_url, base_path, filename):
        with open(filename) as f:
            data = f.read().decode('utf-8').strip()
            base_path = path.dirname(filename)
            data = re.sub(r'@import (?:url\()?"?\'?([^"\')]+)\'?"?\)?\s*(\w*)\s*;',
                          partial(self.import_css, base_url, base_path),
                          data)

            data = re.sub(r'url\(([^\)]+)\)',
                          partial(self.fix_url, base_url),
                          data)

            return data

    def css_packer(self, env, data):
        if getattr(env.cfg, 'CACHE_PACKED', False) \
                                and getattr(self, '_cached_css', None):
            return self.response_with_etag(env.request, self._cached_css,
                                                {'From-Cache': 'TRUE'},
                                                mimetype='text/css')
        content = []
        for manifest in env.cfg.MANIFESTS.values():
            manifest_filename = path.join(manifest['path'], manifest['css'])
            root = path.dirname(manifest_filename)
            base_url = manifest['url'] + path.dirname(manifest['css']) + '/'
            with open(manifest_filename) as f_manifest:
                files = [x.split('#')[0].strip()
                         for x in f_manifest.read().splitlines()]
                files = filter(None, files)
                files = [x + '.css' for x in files]
            for name in files:
                data = self.get_css_contents(base_url, root, path.join(root, name))
                content.append('/* '+ name +' */\n\n'+data)

        content = u'\n\n'.join(content)
        self._cached_css = content
        return self.response_with_etag(env.request, content, mimetype='text/css')


    def js_packer(self, env, data):
        if getattr(env.cfg, 'CACHE_PACKED', False)  \
                                and getattr(self, '_cached_js', None):
            return self.response_with_etag(env.request, self._cached_js,
                                           {'From-Cache': 'TRUE'},
                                           mimetype='text/javascript')

        content = []
        for manifest in env.cfg.MANIFESTS.values():
            manifest_filename = path.join(manifest['path'], manifest['js'])
            root = path.dirname(manifest_filename)
            with open(manifest_filename) as f_manifest:
                files = [x.split('#')[0].strip()
                         for x in f_manifest.read().splitlines()]
                files = filter(None, files)
                files = [x +'.js' for x in files]
            for name in files:
                filename = path.join(root, name)
                with open(filename) as f:
                    data = f.read().decode('utf-8').strip()
                    if not data.endswith(';'):
                        data += ';'
                    content.append(u'/* %s */\n%s' % (json.dumps(name), data))

        content.insert(0, "// Scripts: " + ",".join(files))
        content = u'\n\n'.join(content)
        self._cached_js = content
        return self.response_with_etag(env.request, content, mimetype='text/javascript')

    def _read_manifests(self, env, tp):
        result = []
        for manifest in env.cfg.MANIFESTS.values():
            manifest_filename = path.join(manifest['path'], manifest[tp])

            out = []
            with open(manifest_filename, 'r') as manifest_file:
                for line in manifest_file:
                    line = line.split('#')[0].strip()
                    if line:
                        out.append(line)

            base_url = manifest['url'] + path.dirname(manifest[tp])
            out = ['%s/%s.%s' % (base_url, name, tp) for name in out]
            result += out
        return result

    def js_tag(self, env):
        if getattr(env.cfg, 'RAW_JS', False):

            out = self._read_manifests(env, 'js')
            out = ['<script type="text/javascript" src="%s"></script>' % url
                   for url in out]
            return Markup('\n'.join(out))
        else:
            url = env.url_for('js_packer')
            return Markup('<script type="text/javascript" src="%s"></script>' % url)

    def css_tag(self, env, media='screen, projection', doctype="xhtml"):
        close = "/" if doctype.lower() == 'xhtml' else ""
        if getattr(env.cfg, 'RAW_CSS', False):

            out = self._read_manifests(env, 'css')
            out = ['<link rel="stylesheet" type="text/css" '
                   'media="%s" href="%s" %s>' % (media, url, close)
                   for url in out]
            return Markup('\n'.join(out))
        else:
            url = env.url_for('css_packer')
            return Markup('<link rel="stylesheet" type="text/css" '\
                          'media="%s" href="%s" %s>' % (media, url, close))
