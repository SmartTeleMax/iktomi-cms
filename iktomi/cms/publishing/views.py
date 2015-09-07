# -*- coding: utf-8 -*-
from .stream import PublishStream
from .i18n_stream import I18nPublishStream
from iktomi.web import WebHandler
from iktomi.utils.storage import VersionedStorage


class PublishQueue(WebHandler):

    def __init__(self, streams):
        self.streams = streams

    def publish_queue(self, env, data):
        #insure_is_xhr(env)

        changed = []
        for stream in self.streams.values():
            if isinstance(stream, I18nPublishStream):
                for lang, lang_name in stream.langs:
                    subenv = VersionedStorage()
                    subenv._parent_storage = env
                    subenv.models = getattr(env.models.admin, lang)
                    subenv.version = 'admin'
                    subenv.lang = lang

                    items = stream.item_query(subenv)\
                                  .filter_by(has_unpublished_changes=True)
                    if hasattr(stream.config.Model, 'state'):
                        items = items.filter_by(state=stream.config.Model.PUBLIC)
                    items = items.all()
                    changed += [(stream, subenv, item) for item in items]
            elif isinstance(stream, PublishStream):
                subenv = VersionedStorage()
                subenv._parent_storage = env
                subenv.models = env.models.admin
                subenv.version = 'admin'
                items = stream.item_query(subenv)\
                              .filter_by(has_unpublished_changes=True)
                if hasattr(stream.config.Model, 'state'):
                    items = items.filter_by(state=stream.config.Model.PUBLIC)
                items = items.all()
                changed += [(stream, subenv, item) for item in items]
        changed.sort(key=lambda x: x[2].updated_dt)
        return env.render_to_response('publish_queue', dict(
            changed = changed,
            menu = env.current_location,
            title = u'Очередь публикации',
        ))
    __call__ = publish_queue
