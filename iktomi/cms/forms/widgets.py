# -*- coding: utf-8 -*-
from iktomi.forms.widgets import *
from iktomi.forms import widgets

from datetime import datetime
from iktomi.cms.forms import convs
from iktomi.utils import cached_property
import json

class WysiHtml5(Widget):

    template = 'widgets/wysihtml5'

    button_blocks = [
        ('inline', ['bold', 'italic', 'underline']),
        ('block', ['headings', 'sup', 'sub', 'blockquote']),
        ('lists', ['insertunorderedlist', 'insertorderedlist',
                   'outdent', 'indent']),
        ('advanced', ['createLink', 'insertImage', 'table', 'extrachars']),
        ('history', ['undo', 'redo']),
        ('html', ['html']),
    ]

    BUTTON_TAGS = (
        ('bold', 'b'),
        ('italic', 'i'),
        ('underline', 'u'),
        ('sup', 'sup'),
        ('sub', 'sub'),
        ('blockquote', 'blockquote'),
        ('insertunorderedlist', ('ul', 'li')),
        ('insertorderedlist', ('ol', 'li')),
        ('outdent', ('ul', 'li')),
        ('indent', ('ul', 'li')),
        ('outdent', ('ol', 'li')),
        ('indent', ('ol', 'li')),

        ('createLink', 'a'),
        ('insertImage', 'img'),

        ('table', ('table', 'td', 'tr')),

        ('headings', 'h1'),
        ('headings', 'h2'),
        ('headings', 'h3'),
        ('headings', 'h4'),
        ('h1', 'h1'),
        ('h2', 'h2'),
        ('h3', 'h3'),
        ('h4', 'h4'),
        ('aside', 'aside'),
    )

    stylesheets = ("/static/css/wysihtml5-content.css",)

    @cached_property
    def js_config(self):
        return json.dumps({'parserRules': self.parser_rules,
                           'stylesheets': self.stylesheets})

    @cached_property
    def parser_rules(self):
        rules = {}
        attrs = {}
        for attr in self.html_conv.allowed_attributes:
            attrs[attr] = 'none'
        for tag in self.html_conv.allowed_elements:
            rules[tag] = {'check_attributes': attrs}

        if 'b' in rules and not 'strong' in rules:
            rules['strong']  = {'rename_tag': 'b'}
        if 'strong' in rules and not 'b' in rules:
            rules['b']  = {'rename_tag': 'strong'}
        if 'em' in rules and not 'i' in rules:
            rules['i']  = {'rename_tag': 'em'}
        if 'i' in rules and not 'em' in rules:
            rules['em']  = {'rename_tag': 'i'}
        return {'tags': rules}

    @cached_property
    def html_conv(self):
        html_conv = self.field.conv
        if isinstance(html_conv, convs.ListOf):
            html_conv = html_conv.conv
        assert isinstance(html_conv, convs.Html)
        return html_conv

    @cached_property
    def allowed_elements(self):
        return set(self.html_conv.allowed_elements)

    @cached_property
    def real_buttons(self):
        buttons = set()
        tag_buttons = set()
        for button, tags in self.BUTTON_TAGS:
            tag_buttons.add(button)
            tags = [tags] if isinstance(tags, basestring) else tags
            if not (set(tags) - self.allowed_elements):
                buttons.add(button)
        all_btns = set(sum(dict(self.button_blocks).values(), []))
        allowed = (set(all_btns) - tag_buttons) | buttons
        buttons = [[btn for btn in btns if btn in allowed]
                   for name, btns in self.button_blocks]
        return filter(None, buttons)

    def has_button(self, button):
        return button in self.real_buttons

    def remove_buttons(self, remove_buttons):
        buttons = [
                (name, [btn for btn in btns 
                        if btn not in remove_buttons])
                for name, btns in self.button_blocks]
        buttons = filter(lambda x: x[1], buttons)
        return self(button_blocks=buttons)

    def add_buttons(self, buttons):
        button_blocks = [
                (name, [btn for btn in btns if btn not in buttons])
                for name, btns in self.button_blocks]
        buttons_dict = dict(button_blocks)
        for name, btns in buttons:
            if name in buttons_dict:
                buttons_dict[name] += btns
            else:
                button_blocks.append((name, btns))
        return self(button_blocks=button_blocks)


class PopupStreamSelect(Select):

    _obsolete = Select._obsolete | frozenset(['reorderable'])

    template = 'widgets/popup_stream_select'
    open_btn_text = u'Выбрать'
    create_btn_text = u'Создать'
    allow_create = False
    allow_select = True
    allow_delete = True
    sortable = True
    select_all_button = True
    unshift = False
    default_filters = {}
    rel = None # set rel="popup" to open and edit the item in popup

    @cached_property
    def default_create_filters(self):
        return self.default_filters

    @cached_property
    def stream(self):
        return self.env.streams[self.stream_name]

    def render_row_template(self, **data):
        return self.env.render_to_string(self.stream.row_template_name,
                                         **dict(self.stream.template_data, **data))

    def item_row(self, item, row_cls=''):
        url = self.stream.url_for(self.env, 'item', item=item.id)
        read_allowed=self.stream.has_permission(self.env, 'r')
        return self.render_row_template(stream=self.stream,
                                        item=item,
                                        list_fields=self.list_fields,
                                        read_allowed=read_allowed,
                                        url=url, row_cls=row_cls)

    @cached_property
    def list_fields(self):
        return self.stream.list_fields

    @cached_property
    def create_url(self):
        return self.stream.url_for(self.env, 'item', item=None)\
                          .qs_set(self.default_create_filters)

    def js_config(self):
        data = {
            'url': self.stream.url_for(self.env).qs_set(self.default_filters),
            'title': self.stream.title,
            'container': self.id,
            'input_name': self.input_name,
            'allow_delete': self.allow_delete,
            'sortable': self.sortable,
            'unshift': self.unshift,
        }
        if self.rel is not None:
            data['rel'] = self.rel
        if self.allow_create:
            data['create_url'] = self.create_url
        return json.dumps(data) # XXX escape_js

    def get_options(self, value):
        choice_conv = self.field.conv
        if isinstance(choice_conv, convs.ListOf):
            choice_conv = choice_conv.conv
        assert isinstance(choice_conv, convs.EnumChoice)

        values = value if self.multiple else [value]
        values = filter(None, map(choice_conv.to_python, values))
        return values


class PopupFilteredSelect(Select):

    template = 'widgets/popup_filtered_select'
    open_btn_text = u'Выбрать'
    disable_unpublished = False

    def get_options(self, value):
        options = []
        # XXX ugly
        choice_conv = self.field.conv
        if isinstance(choice_conv, convs.ListOf):
            choice_conv = choice_conv.conv
        assert isinstance(choice_conv, convs.EnumChoice)

        values = value if self.multiple else [value]
        values = map(unicode, values)
        for choice, label in choice_conv.options():
            choice = unicode(choice)
            options.append(dict(value=choice,
                                title=label,
                                selected=(choice in values)))
        return options

    def js_config(self):
        return json.dumps({
            'multiple': self.multiple,
            'required': self.field.conv.required,
            'disable_unpublished': self.disable_unpublished,
        })


class TabSelect(Select):

    template = 'widgets/tab_select'
    inject_to = 'list_tabs'

    def js_config(self):
        return json.dumps(dict(
            getattr(self, 'js_conf', {}),
            inject_to=self.inject_to
        ))


class LabelSelect(Select):

    template = 'widgets/label_select'
    hiddens = [] # hide these options if they are not set


class AjaxFileInput(FileInput):

    template = 'widgets/ajax_fileinput'
    upload_url = None

    def js_config(self):
        conf = {'input': self.id,
                'error': self.field.error,
                'upload_url': self.upload_url,
                'value': self.field.clean_value}

        # XXX copy-paste from old code. Should be replaced with better alternative after new uploading api stabilization.
        if self.field.clean_value is not None:
            conf['is_value_persistent'] = self.field.clean_value.mode == 'existing'
        return json.dumps(conf)


class Calendar(TextInput):

    template = 'widgets/calendar'
    classname = 'calendar'

    @cached_property
    def size(self):
        return len(self.field.from_python(datetime(1999, 12, 31)))+1


class FieldBlockWidget(widgets.FieldBlockWidget):
    """
    If FieldBlock needs to be collapsed by default,
    pass `closed=True` to the widget::

        FieldBlock('name',
                   fields=[..],
                   widget=FieldBlock.widget(closed=True))
    """

    classname = 'collapsable'
    template = 'widgets/collapsable_block'
    renders_hint = True
    closed = False

