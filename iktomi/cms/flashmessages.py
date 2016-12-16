# -*- coding: utf-8 -*-
from iktomi import web
from iktomi.utils.deprecation import deprecated


@web.request_filter
@deprecated('Flash messages are rendered in templates and JSON now')
def flash_message_handler(env, data, nxt):
    return nxt(env, data)


def flash(env, message, category=None, unique=True):
    # XXX this will not work on errors
    if not hasattr(env, '_flash'):
        env._flash = []
    value = (unicode(message), category)
    if not unique or value not in env._flash:
        env._flash.append(value)
