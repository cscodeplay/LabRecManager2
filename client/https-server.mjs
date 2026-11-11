import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import net from 'net';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const certDir = path.join(rootDir, 'certs');

const EXTERNAL_PORT = Number(process.env.PORT || 3000);
const NEXT_INTERNAL_PORT = Number(process.env.NEXT_INTERNAL_PORT || 3001);
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 5001);
const CA_HELPER_PORT = Number(process.env.CA_HELPER_PORT || 3080);

const serverKeyPath = path.join(certDir, 'server.key');
const serverCertPath = path.join(certDir, 'server.crt');
const mobileConfigPath = path.join(certDir, 'LabRec-RootCA.mobileconfig');
const rootCerPath = path.join(__dirname, 'native-www', 'labrec-rootCA.cer');
const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');

if (!fs.existsSync(serverKeyPath) || !fs.existsSync(serverCertPath)) {
  console.warn('[https-server] TLS certs not found in certs/; starting plain HTTP Next.js server.');
  const fallback = spawn(process.execPath, [nextBin, 'start', '-H', '0.0.0.0', '-p', String(EXTERNAL_PORT)], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  fallback.on('exit', (code) => process.exit(code ?? 0));
} else {
  const tlsOptions = {
    key: fs.readFileSync(serverKeyPath),
    cert: fs.readFileSync(serverCertPath)
  };

  const nextProc = spawn(process.execPath, [nextBin, 'start', '-H', '127.0.0.1', '-p', String(NEXT_INTERNAL_PORT)], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(NEXT_INTERNAL_PORT) }
  });

  nextProc.on('exit', (code) => {
    console.error(`[https-server] Internal Next.js exited with code ${code}`);
    process.exit(code ?? 1);
  });

  function isBackendPath(url = '/') {
    return (
      url.startsWith('/api/') ||
      url === '/api' ||
      url.startsWith('/socket.io') ||
      url.startsWith('/RAG/') ||
      (url.startsWith('/uploads/') && !url.startsWith('/uploads/audio/'))
    );
  }

  function tryServeCertAsset(req, res) {
    const cleanUrl = (req.url || '/').split('?')[0];
    if (cleanUrl === '/labrec-ca.mobileconfig' && fs.existsSync(mobileConfigPath)) {
      const payload = fs.readFileSync(mobileConfigPath);
      res.writeHead(200, {
        'Content-Type': 'application/x-apple-aspen-config',
        'Content-Disposition': 'attachment; filename="LabRec-RootCA.mobileconfig"',
        'Content-Length': payload.length
      });
      res.end(payload);
      return true;
    }
    if ((cleanUrl === '/labrec-ca.cer' || cleanUrl === '/labrec-ca.crt') && fs.existsSync(rootCerPath)) {
      const payload = fs.readFileSync(rootCerPath);
      res.writeHead(200, {
        'Content-Type': 'application/pkix-cert',
        'Content-Disposition': 'attachment; filename="labrec-rootCA.cer"',
        'Content-Length': payload.length
      });
      res.end(payload);
      return true;
    }
    return false;
  }

  function proxyHttp(req, res) {
    if (tryServeCertAsset(req, res)) return;

    const targetPort = isBackendPath(req.url) ? BACKEND_PORT : NEXT_INTERNAL_PORT;
    const headers = { ...req.headers };
    headers['x-forwarded-proto'] = 'https';
    if (req.headers.host) {
      headers['x-forwarded-host'] = req.headers.host;
    }

    const upstreamReq = http.request(
      {
        hostname: '127.0.0.1',
        port: targetPort,
        path: req.url,
        method: req.method,
        headers
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
        upstreamRes.pipe(res);
      }
    );

    upstreamReq.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      res.end(`Upstream proxy error: ${err.message}`);
    });

    req.pipe(upstreamReq);
  }

  const httpsServer = https.createServer(tlsOptions, proxyHttp);

  httpsServer.on('upgrade', (req, socket, head) => {
    const targetPort = (req.url || '').startsWith('/socket.io') ? BACKEND_PORT : NEXT_INTERNAL_PORT;
    const upstream = net.connect(targetPort, '127.0.0.1', () => {
      let rawHeaders = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        rawHeaders += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
      }
      rawHeaders += 'x-forwarded-proto: https\r\n\r\n';
      upstream.write(rawHeaders);
      if (head && head.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });

    const cleanup = () => {
      upstream.destroy();
      socket.destroy();
    };
    upstream.on('error', cleanup);
    socket.on('error', cleanup);
  });

  httpsServer.listen(EXTERNAL_PORT, '0.0.0.0', () => {
    console.log(`[https-server] HTTPS Frontend + Proxy ready on https://0.0.0.0:${EXTERNAL_PORT} (Next :${NEXT_INTERNAL_PORT}, API :${BACKEND_PORT})`);
  });

  // Companion HTTP helper so Safari on iPad/iOS can install the Root CA profile without an initial cert warning
  const caHelperServer = http.createServer((req, res) => {
    if (tryServeCertAsset(req, res)) return;
    const hostHeader = (req.headers.host || '192.168.1.220').split(':')[0];
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LabRec iPad Camera & HTTPS Trust Setup</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; display: flex; justify-content: center; }
    main { max-width: 520px; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 24px; }
    h1 { font-size: 20px; margin: 0 0 12px; }
    p, li { color: #cbd5e1; line-height: 1.55; font-size: 14px; }
    .btn { display: inline-block; margin-top: 12px; padding: 12px 18px; border-radius: 10px; background: #0d9488; color: #fff; font-weight: 700; text-decoration: none; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>LabRec HTTPS & Camera Trust Setup</h1>
    <p>Install this local Root CA profile on iPadOS so Safari, WebRTC Camera/Microphone, and real-time sync trust your LAN server:</p>
    <a class="btn" href="/labrec-ca.mobileconfig">1. Download & Install CA Profile</a>
    <ol>
      <li>Tap <strong>Allow</strong> when Safari prompts to download the configuration profile.</li>
      <li>Open <strong>Settings → General → VPN &amp; Device Management</strong> and install <em>LabRec Manager Local HTTPS CA</em>.</li>
      <li>Open <strong>Settings → General → About → Certificate Trust Settings</strong> and enable full trust for <em>LabRec Manager Local Root CA</em>.</li>
      <li>Open <a style="color:#5eead4" href="https://${hostHeader}:${EXTERNAL_PORT}">https://${hostHeader}:${EXTERNAL_PORT}</a> or launch <strong>LabRec Whiteboard</strong>.</li>
    </ol>
  </main>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  caHelperServer.listen(CA_HELPER_PORT, '0.0.0.0', () => {
    console.log(`[https-server] CA profile installer ready on http://0.0.0.0:${CA_HELPER_PORT}`);
  });

  const shutdown = () => {
    httpsServer.close();
    caHelperServer.close();
    nextProc.kill('SIGTERM');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
