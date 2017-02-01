# -*- coding: utf-8 -*-
import os
import logging
from jinja2 import Markup

logger = logging.getLogger(__name__)


class HelpLoader(object):
    '''
    Helploader is needed to
      1. Load help messages from directory with help templates.
           `helploader = HelpLoader("path/to/help/messages").`
      2. Retrieving help messages with get_help method.
         It is supposed to add get_help message to your Environment:
           `
           class Environment(BasicEnvironment):
               get_help = helploader.get_help
           `
         Calling get_help requires 2 parameters: key and category.
         Key is the name of the element on screen.
         Category means part of the interface, where element is located.
         For example, when get_help is called this way:
               `get_help('streams/docs/ItemForm/title', 'ItemForm')`
         helploader tries to get help-messages from
         `streams/docs/ItemForm/title.html` if if it exists, and, if not,
         from `ItemForm.default/title.html`, where `ItemForm.default` is
         default directory for messages with `ItemForm` category.
         Structure of help directory:
           `
           /..
           /Category_name.default/*.html - all default mesages for Category_name
           /streams/stream_module_name/Stream_category/*.html - specific messages for stream_module_name stream
           `
    '''
    help_messages = {}
    default_help_messages = {}

    def __init__(self, template_root):
        self.template_root = template_root
        self.load_help()

    def load_default_help(self, dirname):
        dirpath = os.path.join(self.template_root, dirname)
        messages = {}
        for filename in os.listdir(dirpath):
            if filename.startswith("."):
                continue
            filepath = os.path.join(self.template_root, dirname, filename)
            with open(filepath) as f:
                helpkey, _ = os.path.splitext(filename)
                messages[helpkey] = f.read().decode('utf8')
        category, _ = os.path.splitext(dirname)
        self.default_help_messages[category] = messages

    def load_help(self):
        if not os.path.exists(self.template_root):
            logger.warning("Help-dir %s not exists!", self.template_root)
            return {}

        for root, dirs, files in os.walk(self.template_root):
            if root == self.template_root:
                for dirname in dirs:
                    if dirname.endswith("default"):
                        self.load_default_help(dirname)
            if files:
                for filename in files:
                    if filename.startswith("."):
                        continue
                    template_name = os.path.join(root[len(self.template_root):], filename)
                    filepath = os.path.join(root, filename)
                    helpkey, _ = os.path.splitext(template_name)
                    with open(filepath) as f:
                        self.help_messages[helpkey.lstrip("/")] = f.read().decode('utf8')

    def get_help(self, key, category='Global'):
        html = self.help_messages.get(key, '')
        if html is '':
            key = key.split('/')[-1]
            html = self.default_help_messages.get(category, {}).get(key, '')
        return Markup(html)
