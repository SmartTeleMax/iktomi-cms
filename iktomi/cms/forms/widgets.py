# -*- coding: utf-8 -*-
from iktomi.forms.widgets_json import *
from iktomi.forms import widgets_json as widgets

from datetime import datetime
from iktomi.cms.forms import convs
from iktomi.utils import cached_property
from iktomi.cms.models.edit_log import make_diff
from lxml.html.diff import htmldiff
import json

class _LazyHtmlDiff(object):
    def __init__(self, value1, value2):
        self.value1, self.value2 = value1, value2

    @cached_property
    def value(self):
        return htmldiff(self.value1, self.value2)


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
        return dict(super(WysiHtml5, self).render(),
                    parserRules=self.parser_rules,
                    stylesheets=self.stylesheets,
                    allowed_elements=list(self.allowed_elements),
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

    def prepare_data(self):
        return dict(Widget.prepare_data(self),
                    js_config=self.js_config)

    def render_as_diff(self, diff, marker):
        '''
        Renders widget to template
        '''
        data = self.prepare_data()
        data['value'] = diff
        rev_marker = 'ins' if marker == 'del' else 'del'
        parser_rules = dict(self.parser_rules)
        parser_rules['tags'] = dict(self.parser_rules['tags'],
                            **{rev_marker: {'remove': 1},
                               marker: {}})
        data['js_config'] = json.dumps({'parserRules': parser_rules,
                                        'stylesheets': self.stylesheets})
        if self.field.readable:
            return self.env.template.render(self.template, **data)
        return ''

    @staticmethod
    def get_diff(field1, field2):
        data1 = field1.conv.from_python(field1.clean_value)
        data2 = field2.conv.from_python(field2.clean_value)

        if field1 is None or field2 is None:
            if data1 != data2:
                return make_diff(field1, field2,
                                 changed=True)
        elif data1 != data2:
            diff = _LazyHtmlDiff(data1, data2)
            before=lambda: field1.widget.render_as_diff(diff.value, 'del')
            after=lambda: field2.widget.render_as_diff(diff.value, 'ins')
            return dict(label=field1.label or field1.name,
                        name=field1.name,
                        before=before,
                        after=after,
                        changed=True)



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

    def item_row(self, item):
        return self.stream.list_action.render_item_row(self.env, item)

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
            'allow_delete': self.allow_delete,
            'allow_create': self.allow_create,
            'allow_select': self.allow_select,
            'sortable': self.sortable,
            'unshift': self.unshift,
            'open_btn_text': self.open_btn_text,
            'create_btn_text': self.create_btn_text,
        }
        if self.rel is not None:
            data['rel'] = self.rel
        if self.allow_create:
            data['create_url'] = self.create_url
        return data

    def get_options(self):
        options = {}
        values = self.field.clean_value
        if not self.multiple:
            values = [values]

        for value in values:
            # XXX
            if value is not None:
                options[str(value.id)] = unicode(self.item_row(value))
        return options

    @cached_property
    def show_create_button(self):
        return self.allow_create and self.stream.has_permission(self.env, 'c')

    def render(self):
        return dict(Widget.render(self),
                    row_by_value=self.get_options(),
                    **self.js_config())


class PopupFilteredSelect(Select):

    open_btn_text = u'Выбрать'
    disable_unpublished = False

    def get_options(self):
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
        return dict(Select.render(self),
                    hiddens=self.hiddens)


class AjaxFileInput(FileInput):

    upload_url = None

    def js_config(self):
        return {'input': self.id,
                'error': self.field.error,
                'upload_url': self.upload_url,
                'value': self.field.clean_value}

    def render(self):
        result =  dict(Widget.render(self),
                       **self.js_config())
        file = result['value']
        result['value'] = self.field.get_data()
        if file is not None:
            result['default_url'] = file.url
        return result


class Calendar(TextInput):

    classname = 'calendar'
    js_block = 'calendar'

    @cached_property
    def size(self):
        return len(self.field.conv.from_python(datetime(1999, 12, 31)))+1

    def render(self):
        return dict(Widget.render(self),
                    size=self.size)


class CollapsableFieldBlock(widgets.FieldBlockWidget):

    classname = 'collapsable'
    closed = False
    title_selectors=''
    open_with_data = False
    renders_hint = True

    def render(self):
        return dict(widgets.FieldBlockWidget.render(self),
                    closed=self.closed,
                    title=self.field.title,
                    title_selectors=self.title_selectors,
                    open_with_data=self.open_with_data)



class FieldSetWidget(widgets.FieldSetWidget):
    js_block = None
