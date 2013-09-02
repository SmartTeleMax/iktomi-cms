# -*- coding: utf-8 -*-
from iktomi import web
from iktomi.cms.stream_handlers import PrepareItemHandler, EditItemHandler, DeleteItemHandler
from iktomi.cms.stream import Stream, ListField
from iktomi.cms.stream_actions import PostAction
from iktomi.cms.flashmessages import flash
from iktomi.utils import cached_property


class AdminEditItemHandler(EditItemHandler):



    def process_item_template_data(self, env, td):
        # Filter buttons
        #td['item_buttons'] = []#'unpublish']
        td['actions'] = [x for x in td['actions']
                         if not x.action in ('unpublish', 'front_publish')]
        return td


class AdminPublishAction(PostAction):

    action = 'publish'
    display = True
    for_item = True
    allowed_for_new = False
    accepts_item_form = False
    title = u'Опубликовать'

    @property
    def app(self):
        return web.match('/<int:item>/%s' % self.action, self.action) | \
               web.method('POST', strict=True) | \
               PrepareItemHandler(self) | self

    def admin_publish(self, env, data):
        self.stream.insure_has_permission(env, 'w')
        if data.lock_message:
            self.stream.rollback_due_lock_lost(env, data.item)
            return env.json({})

        data.item.publish()
        flash(env, u'Объект «%s» опубликован' % data.item, 'success')
        env.db.commit()

        url = self.stream.url_for(env, 'item', item=data.item.id)
        return env.json({'result': 'success',
                         'location': url})
    __call__ = admin_publish

    def is_available(self, env, item):
        return item.id and (item.has_unpublished_changes or \
                (hasattr(item, 'state') and item.state != item.PUBLIC)) and \
                self.stream.has_permission(env, 'w')


class UnpublishAction(PostAction):

    allowed_for_new = False
    accepts_item_form = False
    action = 'unpublish'
    title = u'Снять с публикации'

    @property
    def app(self):
        return web.match('/<int:item>/%s' % self.action, self.action) | \
               web.method('POST', strict=True) | \
               PrepareItemHandler(self) | self

    def unpublish(self, env, data):
        self.stream.insure_has_permission(env, 'w')
        if data.lock_message:
            self.stream.rollback_due_lock_lost(env, data.item)
            return env.json({})
        module_name = env.stream.module_name

        data.item.unpublish()
        flash(env, u'Объект «%s» снят с публикации' % data.item, 'success')
        env.db.commit()

        url = env.url_for(module_name + '.item', item=data.item.id)
        return env.json({'result': 'success',
                         'location': url})
    __call__ = unpublish

    def is_available(self, env, item):
        return item.state == item.PUBLIC and \
                self.stream.has_permission(env, 'w')


class RevertAction(PostAction):

    allowed_for_new = False
    accepts_item_form = False
    action = 'revert'
    title = u'Восстановить из фронтальной'

    @property
    def app(self):
        return web.match('/<int:item>/%s' % self.action, self.action) | \
               web.method('POST', strict=True) | \
               PrepareItemHandler(self) | self

    def revert(self, env, data):
        self.stream.insure_has_permission(env, 'w')
        if data.lock_message:
            self.stream.rollback_due_lock_lost(env, data.item)
            return env.json({})
        module_name = env.stream.module_name

        data.item.revert_to_published()
        flash(env, u'Объект «%s» восстановлен из фронтальной версии' 
                    % data.item, 'success')
        env.db.commit()

        url = env.url_for(module_name + '.item', item=data.item.id)
        return env.json({'result': 'success',
                         'location': url})
    __call__ = revert

    def is_available(self, env, item):
        if hasattr(item, 'state') and \
                item.state not in (item.PUBLIC, item.UNPUBLISHED):
            return False
        return item.has_unpublished_changes and \
                self.stream.has_permission(env, 'w')


class DeleteFlagHandler(DeleteItemHandler):

    def delete_flag_handler(self, env, data):
        if not env.request.is_xhr:
            return env.render_to_response('layout.html', {})

        if env.request.method != 'POST':
            data.item._get_referers = lambda x:[]
            return DeleteItemHandler.__call__(self, env, data)

        self.stream.insure_has_permission(env, 'd')

        data.item.delete()
        env.db.commit()

        stream_url = env.url_for(self.stream.module_name).qs_set(
                            data.filter_form.get_data())

        return env.json({'result': 'success',
                         'location': stream_url})
    __call__ = delete_flag_handler


class HasChangesListField(ListField):

    template='list_field_has_changes.html'

    def __init__(self, name='has_unpublished_changes', title='', **kwargs):
        kwargs.setdefault('link_to_item', False)
        kwargs.setdefault('transform', lambda x: x)
        kwargs.setdefault('width', '0%')
        return ListField.__init__(self, name, title, **kwargs)


class PublishStreamNoState(Stream):

    core_actions = [x for x in Stream.core_actions
                    if x.action not in ('delete', 'item')] + [
           AdminEditItemHandler(),
           DeleteFlagHandler(),
           AdminPublishAction(),
           RevertAction(),
        ]

    versions = (('admin', u'Редакторская версия'),
                ('front', u'Фронтальная версия'),)
    versions_dict = dict(versions)

    def get_item_form_class(self, env):
        Form = self.config.ItemForm(env.models)
        Form.__module__ = self.config.__name__
        Form.model = self.get_model(env)
        return Form

    @property
    def prefix_handler(self):
        @web.request_filter
        def set_models(env, data, nxt):
            assert data.version in self.versions_dict.keys()
            env.models = getattr(env.models, data.version)
            env.version = data.version
            return nxt(env, data)

        version_prefix = web.prefix('/<any("%s"):version>' % \
                                     ('","'.join(self.versions_dict.keys())))
        #return version_prefix | set_models | \
        return super(PublishStreamNoState, self).prefix_handler |\
               version_prefix | set_models

    @cached_property
    def list_fields(self):
        fields = getattr(self.config, 'list_fields', {})
        cls = fields.__class__
        fields = fields.values()
        fields.insert(1, HasChangesListField())
        return cls(fields)

    @cached_property
    def item_template_name(self):
        return getattr(self.config, 'item_template', 'item_publish')

    def item_query(self, env):
        return env.db.query(self.get_model(env))

    def get_model(self, env):
        return getattr(env.models, self.config.Model)

    def commit_item_transaction(self, env, item, **kwargs):
        item.has_unpublished_changes = True
        if not item._front_item:
            env.db.flush()
            # XXX it is better to do this automatically on before_insert or
            #     after_insert
            item._create_front_object()
        Stream.commit_item_transaction(self, env, item, **kwargs)

    def url_for(self, env, name=None, **kwargs):
        kwargs.setdefault('version', getattr(env, 'version', None))
        return super(PublishStreamNoState, self).url_for(env, name, **kwargs)


class PublishStream(PublishStreamNoState):

    core_actions = [x for x in Stream.core_actions
                    if x.action not in ('delete', 'item')] + [
           AdminEditItemHandler(),
           DeleteFlagHandler(),
           AdminPublishAction(),
           UnpublishAction(),
           RevertAction(),
        ]

    def item_query(self, env):
        query = super(PublishStream, self).item_query(env)
        Model = self.get_model(env)
        return query.filter(Model.state != Model.DELETED)

