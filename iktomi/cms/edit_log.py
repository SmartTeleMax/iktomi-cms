# -*- coding: utf-8 -*-
from webob.exc import HTTPNotFound
from iktomi import web
from iktomi.utils.storage import VersionedStorage
from iktomi.cms.stream import decode_stream_uid
from iktomi.cms.stream_actions import GetAction
from iktomi.cms.stream_handlers import insure_is_xhr
from iktomi.cms.loner import Loner
from iktomi.utils.paginator import ModelPaginator, FancyPageRange


def global_log(env, data):
    insure_is_xhr(env)

    stream_names = [k for (k, s) in env.streams.items()
                    if 'r' in s.get_permissions(env)]

    EditLog = env.edit_log_model
    cond = EditLog.stream_name.in_(stream_names)
    for stream_name in stream_names:
        cond |= EditLog.stream_name.startswith(stream_name + ':')

    query = env.db.query(EditLog).filter(cond)
#    url = env.root.build_subreverse(env.current_location)
    paginator = ModelPaginator(env.request, query,
                               impl=FancyPageRange(),
                               limit=30,
                               #url=url
                               )

    def expand(obj):
        # XXX all this is like a hack!
        stream_name = obj.stream_name.split(':')[0]
        if stream_name not in env.streams:
            return {}
        stream = env.streams[stream_name]
        lang = decode_stream_uid(obj.stream_name)[1].get('lang')
        stream_env = VersionedStorage(version="admin", lang=lang)
        stream_env._storage._parent_storage = env
        stream_env.models = env.models.admin
        if lang:
            stream_env.models = getattr(stream_env.models, lang)

        assert 'r' in stream.get_permissions(stream_env)
        item = stream.item_query(stream_env).filter_by(id=obj.object_id).first()
        return {"obj": obj,
                "stream": stream,
                "item": item,
                "item_title": getattr(item, 'title', unicode(item)),
                "lang": lang,
                "type": stream.edit_log_action.log_type_title(obj)}


    paginator.items = [expand(obj) for obj in paginator.items]

    return env.render_to_response('edit_log/global_log',
                                  dict(paginator=paginator,
                                       #stream=self.stream,
                                       log_type_title=EditLogHandler.log_type_title, # XXX
                                       ))


class EditLogHandler(GetAction):

    item_lock = False
    allowed_for_new = False
    display = False
    cls = 'edit-log'
    action = 'edit_log'
    title = u'Журнал изменений'

    @property
    def PrepareItemHandler(self):
        return self.stream.edit_action.PrepareItemHandler

    @property
    def app(self):
        if isinstance(self.stream, Loner):
            prefix = web.prefix('/log', name=self.action)
        else:
            prefix = web.prefix('/<int:item>/log', name=self.action)
        return prefix | self.PrepareItemHandler(self) | web.cases(
                web.match('') | self,
                web.match('/<int:log_id>', 'entry') | self.log_entry,
                )

    @classmethod
    def log_type_title(cls, log):
        return {'edit': u'Правка',
                'publish': u'Опубликовано',
                'unpublish': u'Снято с публикации',
                'revert': u'Откат'}[log.type]

    def edit_log(self, env, data):
        insure_is_xhr(env)

        if getattr(env, 'version', None) == 'front':
            raise HTTPNotFound()

        EditLog = env.edit_log_model
        query = EditLog.query_for_item(env.db, data.item)

        stream = self.stream
        log_url = stream.url_for(env, self.action, item=data.item.id)
        paginator = ModelPaginator(env.request, query,
                                   impl=FancyPageRange(),
                                   limit=30,
                                   url=log_url)

        def get_lang(obj):
            return decode_stream_uid(obj.stream_name)[1].get('lang')
        #paginator.items = [expand_stream(env, obj) for obj in paginator.items]

        return env.render_to_response('edit_log/index',
                                      dict(paginator=paginator,
                                           stream=self.stream,
                                           get_lang=get_lang,
                                           item=data.item,
                                           log_type_title=self.log_type_title))

    __call__ = edit_log

    def log_entry(self, env, data):
        insure_is_xhr(env)

        if getattr(env, 'version', None) == 'front':
            raise HTTPNotFound()

        EditLog = env.edit_log_model
        log = EditLog.query_for_item(env.db, data.item)\
                     .filter_by(id=data.log_id)\
                     .first()

        if log is None:
            raise HTTPNotFound()

        rel_stream_name, params = decode_stream_uid(log.stream_name)
        if rel_stream_name in env.streams:
            rel_stream = env.streams[rel_stream_name]
        else:
            # Deleted or renamed stream
            raise NotImplementedError("Deleted or renamed stream", rel_stream_name)
        rel_env = VersionedStorage(**params)
        rel_env._storage._parent_storage = env

        form_cls = rel_stream.config.ItemForm

        form1 = form_cls.load_initial(env, data.item, initial={})
        form2 = form_cls.load_initial(env, data.item, initial={})
        form1.model = form2.model = rel_stream.get_model(env)

        form1.accept(log.before)
        form2.accept(log.after)

        # reset permissions
        form1.permissions = form2.permissions = frozenset('r')
        form1.fields = [field(parent=form1) for field in form1.fields]
        form2.fields = [field(parent=form2) for field in form2.fields]

        diff = form1.get_diff(form2)
        diffs = diff['children'] if diff is not None else []

        return env.render_to_response('edit_log/item',
                                      dict(form1=form1,
                                           form2=form2,
                                           diffs=diffs,
                                           log=log,
                                           stream=self.stream,
                                           item=data.item,
                                           log_type=self.log_type_title(log)))


