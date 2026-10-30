// 在 PNG 文件里写入、读出文字说明（iTXt 块，UTF-8），用于第 23 环节的“隐式标识”。

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function checkSignature(png: Uint8Array) {
  if (png.length < 8 || SIGNATURE.some((v, i) => png[i] !== v)) throw new Error("不是 PNG 文件");
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  const typeBytes = new TextEncoder().encode(type);
  out.set(typeBytes, 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function itxtData(keyword: string, text: string): Uint8Array {
  const enc = new TextEncoder();
  const key = enc.encode(keyword);
  const body = enc.encode(text);
  // 关键字 \0 压缩标记(0) 压缩方法(0) 语言标签 \0 译名 \0 文本
  const out = new Uint8Array(key.length + 5 + body.length);
  out.set(key, 0);
  out.set([0, 0, 0, 0, 0], key.length);
  out.set(body, key.length + 5);
  return out;
}

/** 在 IEND 之前插入若干 iTXt 文字块。 */
export function addTextChunks(png: Uint8Array, entries: Record<string, string>): Uint8Array {
  checkSignature(png);
  const iend = findChunk(png, "IEND");
  if (iend < 0) throw new Error("PNG 文件不完整");
  const extra = Object.entries(entries).map(([k, v]) => chunk("iTXt", itxtData(k, v)));
  const size = extra.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(png.length + size);
  out.set(png.subarray(0, iend), 0);
  let pos = iend;
  for (const c of extra) { out.set(c, pos); pos += c.length; }
  out.set(png.subarray(iend), pos);
  return out;
}

function findChunk(png: Uint8Array, type: string): number {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let pos = 8;
  while (pos + 8 <= png.length) {
    const len = view.getUint32(pos);
    const t = String.fromCharCode(...png.subarray(pos + 4, pos + 8));
    if (t === type) return pos;
    pos += 12 + len;
  }
  return -1;
}

/** 读出全部 iTXt/tEXt 文字块，并校验每一块的 CRC。 */
export function readTextChunks(png: Uint8Array): Record<string, string> {
  checkSignature(png);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const dec = new TextDecoder();
  const out: Record<string, string> = {};
  let pos = 8;
  while (pos + 8 <= png.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(...png.subarray(pos + 4, pos + 8));
    const data = png.subarray(pos + 8, pos + 8 + len);
    const crc = view.getUint32(pos + 8 + len);
    if (crc !== crc32(png.subarray(pos + 4, pos + 8 + len))) throw new Error(`${type} 块校验失败`);
    if (type === "iTXt") {
      const z = data.indexOf(0);
      const key = dec.decode(data.subarray(0, z));
      let p = z + 3;
      p = data.indexOf(0, p) + 1;
      p = data.indexOf(0, p) + 1;
      out[key] = dec.decode(data.subarray(p));
    } else if (type === "tEXt") {
      const z = data.indexOf(0);
      out[dec.decode(data.subarray(0, z))] = dec.decode(data.subarray(z + 1));
    }
    if (type === "IEND") break;
    pos += 12 + len;
  }
  return out;
}
