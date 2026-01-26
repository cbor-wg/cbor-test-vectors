/* eslint-disable no-console */
import {assert, suite, test} from 'vitest';
import {decode, encode} from 'cbor2';
import {hexToU8, u8toHex} from 'cbor2/utils';
import {inspect, isDeepStrictEqual} from 'node:util';
import {join, relative} from 'node:path';
import {parseEDN, registerAppString} from 'cbor-edn';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {ByteTree} from 'cbor-edn/lib/byteTree.js';
import {fileURLToPath} from 'node:url';

const FILE_TYPE = '.edn';

async function files(dir) {
  const res = [];
  process.argv.slice(2);
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

const f9 = new Uint8Array([0xf9]);
const fa = new Uint8Array([0xfa]);
const fb = new Uint8Array([0xfb]);

function floatAppString(prefix, str) {
  assert.equal(prefix, 'float');
  const buf = hexToU8(str);

  switch (buf.length) {
    case 2:
      return [null, new ByteTree(f9, buf)];
    case 4:
      return [null, new ByteTree(fa, buf)];
    case 8:
      return [null, new ByteTree(fb, buf)];
    default:
      throw new Error(`invalid float length: ${buf.length}`);
  }
}

registerAppString('float', floatAppString);

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
  const decodedFile = decode(encodedFile, {keepNanPayloads: true});

  const {
    title, fail, encodeOptions = {}, decodeOptions = {},
  } = decodedFile;
  let {tests} = decodedFile;
  assert(tests);
  if (tests.some(t => t.only)) {
    tests = tests.filter(t => t.only);
  }

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
        throw new Error(`Duplicate: "${prevPlace}" and "${place}": h'${encodedHex}'`);
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
      assert.deepEqual(dec, decoded, `Decoding.  Original: h'${u8toHex(encoded)}'`);
      if (log) {
        console.log({...vector, enc, dec});
      }
    } else {
      assert(false, `Unknown vector combination: ${inspect(vector)}`);
    }
  });
});
