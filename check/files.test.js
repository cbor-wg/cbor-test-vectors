import * as cbor from 'cbor2';
import * as edn from 'cbor-edn';
import {assert, suite, test} from 'vitest';
import {join, relative} from 'node:path';
import {readFile, readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const FILE_TYPE = '.edn';

async function files(dir) {
  const res = [];
  for (const f of await readdir(dir, {
    withFileTypes: true,
    recursive: true,
  })) {
    if (f.isFile && f.name.endsWith(FILE_TYPE)) {
      res.push(relative(dir, join(f.parentPath, f.name)));
    }
  }
  return res;
}

const base = fileURLToPath(new URL('../tests', import.meta.url));
const f = await files(base);
suite.each(f)('File %s', async file => {
  const grammarSource = join(base, file);
  const input = await readFile(grammarSource, 'utf8');
  const encoded = edn.parseEDN(input, {grammarSource});
  const decoded = cbor.decode(encoded);
  const {title, fail, tests} = decoded;
  assert(tests);
  test.each(tests)(`${title} - $description`, t => {
    if (fail) {
      if (t.decoded) {
        assert.throws(() => cbor.encode(t.decoded));
      }
      if (t.encoded) {
        assert.throws(() => cbor.decode(t.encoded));
      }
    } else {
      assert.deepEqual(cbor.encode(t.decoded), t.encoded);
      assert.deepEqual(cbor.decode(t.encoded), t.decoded);
    }
  });
});
