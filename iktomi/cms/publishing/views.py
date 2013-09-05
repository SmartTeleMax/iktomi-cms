# -*- coding: utf-8 -*-
from .stream import PublishStream
from iktomi.web import WebHandler

class PublishQueue(WebHandler):

    def __init__(self, streams):
        self.streams = streams

    def publish_queue(self, env, data):
        if not env.request.is_xhr:
            return env.render_to_response('layout.html', {})
        # XXX
        env.models = env.models.admin
        env.version = 'admin'
        changed = []
        for stream in self.streams.values():
            if isinstance(stream, PublishStream):
                items = stream.item_query(env)\
                              .filter_by(has_unpublished_changes=True)
                if hasattr(stream.config.Model, 'state'):
                    items = items.filter_by(state=stream.config.Model.PUBLIC)
                items = items.all()
                changed += [(stream, item) for item in items]
        #changed.sort(key=lambda x: x.date_changed)
        html = env.render_to_string('publish_queue', dict(
            changed = changed,
            menu = env.current_location,
            title = u'Очередь публикации',
        ))
        return env.json({'html': html})
    __call__ = publish_queue
