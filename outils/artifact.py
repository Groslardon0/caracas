# Génère build/index.html (sans doctype/head/body) pour la publication Artifact claude.ai.
import re, pathlib
racine = pathlib.Path(__file__).resolve().parent.parent
s = (racine / 'docs/index.html').read_text(encoding='utf-8')
head = re.search(r'<head>(.*?)</head>', s, re.S).group(1)
head = re.sub(r'<meta (charset|name="viewport")[^>]*>\n?', '', head)
body = re.search(r'<body>(.*?)</body>', s, re.S).group(1)
(racine / 'build').mkdir(exist_ok=True)
(racine / 'build/index.html').write_text(head.strip() + '\n' + body, encoding='utf-8')
print('build/index.html prêt')
