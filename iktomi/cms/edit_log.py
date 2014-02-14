# -*- coding: utf-8 -*-
from webob.multidict import MultiDict
from webob.exc import HTTPNotFound
from iktomi import web
from iktomi.utils.storage import VersionedStorage
from iktomi.cms.stream import expand_stream, decode_stream_uid
from iktomi.cms.stream_actions import GetAction
from iktomi.cms.stream_handlers import insure_is_xhr
from iktomi.cms.stream_handlers import PrepareItemHandler
from iktomi.utils.paginator import ModelPaginator, FancyPageRange


def log_type_title(log):
    return {'edit': u'правка',
            'publish': u'опубликовано',
            'unpublish': u'снято с публикации',
            'revert': u'откат'}[log.type]

class EditLogHandler(GetAction):

    item_lock = False
    allowed_for_new = False
    display = False
    cls = 'edit-log'
    action = 'edit_log'
    title = u'Журнал изменений'
    PrepareItemHandler = PrepareItemHandler

    @property
    def app(self):
        return web.prefix('/<int:item>/log', name=self.action) | \
                    self.PrepareItemHandler(self) | web.cases(
                            web.match('') | self,
                            web.match('/<int:log_id>', 'entry') | self.log_entry,
                            )

    def edit_log(self, env, data):
        insure_is_xhr(env)

        if getattr(env, 'version') == 'front':
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

        return env.render_to_response('edit_log/index', dict(paginator=paginator,
                                                             stream=self.stream,
                                                             get_lang=get_lang,
                                                             item=data.item,
                                                             log_type_title=log_type_title))

    __call__ = edit_log

    def get_field_data(self, form, field_name):
        md = MultiDict()
        field = form.get_field(field_name)
        rv = field.from_python(form.python_data[field.name])
        field.set_raw_value(md, rv)
        return md

    def log_entry(self, env, data):
        insure_is_xhr(env)

        if getattr(env, 'version') == 'front':
            raise HTTPNotFound()

        EditLog = env.edit_log_model
        log = EditLog.query_for_item(env.db, data.item)\
                     .filter_by(id=data.log_id)\
                     .first()

        rel_stream_name, params = decode_stream_uid(log.stream_name)
        if rel_stream_name not in env.streams:
            # Deleted or renamed stream
            raise NotImplementedError
        rel_stream = env.streams[rel_stream_name]
        rel_env = VersionedStorage(**params)
        rel_env._storage.parent_storage = env

        form_cls = rel_stream.get_item_form_class(env)

        form1 = form_cls.load_initial(env, data.item, initial={})
        form2 = form_cls.load_initial(env, data.item, initial={})
        form1.accept(log.before)
        form2.accept(log.after)

        fields = sum([x.field_names for x in form1.fields], [])
        changed_fields = []
        for field in fields:
            if not field:
                continue
            data1 = self.get_field_data(form1, field)
            data2 = self.get_field_data(form2, field)
            if data1 != data2:
                changed_fields.append(field)

        # XXX
        form1 = form_cls.load_initial(env, data.item.__class__(),
                                      initial=form1.python_data, permissions='r')
        form2 = form_cls.load_initial(env, data.item.__class__(),
                                      initial=form2.python_data, permissions='r')
        return env.render_to_response('edit_log/item', dict(form1=form1,
                                                            form2=form2,
                                                            changed_fields=changed_fields,
                                                            log=log,
                                                            stream=self.stream,
                                                            item=data.item,
                                                            log_type=log_type_title(log)))


