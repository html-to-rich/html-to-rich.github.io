import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname, resolve} from 'node:path';
import {build} from 'esbuild';

const require = createRequire(import.meta.url);
const parser = require.resolve('parse5');
const entities = createRequire(parser).resolve('entities/decode');
const licenses = await Promise.all([
  readFile(resolve(dirname(parser), '../LICENSE'), 'utf8'),
  readFile(resolve(dirname(entities), '../LICENSE'), 'utf8')
]);
const notice = 'Generated from src/converter.mjs. Rebuild with pnpm run build.\n\n' +
  'parse5\n' + licenses[0] + '\nentities\n' + licenses[1];
await build({
  entryPoints: ['src/converter.mjs'], outfile: 'converter-core.mjs',
  bundle: true, format: 'esm', platform: 'neutral', target: 'es2022',
  minify: true, banner: {js: '/*!\n' + notice + '\n*/'}
});
