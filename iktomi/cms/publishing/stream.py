# -*- coding: utf-8 -*-
from iktomi import web
from iktomi.cms.stream_handlers import PrepareItemHandler, EditItemHandler, DeleteItemHandler
from iktomi.cms.stream import Stream
from iktomi.cms.stream_actions import PostAction
from iktomi.cms.flashmessages import flash
from iktomi.utils import cached_property


class FrontPrepareItemHandler(PrepareItemHandler):
    """ Helper handler to fetch item by id field.
    `data` in handler should have `item` attr containts item id.
    """

    def retrieve_item(self, env, item):
        return self.action.stream.front_query(env).filter_by(id=item).first()


class FrontVersionHandler(EditItemHandler):

    action = 'published_version'
    allowed_for_new = False
    title = u'Просмотр опубликованной версии'

    def get_item_form(self, stream, env, item, **kwargs):
        form = stream.config.ItemForm.load_initial(env, item, **kwargs)
        form.model = stream.config.Model._front_model
        return form

    @property
    def app(self):
        return web.match('/<int:item>/published-version', self.action) | \
            web.method('GET', strict=True) | \
            FrontPrepareItemHandler(self) | self

    def publish_allowed(self, env, item=None):
        # XXX
        return self.stream.has_permission(env, 'p')

    def process_item_template_data(self, env, td):
        # Filter buttons
        td['item_buttons'] = []#'unpublish']
        td['actions'] = [x for x in td['actions']
                         if x.action in ('unpublish', 'front_publish')]
        td['front_version'] = True
        return td


class AdminEditItemHandler(EditItemHandler):

    def get_item_form(self, stream, env, item, **kwargs):
        form = stream.config.ItemForm.load_initial(env, item, **kwargs)
        form.model = stream.config.Model
        return form

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
        module_name = env.stream.module_name

        data.item.publish()
        flash(env, u'Объект «%s» опубликован' % data.item, 'success')
        env.db.commit()

        url = env.url_for(module_name + '.item', item=data.item.id)
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


class PublishStreamNoState(Stream):

    core_actions = [x for x in Stream.core_actions
                    if x.action not in ('delete', 'item')] + [
           AdminEditItemHandler(),
           FrontVersionHandler(),
           DeleteFlagHandler(),
           AdminPublishAction(),
           RevertAction(),
        ]

    @cached_property
    def item_template_name(self):
        return getattr(self.config, 'item_template', 'item_publish')

    def front_query(self, env):
        Model = self.config.Model._front_model
        query = env.db.query(Model)
        return query

    def commit_item_transaction(self, env, item):
        item.has_unpublished_changes = True
        if not item._front_item:
            env.db.flush()
            # XXX it is better to do this automatically on before_insert or
            #     after_insert
            item._create_front_object()
        Stream.commit_item_transaction(self, env, item)


class PublishStream(PublishStreamNoState):

    core_actions = [x for x in Stream.core_actions
                    if x.action not in ('delete', 'item')] + [
           AdminEditItemHandler(),
           FrontVersionHandler(),
           DeleteFlagHandler(),
           AdminPublishAction(),
           UnpublishAction(),
           RevertAction(),
        ]

    def item_query(self, env):
        Model = self.config.Model
        query = env.db.query(Model).filter(Model.state != Model.DELETED)
        return query

    def front_query(self, env):
        Model = self.config.Model._front_model
        query = env.db.query(Model).filter(Model.state != Model.DELETED)
        return query
