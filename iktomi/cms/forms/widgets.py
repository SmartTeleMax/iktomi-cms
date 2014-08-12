# -*- coding: utf-8 -*-
from iktomi.forms.widgets_json import *
from iktomi.forms import widgets_json as widgets

from datetime import datetime
from iktomi.cms.forms import convs
from iktomi.utils import cached_property
import json

class WysiHtml5(Widget):

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

    def render(self):
        return dict(super(Select, self).render(),
                    parserRules=self.parser_rules,
                    stylesheets=self.stylesheets,
                    allowed_elements=self.allowed_elements,
                    buttons=self.real_buttons)

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
        return data

    def get_options(self, value):
        options = []
        values = self.field.clean_value
        if not self.multiple:
            values = [values]

        for value in values:
            options.append(dict(value=unicode(value),
                                title=label,
                                html=self.item_row(value)))
        return options

    def render(self):
        return dict(Widget.render(self),
                    options=this.get_options(self.field.clean_value),
                    **self.js_config())


class PopupFilteredSelect(Select):

    open_btn_text = u'Выбрать'
    disable_unpublished = False

    def get_options(self, value):
        options = []
        choice_conv = self.field.conv
        if isinstance(choice_conv, convs.ListOf):
            choice_conv = choice_conv.conv
        assert isinstance(choice_conv, convs.EnumChoice)

        for choice, label in choice_conv.options():
            options.append(dict(value=unicode(choice),
                                title=label,
                                public=getattr(choice, 'public', True)))
        return options

    def render(self):
        return dict(Select.render(self),
                    disable_unpublished=self.disable_unpublished,
                    open_btn_text=self.open_btn_text)


class TabSelect(Select):

    inject_to = 'list_tabs'

    def render(self):
        return dict(Widget.render(self),
                    inject_to=self.inject_to)


class LabelSelect(Select):

    hiddens = [] # hide these options if they are not set

    def render(self):
        return dict(Widget.render(self),
                    hiddens=self.hiddens)


class AjaxFileInput(FileInput):

    upload_url = None

    def js_config(self):
        return {'input': self.id,
                'error': self.field.error,
                'upload_url': self.upload_url,
                'value': self.field.clean_value}

    def render(self):
        return dict(Widget.render(self),
                    **self.js_config())


class Calendar(TextInput):

    classname = 'calendar'

    @cached_property
    def size(self):
        return len(self.field.from_python(datetime(1999, 12, 31)))+1

    def render(self):
        return dict(Widget.render(self),
                    size=self.size)


class FieldBlockWidget(widgets.FieldBlockWidget):

    classname = 'collapsable'
    closed = False

