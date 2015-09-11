# -*- coding: utf-8 -*-
from iktomi.cms.forms.fields import Field
from iktomi.cms.forms import widgets

__all__ = ['EditorNoteField']


class EditorNoteField(Field):

    permissions = 'r'
    widget = widgets.Widget(template="widgets/editor_notes")

    def get_data(self):
        item = self.form.item
        if item is None or item.id is None:
            return []
        EditorNote = self.model
        env = self.env
        return EditorNote.get_for_item(env.db, env.stream.uid(env, version=False), item)

    @property
    def submit_url(self):
        return self.env.url_for('post_note')
