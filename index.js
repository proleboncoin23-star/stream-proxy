const http = require('http');
const https = require('https');
const { URL } = require('url');

http.createServer((req, res) => {
  const targetUrl = decodeURIComponent(req.url.slice(1));
  if (!targetUrl || !targetUrl.startsWith('http')) {
    res.writeHead(400); res.end('Pas d\'URL'); return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const target = new URL(targetUrl);
  const lib = target.protocol === 'https:' ? https : http;

  const proxy = lib.request({
    hostname: target.hostname,
    port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname + target.search,
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
  }, r => {
    // Force le Content-Type HLS pour que le navigateur ne télécharge pas
    const ct = r.headers['content-type'] || '';
    const isM3u = targetUrl.includes('.m3u') || ct.includes('mpegurl') || ct.includes('octet-stream');
    const newHeaders = {
      ...r.headers,
      'Access-Control-Allow-Origin': '*',
      'Content-Type': isM3u ? 'application/vnd.apple.mpegurl' : (ct || 'application/octet-stream'),
      'Content-Disposition': 'inline',
    };
    delete newHeaders['content-encoding'];
    res.writeHead(r.statusCode, newHeaders);
    r.pipe(res);
  });
  proxy.on('error', e => { res.writeHead(502); res.end(e.message); });
  proxy.end();
}).listen(process.env.PORT || 8080);
