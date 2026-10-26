const crypto = require('crypto');
const { copy } = require('../lib/util');

const NS = {
  dns: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  url: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  oid: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  x500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
};

function uuidFromHash(alg, version, ns, name) {
  const nsBytes = Buffer.from(ns.replace(/-/g, ''), 'hex');
  const h = crypto.createHash(alg).update(nsBytes).update(name).digest().subarray(0, 16);
  h[6] = (h[6] & 0x0f) | (version << 4);
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

function uuidV1() {
  const t = BigInt(Date.now()) * 10000n + 122192928000000000n;
  const tl = (t & 0xffffffffn).toString(16).padStart(8, '0');
  const tm = ((t >> 32n) & 0xffffn).toString(16).padStart(4, '0');
  const th = (((t >> 48n) & 0x0fffn) | 0x1000n).toString(16).padStart(4, '0');
  const clock = ((crypto.randomBytes(2).readUInt16BE() & 0x3fff) | 0x8000).toString(16);
  const node = crypto.randomBytes(6); node[0] |= 1;
  return `${tl}-${tm}-${th}-${clock}-${node.toString('hex')}`;
}

function uuidV7() {
  const ms = BigInt(Date.now()).toString(16).padStart(12, '0');
  const r = crypto.randomBytes(10);
  r[0] = (r[0] & 0x0f) | 0x70;
  r[2] = (r[2] & 0x3f) | 0x80;
  const x = ms + r.toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

function guid(version, arg) {
  switch (version) {
    case '1': return uuidV1();
    case '3': case '5': {
      const [nsRaw = '', ...rest] = arg.trim().split(/\s+/);
      const ns = NS[nsRaw.toLowerCase()] || (/^[0-9a-f-]{36}$/i.test(nsRaw) ? nsRaw : null);
      if (!ns || !rest.length) throw new Error(`uuid${version} needs a namespace (dns, url, oid, x500 or a GUID) and a name`);
      return uuidFromHash(version === '3' ? 'md5' : 'sha1', version, ns, rest.join(' '));
    }
    case '7': return uuidV7();
    default: return crypto.randomUUID();
  }
}

const HASHES = { md5: 'md5', sha1: 'sha1', sha256: 'sha256', sha384: 'sha384', sha512: 'sha512' };

function generate(cmd, arg) {
  let m;
  if ((m = /^(?:guid|uuid)(\d?)$/.exec(cmd))) return guid(m[1] || '4', arg);
  if (HASHES[cmd]) return crypto.createHash(HASHES[cmd]).update(arg, 'utf8').digest('hex');
  if (cmd === 'base64') return Buffer.from(arg, 'utf8').toString('base64');
  if (cmd === 'base64d') return Buffer.from(arg, 'base64').toString('utf8');
  if (cmd === 'url') return encodeURIComponent(arg);
  if (cmd === 'urld') return decodeURIComponent(arg);
  return null;
}

const HELP = [
  ['guid', 'Generate a random GUID (guid1/3/4/5/7 pick the version)'],
  ['md5 <text>', 'Calculate the MD5 hash'],
  ['sha1 <text>', 'Calculate the SHA1 hash'],
  ['sha256 <text>', 'Calculate the SHA256 hash'],
  ['sha384 <text>', 'Calculate the SHA384 hash'],
  ['sha512 <text>', 'Calculate the SHA512 hash'],
  ['base64 <text>', 'Encode text as Base64'],
  ['base64d <text>', 'Decode Base64 text'],
  ['url <text>', 'URL-encode text'],
  ['urld <text>', 'URL-decode text'],
];

module.exports = {
  name: 'ValueGenerator',
  keyword: '#',
  global: false,
  query({ search }) {
    const [cmd = '', ...rest] = search.trim().split(/\s+/);
    const arg = search.trim().slice(cmd.length).trim();
    const c = cmd.toLowerCase();
    if (!c || generate(c, arg || 'x') === null) {
      return HELP.filter(([k]) => !c || k.startsWith(c)).map(([k, d]) => ({
        title: k, subtitle: d, icon: 'ValueGenerator/ValueGenerator', score: 100, run: () => false,
      }));
    }
    if (!/^(guid|uuid)/.test(c) && !arg) return [{ title: 'Type some text to process', subtitle: `Example: ${c} hello`, icon: 'ValueGenerator/Warning', score: 100, run: () => false }];
    let value;
    try { value = generate(c, arg); } catch (e) {
      return [{ title: String(e.message), subtitle: 'Value generation failed', icon: 'ValueGenerator/Warning', score: 100, run: () => false }];
    }
    return [{
      title: value,
      subtitle: `${c.toUpperCase()} - Select to copy`,
      icon: 'ValueGenerator/ValueGenerator',
      score: 100,
      run: () => { copy(value); },
    }];
  },
};
