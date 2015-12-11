# -*- coding: utf-8 -*-
import time
import json
from webob import Response
from iktomi import web


def set_flash_cookies(env, result):
    if getattr(env, '_flash', None) and isinstance(result, Response):
        result.set_cookie('flash-msg-%s' % time.time(),
                          json.dumps(env._flash), max_age=120)
    return result


@web.request_filter
def flash_message_handler(env, data, nxt):
    env._flash = []
    result = nxt(env, data)
    return set_flash_cookies(env, result)


def flash(env, message, category=None, unique=True):
    # XXX this will not work on errors
    if not hasattr(env, '_flash'):
        env._flash = []
    value = (unicode(message), category)
    if not unique or value not in env._flash:
        env._flash.append(value)
