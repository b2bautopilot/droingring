import { decode as cborDecode, encode as cborEncode } from 'cbor-x';

const MAX_FRAME = 10 * 1024 * 1024;
/** Max bytes buffered between frame boundaries. The per-frame cap is 10 MB,
 * so this is one-and-a-half frames — enough tolerance for a frame in flight
 * plus any incidental overflow, but finite. Without this a slow sender
 * could trickle in bytes forever and grow the heap. */
const MAX_BUFFER = 16 * 1024 * 1024;

// length-prefixed (u32 BE) CBOR frames over a duplex stream.
export function encodeFrame(obj: unknown): Buffer {
  const payload = cborEncode(obj);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length, 0);
  return Buffer.concat([header, payload]);
}

export class FrameParser {
  private buf = Buffer.alloc(0);

  push(chunk: Buffer): Buffer[] {
    if (this.buf.length + chunk.length > MAX_BUFFER) {
      throw new Error('frame buffer overflow');
    }
    this.buf = Buffer.concat([this.buf, chunk]);
    const out: Buffer[] = [];
    while (this.buf.length >= 4) {
      const len = this.buf.readUInt32BE(0);
      if (len > MAX_FRAME) throw new Error('frame too large');
      if (this.buf.length < 4 + len) break;
      out.push(this.buf.subarray(4, 4 + len));
      this.buf = this.buf.subarray(4 + len);
    }
    return out;
  }
}

export function decodeFrame<T = unknown>(payload: Buffer): T {
  return cborDecode(payload) as T;
}
