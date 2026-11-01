// Génère build/index.html (sans doctype/head/body) pour la publication Artifact claude.ai. Équivalent Node de artifact.py.
const fs = require('fs');
const path = require('path');
const racine = path.resolve(__dirname, '..');
const s = fs.readFileSync(path.join(racine, 'docs/index.html'), 'utf8');
let head = s.match(/<head>([\s\S]*?)<\/head>/)[1];
head = head.replace(/<meta (charset|name="viewport")[^>]*>\n?/g, '');
const body = s.match(/<body>([\s\S]*?)<\/body>/)[1];
fs.mkdirSync(path.join(racine, 'build'), { recursive: true });
fs.writeFileSync(path.join(racine, 'build/index.html'), head.trim() + '\n' + body, 'utf8');
console.log('build/index.html prêt');
