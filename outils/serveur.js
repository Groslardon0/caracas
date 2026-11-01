// Aperçu local de docs/ : node outils/serveur.js puis http://localhost:8000
const http = require('http');
const fs = require('fs');
const path = require('path');
const racine = path.resolve(__dirname, '../docs');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(racine, p);
  if (!f.startsWith(racine)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': (TYPES[path.extname(f)] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  });
}).listen(8000, () => console.log('http://localhost:8000'));
