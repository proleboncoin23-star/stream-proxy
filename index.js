const http = require('http');
const https = require('https');
const { URL } = require('url');

http.createServer((req, res) => {
  const targetUrl = req.url.slice(1); // l'URL du flux passée en paramètre
  if (!targetUrl || !targetUrl.startsWith('http')) {
    res.writeHead(400); res.end('Pas d\'URL'); return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const target = new URL(decodeURIComponent(targetUrl));
  const lib = target.protocol === 'https:' ? https : http;

  const proxy = lib.request({
    hostname: target.hostname,
    port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname + target.search,
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }, r => {
    res.writeHead(r.statusCode, { ...r.headers, 'Access-Control-Allow-Origin': '*' });
    r.pipe(res);
  });
  proxy.on('error', e => { res.writeHead(502); res.end(e.message); });
  proxy.end();
}).listen(process.env.PORT || 8080);
