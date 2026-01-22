/* eslint-disable no-console */
import {assert, suite, test} from 'vitest';
import {decode, encode} from 'cbor2';
import {inspect, isDeepStrictEqual} from 'node:util';
import {join, relative} from 'node:path';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parseEDN} from 'cbor-edn';
import {u8toHex} from 'cbor2/utils';

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

// Don't just check truthiness of property, since the property
// might be undefined, false, 0, -0, etc.
function hasOwn(o, p) {
  return Object.prototype.hasOwnProperty.call(o, p);
}

const allEncoded = new Map();

const base = fileURLToPath(new URL('../tests', import.meta.url));
const f = await files(base);
suite.each(f)('File %s', async file => {
  const grammarSource = join(base, file);
  const input = await readFile(grammarSource, 'utf8');
  const encodedFile = parseEDN(input, {grammarSource});
  const cborFileName = join(base, file.replace(/\.edn$/, '.cbor'));
  switch (process.env.VECTOR_MODE) {
    case 'gen':
      await writeFile(cborFileName, encodedFile);
      break;
    case undefined: {
      const cborFile = await readFile(cborFileName);
      if (!isDeepStrictEqual(u8toHex(cborFile), u8toHex(encodedFile))) {
        throw new Error(`CBOR out of date for "${file}".  Run with VECTOR_MODE=gen`);
      }
      break;
    }
    default:
      throw new Error(`Unknown VECTOR_MODE: "${process.env.VECTOR_MODE}"`);
  }
  const decodedFile = decode(encodedFile);

  const {
    title, fail, encodeOptions = {}, decodeOptions = {}, tests,
  } = decodedFile;
  assert(tests);
  test.each(tests)(`${title} - $description`, vector => {
    const {
      description, encoded, decoded, log,
      roundtrip = true,
      fail: localFail,
      encodeOptions: localEncodeOptions,
      decodeOptions: localDecodeOptions,
    } = vector;
    if (encoded) {
      const encodedHex = u8toHex(encoded);
      const place = `${title} - ${description}`;
      const prevPlace = allEncoded.get(encodedHex);
      if (prevPlace) {
        throw new Error(`Duplicate: "${prevPlace}" and "${place}"`);
      }
      allEncoded.set(encodedHex, place);
    }
    const encOpts = {...encodeOptions, ...localEncodeOptions};
    const decOpts = {...decodeOptions, ...localDecodeOptions};
    if (fail || localFail) {
      if (decoded) {
        assert.throws(() => encode(decoded, encOpts));
      }
      if (encoded) {
        assert.throws(() => decode(encoded, decOpts));
      }
      if (log) {
        console.log(vector);
      }
    } else if (hasOwn(vector, 'encoded') && hasOwn(vector, 'decoded')) {
      let enc = undefined;
      if (roundtrip) {
        enc = encode(decoded, encOpts);
        assert.equal(u8toHex(enc), u8toHex(encoded));
      }
      const dec = decode(encoded, decOpts);
      assert.deepEqual(dec, decoded);
      if (log) {
        console.log({...vector, enc, dec});
      }
    } else {
      assert(false, `Unknown vector combination: ${inspect(vector)}`);
    }
  });
});
