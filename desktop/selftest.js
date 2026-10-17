// Self-test de la app Electron (no forma parte de la entrega).
// Verifica que la ventana cargue la app, que IndexedDB funcione en el
// origen local y que los assets/íconos se sirvan bien.
const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const WEB = path.join(__dirname, 'web');
const PORT = 43699;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent((req.url || '/').split('?')[0]);
      if (p === '/' || p === '') p = '/index.html';
      const file = path.join(WEB, path.normalize(p).replace(/^([/\\]|\.\.[/\\])+/, ''));
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end('nf'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

const results = [];
const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (extra ? '  :: ' + extra : '')); };

app.whenReady().then(async () => {
  await startServer();
  const win = new BrowserWindow({ show: false, width: 1320, height: 880, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  const errors = [];
  win.webContents.on('console-message', (_e, level, msg) => { if (level >= 2) errors.push(msg); });
  win.webContents.on('did-fail-load', (_e, code, desc) => errors.push('did-fail-load ' + code + ' ' + desc));

  await win.loadURL('http://127.0.0.1:' + PORT + '/index.html');
  await new Promise(r => setTimeout(r, 2000));

  const js = s => win.webContents.executeJavaScript(s, true);

  check('Ventana carga la app (sidebar presente)', await js('!!document.querySelector(\'[data-nav="dashboard"]\')'));
  check('Assets locales (CSS cargado)', await js('getComputedStyle(document.querySelector(".sidebar")).display !== "inline"'));
  const icon = await js(`(async()=>{const s=document.createElement('span');s.className='material-symbols-outlined';s.textContent='pets';s.style.position='absolute';document.body.appendChild(s);await document.fonts.ready;const w=s.getBoundingClientRect().width;document.body.removeChild(s);return w;})()`);
  check('Fuente de iconos', icon > 5 && icon < 45, 'ancho=' + icon + 'px');
  const logoOk = await js(`(async()=>{const i=document.querySelector('.brand-logo-img');if(!i)return false;if(!i.complete){await new Promise(r=>{i.onload=r;i.onerror=r;});}return i.naturalWidth>0;})()`);
  check('Logo de marca cargado', logoOk);
  const dbOk = await js(`(async()=>{const p=await DB.getAllPatients();await DB.addPatient({id:'T1',name:'Test Electron',ownerName:'X'});const p2=await DB.getAllPatients();await DB.deletePatient('T1');return p2.length>p.length;})()`);
  check('IndexedDB escribe/lee en el origen local', dbOk);

  check('Sin errores de consola', errors.length === 0, errors.slice(0, 3).join(' | '));

  const failed = results.filter(r => !r).length;
  console.log('\n== Electron self-test: ' + (results.length - failed) + '/' + results.length + ' OK ==');
  app.exit(failed ? 1 : 0);
}).catch(e => { console.error('ERROR', e); app.exit(2); });
