# -*- coding: utf-8 -*-
import time
import json
from webob import Response
from iktomi import web

@web.request_filter
def flash_message_handler(env, data, nxt):
    env._flash = []
    result = nxt(env, data)
    if hasattr(env, '_flash') and isinstance(result, Response):
        result.set_cookie('flash-msg-%s' % time.time(),
                          json.dumps(env._flash), max_age=120)
    return result


def flash(env, message, category=None):
    # XXX this will not work on errors
    if not hasattr(env, '_flash'):
        env._flash = []
    env._flash.append((unicode(message), category))
