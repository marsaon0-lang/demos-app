import pathlib
root = pathlib.Path(__file__).parent
src = root/'src'
css = (src/'styles.css').read_text(encoding='utf-8')
js = '\n'.join((src/f).read_text(encoding='utf-8') for f in ['data.js','art.js','app.js'])
def page(tg):
    return f'''<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<title>DEMOS</title>
<meta name="theme-color" content="#11151F">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Unbounded:wght@900&display=swap" rel="stylesheet">
{'<script src="https://telegram.org/js/telegram-web-app.js"></script>' if tg else ''}
<style>{css}</style></head>
<body><div id="app"></div>
<script>{js}</script></body></html>'''
(root/'dist').mkdir(exist_ok=True)
(root/'dist'/'index.html').write_text(page(True), encoding='utf-8')
(root/'dist'/'preview.html').write_text(page(False), encoding='utf-8')
art = f'''<title>DEMOS · Mini App</title>
<meta name="theme-color" content="#11151F">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Unbounded:wght@900&display=swap" rel="stylesheet">
<style>{css}</style>
<div id="app"></div>
<script>{js}</script>'''
(root/'dist'/'artifact.html').write_text(art, encoding='utf-8')
print('ok', len(page(False)))
