# -*- coding: utf-8 -*-
from webob.exc import HTTPNotFound
from iktomi import web
from iktomi.cms.stream_handlers import PrepareItemHandler
#from iktomi.unstable.db.sqla.replication import replicate_attributes
from iktomi.cms.publishing.stream import PublishItemHandler, \
        PublishStreamNoState, PublishStream
from iktomi.cms.stream import Stream
from iktomi.cms.forms import convs
from iktomi.utils import cached_property
from iktomi.forms.form_json import Form, FieldSet, FieldList, FieldBlock

class PrepareI18nItemHandler(PrepareItemHandler):

    def prepare_item_handler(self, env, data):
        # XXX Dirty hack to support object creation
        env.absent_items = True
        return PrepareItemHandler.__call__(self, env, data)
    __call__ = prepare_item_handler


class I18nItemHandler(PublishItemHandler):

    # XXX turn off autosave or make it save to DraftForm only?

    PrepareItemHandler = PrepareI18nItemHandler

    def drop_field_on_i18n(self, field):
        return field and (isinstance(field.conv, convs.Char) or
                          field.name == 'id')

    def clean_field(self, field):
        if isinstance(field, FieldSet) or isinstance(field, FieldBlock):
            for subfield in field.fields:
                self.clean_field(subfield)

        if isinstance(field, FieldList):
            subfields_values = []
            for index in field.python_data:
                subfield = field.field(name=str(index))
                self.clean_field(subfield)
                value = {'_key':str(index)}
                value.update(subfield.get_data())
                subfields_values.append(value)
            field.accept([]) # Hack to clean old python_data
            field.accept(subfields_values)

        if hasattr(field, 'clean_value'):
            value = field.clean_value
            if hasattr(value, 'state') and value.state in (value.ABSENT, value.DELETED):
                field.accept(field._null_value)
        if self.drop_field_on_i18n(field):
            field.accept(field.get_initial())
        if isinstance(field.conv, convs.ListOf):
            to_accept = []
            for raw_value in field.get_data()[field.name]:
                value = field.conv.accept([raw_value])[0]
                if hasattr(value, 'state'):
                    if value.state not in (value.ABSENT, value.DELETED):
                        to_accept.append(raw_value)
                else:
                    if value and not isinstance(value, basestring):
                        to_accept.append(raw_value)
            field.accept(to_accept)

    def clean_form(self, form):
        for subfield in form.fields:
            self.clean_field(subfield)

    def get_item_form(self, stream, env, item, initial, draft=None):
        if item.state not in (item.ABSENT, item.DELETED):
            return PublishItemHandler.get_item_form(
                    self, stream, env, item, initial, draft)

        # XXX this method looks hacky
        # Get existing language version and fill the form with object reflection
        # to current language model
        for lang in item.models.langs:
            # XXX item.models is not an interface
            if lang == item.models.lang:
                continue
            source_item = item._item_version('admin', lang)
            if source_item and \
                    source_item.state not in (item.ABSENT, item.DELETED):
                break
        else:
            # The item has been deleted on all language versions, creation is
            # not allowed
            raise HTTPNotFound

        # hack do get initial value for form from source item
        source_form = PublishItemHandler.get_item_form(
                    self, stream, env, source_item, initial, draft)
        form = PublishItemHandler.get_item_form(
                self, stream, env, item, initial, draft)
        form.accept(source_form.get_data())
        self.clean_form(form)
        return form

    def process_item_template_data(self, env, td):
        item = td['item']
        if item.state in (item.ABSENT, item.DELETED):
            td['title'] = u'Создание языковой версии объекта'
        return PublishItemHandler.process_item_template_data(self, env, td)


class I18nStreamMixin(object):

    langs = [('ru', u'Русский'),
             ('en', u'Английский')]

    @cached_property
    def langs_dict(self):
        return dict(self.langs)

    # If any item in one language have a pair in other language
    # Basically, if it is instance of iktomi.cms.publishing.model.WithLanguage
    items_are_i18n = True

    list_base_template = 'lang_publish_stream.html'

    def uid(self, env, version=True):
        # Attention! Be careful!
        # Do not change format of uid unless you are sure it will not
        # brake tray views, where stream_name and language are parsed out
        # from the uid
        if version:
            return self.module_name + ':version=' + env.version + ':lang=' + env.lang
        return self.module_name + ':lang=' + env.lang

    @property
    def prefix_handler(self):
        @web.request_filter
        def set_models(env, data, nxt):
            #assert data.version in self.versions_dict.keys()
            env.models = getattr(env.models, data.version)
            env.models = getattr(env.models, data.lang)
            env.version = data.version
            env.lang = data.lang
            return nxt(env, data)

        version_prefix = web.prefix('/<any("%s"):version>' % \
                                     ('","'.join(self.versions_dict.keys())))
        lang_prefix = web.prefix('/<any("%s"):lang>' % \
                                     ('","'.join(self.langs_dict.keys())))
        #return version_prefix | set_models | \
        return super(PublishStreamNoState, self).prefix_handler |\
               version_prefix | lang_prefix | set_models

    def url_for(self, env, name=None, **kwargs):
        kwargs.setdefault('version', getattr(env, 'version', None) or self.versions[0][0])
        kwargs.setdefault('lang', getattr(env, 'lang', None) or self.langs[0][0])
        return Stream.url_for(self, env, name, **kwargs)


class I18nPublishStreamNoState(I18nStreamMixin, PublishStreamNoState):
    pass


class I18nPublishStream(I18nStreamMixin, PublishStream):

    actions = [x for x in PublishStream.actions
                    if x.action != 'item'] + [
        I18nItemHandler(),
    ]

