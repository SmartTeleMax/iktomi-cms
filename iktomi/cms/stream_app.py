# -*- coding: utf-8 -*-
from importlib import import_module
from iktomi.cms.stream import Stream
from iktomi import web


class Streams(dict):

    @classmethod
    def from_list(cls, stream_list, package, **kwargs):
        return cls((name, cls.get_stream(name, package, **kwargs)) \
                   for name in stream_list)

    @classmethod
    def from_tree(cls, stream_tree, package, **kwargs):
        stream_list = []
        for stream in stream_tree:
            if type(stream) in (list, tuple):
                stream_list += [stream[0] + '.' + s for s in stream[1:]]
            else:
                stream_list.append(stream)
        return cls.from_list(stream_list, package, **kwargs)

    @staticmethod
    def get_stream(name, package, stream_class=Stream, **kwargs):
        module = import_module('.' + name, package)
        stream_class = getattr(module, 'Loner', stream_class)
        stream_class = getattr(module, 'Stream', stream_class)
        return stream_class(name, module, **kwargs)

    def to_app(self):
        return self._create_subapp()

    def _create_subapp(self, ns=''):
        prefix = ns and (ns + '.') or ''
        handlers_by_namespace = self._handlers_by_namespace()

        children = filter(
            lambda x: x and x.startswith(prefix) and not '.' in x[len(prefix):],
            handlers_by_namespace)

        child_apps = [web.prefix('/' + x.rsplit('.', 1)[-1]) | \
                      web.namespace(x.rsplit('.', 1)[-1]) | 
                      self._create_subapp(x)
                      for x in children]
        return web.cases(*(child_apps + handlers_by_namespace[ns]))

    def _handlers_by_namespace(self):
        result = {}
        for stream in self.values():
            for namespace in self._get_parent_namespaces(stream.app_namespace):
                result.setdefault(namespace, [])
            result[stream.app_namespace].append(stream.get_handler())
        return result

    def _get_parent_namespaces(self, namespace):
        result = []
        parts = namespace.split('.')
        while parts:
            result.append('.'.join(parts))
            parts.pop()
        return result


