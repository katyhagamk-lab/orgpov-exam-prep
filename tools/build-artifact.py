"""Собирает один самодостаточный файл для публикации приватной ссылкой (dist/artifact.html)."""
import base64, os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(root, p), encoding='utf-8').read()
css = rd('styles.css')
def font(m):
    data = base64.b64encode(open(os.path.join(root, m.group(1)), 'rb').read()).decode()
    return 'url(data:font/woff2;base64,' + data + ')'
css = re.sub(r'url\((fonts/[^)]+)\)', font, css)
html = rd('index.html')
boot = re.search(r'<script>(try\{.*?)</script>', html).group(1)
js = '\n'.join(rd(p) for p in ['data/topics-1.js', 'data/topics-2.js', 'data/topics-3.js', 'data/diagrams.js', 'data/figures.js', 'data/topics-4.js', 'data/explain.js', 'app.js'])
assert '</script' not in js
out = ('<title>Экзамен по оргповедению</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
       '<style>\n' + css + '\n</style>\n<script>' + boot + '</script>\n<div id="app"></div>\n<script>\n' + js + '\n</script>\n')
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
open(os.path.join(root, 'dist', 'artifact.html'), 'w', encoding='utf-8').write(out)
print(len(out))
