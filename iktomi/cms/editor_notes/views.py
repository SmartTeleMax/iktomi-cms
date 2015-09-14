# -*- coding: utf-8 -*-
from iktomi import web
from iktomi.cms.forms import Form, convs
from iktomi.cms.forms.fields import Field, object_ref_fields


class PostNote(web.WebHandler):

    def __init__(self, model):
        self.model = model
        class EditorNoteForm(Form):

            fields = object_ref_fields + [
                Field('body',
                      conv=convs.Char(required=True)),
            ]
        self.EditorNoteForm = EditorNoteForm

    def post_note(self, env, data):
        form = self.EditorNoteForm(env)
        if not form.accept(env.request.POST):
            return env.json({'success': False})
        note = self.model(editor=env.user,
                          **form.python_data)
        env.db.add(note)
        env.db.commit()
        return env.json({'success': True})
    __call__ = post_note

