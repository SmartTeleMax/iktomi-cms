import json
import requests
from collections import OrderedDict
from sys import argv
import sys

def open_file(fname):
    return json.loads(open(fname).read())

def fetch_descriptions(lang, chars):
    chars = sorted(u''.join([k+v for k, v in chars.items()]))


    catalogs = {}
    result = OrderedDict()
    base_url = "https://raw.githubusercontent.com/unicode-table/unicode-table-data/master/loc/{}/symbols/{}.txt"

    for char in chars:
        o = ord(char)
        catalog_name = "%0.4X" % (o - (o % 256))
        char_code = "%0.4X" % o
        if not catalog_name in catalogs:
            url = base_url.format(lang, catalog_name)
            catalog = requests.get(url).content.splitlines()
            catalog = [l.split(':') for l in catalog if l.strip() and 
                                                        not l.strip().startswith('#') and
                                                        ':' in l]
            catalog = [(l[0].strip(), l[1].strip()) for l in catalog]
            catalog = dict(catalog)
            catalogs[catalog_name] = catalog
        else:
            catalog = catalogs[catalog_name]

        result[char] = catalog.get(char_code, "")
    return result

def print_json(result):
    raw_json = json.dumps(result, indent=1, ensure_ascii=False, encoding='utf8')
    print(raw_json.encode('utf8'))

if __name__ == '__main__':
    if len(argv) != 3 or len(argv[1]) != 2:
        sys.stderr.write("Usage:\n\n    load_unicode_descriptions.py en chars.json\n\n")
        exit(1)
    chars = open_file(argv[2])
    result = fetch_descriptions(argv[1], chars)
    print_json(result)


