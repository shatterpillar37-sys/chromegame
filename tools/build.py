#!/usr/bin/env python3
"""Bundle the game into one self-contained HTML file.

  python3 tools/build.py            -> dist/sneakers-otoole.html  (download it, open it in Chrome, plays offline)
  python3 tools/build.py --body OUT -> page body only, for hosts that supply their own <html>/<head> wrapper
"""
import base64, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def data_uri(p, mime):
    with open(os.path.join(ROOT, p), 'rb') as f:
        return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode())


def build(body_only=False):
    html = read('index.html')
    css = read('css/game.css')
    scripts = re.findall(r'<script src="([^"]+)"></script>', html)
    js = '\n'.join('/* %s */\n%s' % (s, read(s)) for s in scripts)
    imgs = {p: data_uri(p, 'image/png') for p in ('img/otoole-stand.png', 'img/otoole-walk.png', 'img/otoole-no.png')}
    body = re.search(r'<!--BODY-->(.*)<!--/BODY-->', html, re.S).group(1)
    for p, uri in imgs.items():
        body = body.replace(p, uri)
        js = js.replace("'" + p + "'", "'" + uri + "'").replace('"' + p + '"', '"' + uri + '"').replace('src="' + p, 'src="' + uri)
    js = js.replace('</script>', '<\\/script>')
    fonts = re.search(r'<link rel="stylesheet" href="(https://fonts[^"]+)">', html).group(1)
    if body_only:
        return ('<title>Sneakers O\'Toole</title>\n<link rel="stylesheet" href="%s">\n<style>\n%s\n</style>\n%s\n<script>\n%s\n</script>\n'
                % (fonts, css, body, js))
    head = re.search(r'<head>(.*)</head>', html, re.S).group(1)
    head = re.sub(r'<link rel="stylesheet" href="css/game.css">', '<style>\n' + css + '\n</style>', head)
    head = re.sub(r'<link rel="manifest"[^>]*>\n?', '', head)
    head = head.replace('href="icon.svg"', 'href="%s"' % data_uri('icon.svg', 'image/svg+xml'))
    return '<!doctype html>\n<html lang="en">\n<head>%s</head>\n<body>\n%s\n<script>\n%s\n</script>\n</body>\n</html>\n' % (head, body, js)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--body':
        out = sys.argv[2]
        open(out, 'w', encoding='utf-8').write(build(True))
    else:
        os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
        out = os.path.join(ROOT, 'dist', 'sneakers-otoole.html')
        open(out, 'w', encoding='utf-8').write(build())
    print('wrote', out, '(%d KB)' % (os.path.getsize(out) // 1024))
