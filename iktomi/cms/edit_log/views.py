# -*- coding: utf-8 -*-
from webob.exc import HTTPNotFound
from functools import partial
from iktomi import web
from iktomi.utils.storage import VersionedStorage
from iktomi.cms.stream import decode_stream_uid
from iktomi.cms.stream_actions import GetAction
from iktomi.cms.loner import Loner
from iktomi.utils.paginator import ModelPaginator, FancyPageRange
from .forms import EditLogFilterForm, EditLogItemFilterForm


def _preload_users(env, entries):
    entries_by_id = dict((x.id, x) for x in entries)
    m = env.models_.admin
    query = env.db.query(m.AdminUser)\
                  .join(m.EditLogAdminUser)\
                  .filter(m.EditLogAdminUser.log_id.in_(entries_by_id))\
                  .with_entities(m.EditLogAdminUser.log_id, m.AdminUser)
    objects = query.all()

    for entry in entries_by_id.values():
        # XXX what is the right way to do this?!
        entry.__dict__['users'] = [v for k, v in objects if k == entry.id]


def _preload_items(env, entries):
    by_stream = {}
    for entry in entries:
        by_stream.setdefault(entry.stream_name, [])
        by_stream[entry.stream_name].append(entry.object_id)

    by_stream_and_id = {}
    for stream_name, ids in by_stream.items():

        name = stream_name.split(':')[0]
        if name not in env.streams:
            continue
        stream = env.streams[name]
        lang = decode_stream_uid(stream_name)[1].get('lang')

        stream_env = VersionedStorage(version="admin", lang=lang)
        stream_env._storage._parent_storage = env
        # XXX only for multi db! will fail on single db
        stream_env.models = env.models_.admin
        if lang:
            stream_env.models = getattr(stream_env.models, lang)

        M = stream.get_model(stream_env)
        items = stream.item_query(stream_env).filter(M.id.in_(ids)).all()
        for item in items:
            by_stream_and_id[(stream_name, str(item.id))] = item
    return by_stream_and_id


def _expand(env, obj, for_item=None):
    # XXX all this is like a hack!
    stream_name = obj.stream_name.split(':')[0]
    if stream_name not in env.streams:
        return {}
    stream = env.streams[stream_name]
    lang = decode_stream_uid(obj.stream_name)[1].get('lang')
    if for_item is None:
        stream_env = VersionedStorage(version="admin", lang=lang)
        stream_env._storage._parent_storage = env
        # XXX only for multi db! will fail on single db
        stream_env.models = env.models.admin
        if lang:
            stream_env.models = getattr(stream_env.models, lang)
    else:
        stream_env = env

    assert 'r' in stream.get_permissions(stream_env)
    if for_item is None:
        item = stream.item_query(stream_env).filter_by(id=obj.object_id).first()
    else:
        item = for_item

    if item is not None:
        item_title = getattr(item, 'title', unicode(item))
    else:
        item_title = u"<{}: удалённый или недоступный объект: {}>".format(
                                stream.title, obj.object_id)

    return {"obj": obj,
            "stream": stream,
            "item": item,
            "item_title": item_title,
            "lang": lang,
            "type": stream.edit_log_action.log_type_title(obj)}


def global_log(env, data, stream=None):
    #insure_is_xhr(env)

    EditLog = env.edit_log_model

    assert (stream and getattr(data, 'item', None)) or \
           not (stream or getattr(data, 'item', None))

    if stream is None:
        query = env.db.query(EditLog)

        stream_names = [k for (k, s) in env.streams.items()
                        if 'r' in s.get_permissions(env) and s.edit_log_action is not None]
        stream_choices = [(k, env.streams[k].title)
                          for k in stream_names]
        types = {}
        for k in stream_names:
            types.update(env.streams[k].edit_log_action.log_types)
        types = types.items()

        filter_form = EditLogFilterForm(env,
                                        streams=stream_choices,
                                        models=env.models_.admin,
                                        types=types)
    else:
        log_types = stream.edit_log_action.log_types
        filter_form = EditLogItemFilterForm(env,
                                            models=env.models,
                                            types=log_types.items())
        query = EditLog.query_for_item(env.db, data.item)

    filter_form.model = EditLog
    filter_form.accept(env.request.GET)
    query = filter_form.filter(query)

    #url = env.root.build_subreverse(env.current_location)
    #url = stream.url_for(env, self.action, item=data.item.id)
    paginator = ModelPaginator(env.request, query,
                               impl=FancyPageRange(),
                               limit=50,
                               #url=url
                               )
    _preload_users(env, paginator.items)

    if getattr(data, 'item', None) is None:
        expand_obj = partial(_expand, env)
        by_stream_and_id = _preload_items(env, paginator.items)
        paginator.items = [expand_obj(obj,
                                      for_item=by_stream_and_id.get((obj.stream_name, obj.object_id)))
                           for obj in paginator.items]

    else:
        expand_obj = partial(_expand, env, for_item=data.item)
        paginator.items = [expand_obj(obj) for obj in paginator.items]

    paginator.items = filter(None, paginator.items)

    reverse_data = data.as_dict()
    if stream is not None:
        # XXX hack!
        reverse_data = dict(reverse_data,
                            item=data.item.id)
    current_url = env.root.build_subreverse(env.current_location, **reverse_data)

    tdata = dict(paginator=paginator,
                 title=u"Журнал изменений",
                 filter_form=filter_form,
                 current_url=current_url,
                 no_layout='__no_layout' in env.request.GET,
                 )
    if stream is not None:
        tdata = dict(tdata, item=data.item,
                            stream=stream)

    return env.render_to_response('edit_log/index', tdata)


class EditLogHandler(GetAction):

    item_lock = False
    allowed_for_new = False
    display = False
    cls = 'edit-log'
    action = 'edit_log'
    title = u'Журнал изменений'
    log_types = {
        'create': u'Создано',
        'edit': u'Правка',
        'publish': u'Опубликовано',
        'delete': u'Удалено',
        'unpublish': u'Снято с публикации',
        'revert': u'Откат'
    }

    @property
    def PrepareItemHandler(self):
        return self.stream.edit_action.PrepareItemHandler

    @property
    def app(self):
        if isinstance(self.stream, Loner):
            prefix = web.prefix('/log', name=self.action)
        else:
            prefix = web.prefix('/<idconv:item>/log', name=self.action,
                                convs={'idconv': self.stream.id_converter})
        return prefix | self.PrepareItemHandler(self) | web.cases(
                web.match('') | self,
                web.match('/<int:log_id>', 'entry') | self.log_entry,
                )

    @classmethod
    def log_type_title(cls, log):
        return cls.log_types[log.type]

    def edit_log(self, env, data):
        return global_log(env, data, stream=self.stream)
    __call__ = edit_log

    def log_entry(self, env, data):
        #insure_is_xhr(env)

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

        item_cp = type(data.item)(id=data.item.id)

        form1 = form_cls.load_initial(env, item_cp, initial={})
        form2 = form_cls.load_initial(env, item_cp, initial={})
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


