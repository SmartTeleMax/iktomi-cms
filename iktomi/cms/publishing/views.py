# -*- coding: utf-8 -*-
from .stream import PublishStream
from iktomi.web import WebHandler
from iktomi.cms.stream_handlers import insure_is_xhr

class PublishQueue(WebHandler):

    def __init__(self, streams):
        self.streams = streams

    def publish_queue(self, env, data):
        insure_is_xhr(env)
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
        return env.render_to_response('publish_queue', dict(
            changed = changed,
            menu = env.current_location,
            title = u'Очередь публикации',
        ))
    __call__ = publish_queue
