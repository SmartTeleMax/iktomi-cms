# -*- coding: utf-8 -*-
from webob.exc import HTTPNotFound
from iktomi import web
from iktomi.utils.storage import VersionedStorage
from iktomi.cms.stream import decode_stream_uid
from iktomi.cms.stream_actions import GetAction
from iktomi.cms.stream_handlers import insure_is_xhr
from iktomi.cms.loner import Loner
from iktomi.utils.paginator import ModelPaginator, FancyPageRange


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
        if rel_stream_name not in env.streams:
            # Deleted or renamed stream
            raise NotImplementedError
        rel_stream = env.streams[rel_stream_name]
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


