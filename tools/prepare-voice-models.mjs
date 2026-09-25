// Public Apache-2.0 Vosk models. Build-time download only; no audio leaves the browser.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { create } from 'tar';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, 'runtime', 'voice-models');
fs.mkdirSync(cache, { recursive: true });
const models = [
  { name: 'vosk-model-small-en-us-0.15', file: 'en-us.tar.gz', sha256: '30f26242c4eb449f948e42cb302dd7a686cb29a3423a8367f99ff41780942498' },
  { name: 'vosk-model-small-cn-0.22', file: 'zh-cn.tar.gz', sha256: '3af8b0e7e0f835ae9d414ce5df580237a3cfb08d586c9fbbb0f7ff29ad5b14ba' },
];
for (const model of models) {
  const zip = path.join(cache, model.name + '.zip');
  if (!fs.existsSync(zip)) {
    console.log('Downloading open speech model:', model.name);
    const response = await fetch('https://alphacephei.com/vosk/models/' + model.name + '.zip', { signal: AbortSignal.timeout(240000) });
    if (!response.ok) throw Error('MODEL_DOWNLOAD_' + response.status);
    const bytes = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(zip + '.partial', bytes);
    fs.renameSync(zip + '.partial', zip);
  }
  const bytes = fs.readFileSync(zip);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  if (model.sha256 && sha256 !== model.sha256) throw Error('MODEL_CHECKSUM_' + model.name);
  console.log(model.name, sha256);
  const output = path.join(cache, model.file);
  if (!fs.existsSync(output)) {
    const extract = path.join(cache, model.name);
    fs.mkdirSync(extract, { recursive: true });
    let total = 0;
    for (const [name, data] of Object.entries(unzipSync(bytes))) {
      if (!name.startsWith(model.name + '/') || name.includes('\\') || name.split('/').includes('..')) throw Error('MODEL_ARCHIVE_PATH');
      if (name.endsWith('/')) continue;
      total += data.length;
      if (total > 300 * 1024 * 1024) throw Error('MODEL_ARCHIVE_SIZE');
      const dest = path.join(extract, 'model', name.slice(model.name.length + 1));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, data);
    }
    await create({ cwd: extract, file: output, gzip: true, portable: true, mtime: new Date(0) }, ['model']);
  }
}
