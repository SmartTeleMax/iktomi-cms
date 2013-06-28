from iktomi.forms.widgets import *
from iktomi.utils import cached_property
import json

class WysiHtml5(Widget):

    template = 'widgets/wysihtml5'

    buttons = frozenset(['bold', 'italic', 'underline', 'sup', 'sub',
                         'blockquote', 'insertunorderedlist',
                         'insertorderedlist', 'outdent', 'indent',
                         'createLink', 'insertImage', 'fileLink', 'personLink',
                         'table', 'extrachars', 'html',
                         'headings', 'h1', 'h2', 'h3', 'h4', 'aside'])

    media = FormMedia([FormJSRef('wysihtml5-0.4.0pre.js'),
                       FormJSRef('wysihtml5-block.js'),
                       FormJSRef('wysihtml5-table.js'),
                       FormCSSRef('wysihtml5.css'),
                       FormJSRef('popup_stream_select.js'),
                       FormJSRef('calendar.compat.js')])

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
        ('fileLink', 'abbr'),
        ('personLink', 'abbr'),

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

    @cached_property
    def js_config(self):
        return json.dumps({'parserRules': self.parser_rules})

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
    def real_buttons(self):
        conv_tags = set(self.html_conv.allowed_elements)

        buttons = set()
        tag_buttons = set()
        for button, tags in self.BUTTON_TAGS:
            tag_buttons.add(button)
            if button in self.buttons:
                tags = [tags] if isinstance(tags, basestring) else tags
                if not (set(tags) - conv_tags):
                    buttons.add(button)
        return (self.buttons - tag_buttons) | buttons

    def has_button(self, button):
        return button in self.real_buttons

    def block_exists(self, *buttons):
        return self.real_buttons & set(buttons)


