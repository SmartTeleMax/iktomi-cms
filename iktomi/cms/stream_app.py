# -*- coding: utf-8 -*-
import inspect

from iktomi import web
from .stream import Stream


def get_stream(module_name, root='streams'):
    module = __import__(root + '.' + module_name, None, None, ['*'])
    stream_class = getattr(module, 'Stream', Stream)
    return stream_class(module_name, root_module=root)


def get_streams_app(stream_list, root='streams'):
    streams = dict((name, get_stream(name, root=root))
                   for name in stream_list)

    def _create_ns(ns):
        handlers_by_namespace.setdefault(ns, [])
        if '.' in ns:
            parent = ns.rsplit('.', 1)[0]
            _create_ns(parent)


    handlers_by_namespace = {}
    for stream in streams.values():
        _create_ns(stream.app_namespace)
        handlers_by_namespace[stream.app_namespace].append(stream.get_handler())

    def _create_subapp(ns):
        prefix = ns + '.' if ns else ''
        children = [x for x in handlers_by_namespace
                    if x and x.startswith(prefix) and not '.' in x[len(prefix):]]

        child_apps = [web.prefix('/' + x.rsplit('.', 1)[-1]) | \
                      web.namespace(x.rsplit('.', 1)[-1]) | 
                      _create_subapp(x)
                      for x in children]
        return web.cases(*(child_apps + handlers_by_namespace[ns]))

    def get_edit_url(env, obj):
        for cls in inspect.getmro(type(obj)):
            if cls in _model_to_stream:
                name = _model_to_stream[cls]
                return env.url_for(name+'.item', item=obj.id)

    _model_to_stream = dict((stream.config.Model, name)
                            for (name, stream) in streams.iteritems())

    return streams, get_edit_url, _create_subapp('')


