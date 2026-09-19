import http from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../',import.meta.url));
const root = path.resolve(project,process.argv[2] || '.');
const base = (process.env.BASE_PATH || '/').replace(/\/?$/,'/');
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.ttf':'font/ttf','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer(async (request,response)=>{
  try {
    const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    if (!pathname.startsWith(base)) {response.writeHead(404);response.end('Not found');return;}
    let relative = pathname.slice(base.length);
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    if (relative.split('/').some(part=>part.startsWith('.')) || !/^(index\.html|styles\.css|assets\/|src\/)/.test(relative)) {
      response.writeHead(404);response.end('Not found');return;
    }
    const filename = path.resolve(root,relative);
    if (!filename.startsWith(root+path.sep) || !(await stat(filename)).isFile()) throw new Error('Not found');
    const payload = await readFile(filename);
    response.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    response.end(payload);
  } catch {response.writeHead(404);response.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Presentation: http://127.0.0.1:${port}${base}`));
