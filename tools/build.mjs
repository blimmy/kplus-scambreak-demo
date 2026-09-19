import { cp, mkdir, readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../',import.meta.url));
const output = path.join(root,'dist');
await mkdir(output,{recursive:true});
for (const entry of ['index.html','styles.css','src','assets','.nojekyll']) {
  await cp(path.join(root,entry),path.join(output,entry),{recursive:true});
}
const metadata = JSON.parse(await readFile(path.join(output,'assets/source.json'),'utf8'));
for (const asset of Object.keys(metadata.assets)) await stat(path.join(output,'assets',asset));
console.log('Static presentation built in dist/ (no runtime dependencies).');
