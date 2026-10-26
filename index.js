const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 8080;

function fetchUrl(targetUrl, res, proxyBase) {
  const target = new URL(targetUrl);
  const lib = target.protocol === 'https:' ? https : http;

  const proxy = lib.request({
    hostname: target.hostname,
    port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname + target.search,
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
  }, r => {
    const ct = r.headers['content-type'] || '';
    const isM3u = targetUrl.includes('.m3u') || ct.includes('mpegurl') || ct.includes('octet-stream');

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (isM3u) {
      // Récupère le contenu texte et réécrit les URLs
      let body = '';
      r.setEncoding('utf8');
      r.on('data', chunk => body += chunk);
      r.on('end', () => {
        const base = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
        // Réécrit chaque ligne qui est une URL de segment
        const rewritten = body.split('\n').map(line => {
          line = line.trim();
          if (!line || line.startsWith('#')) return line;
          // Si c'est une URL absolue
          if (line.startsWith('http')) {
            return proxyBase + '/' + encodeURIComponent(line);
          }
          // Si c'est une URL relative
          return proxyBase + '/' + encodeURIComponent(base + line);
        }).join('\n');

        res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl', 'Access-Control-Allow-Origin': '*' });
        res.end(rewritten);
      });
    } else {
      // Segments .ts : proxy direct
      const newHeaders = { ...r.headers, 'Access-Control-Allow-Origin': '*' };
      delete newHeaders['content-encoding'];
      res.writeHead(r.statusCode, newHeaders);
      r.pipe(res);
    }
  });
  proxy.on('error', e => { res.writeHead(502); res.end(e.message); });
  proxy.end();
}

http.createServer((req, res) => {
  const targetUrl = decodeURIComponent(req.url.slice(1));
  if (!targetUrl || !targetUrl.startsWith('http')) {
    res.writeHead(400); res.end('Pas d\'URL'); return;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const proxyBase = 'https://stream-proxy-ti7f.onrender.com';
  fetchUrl(targetUrl, res, proxyBase);
}).listen(PORT);
