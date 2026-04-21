import { describe, expect, it } from 'vitest';
import { FrameParser, encodeFrame } from '../src/p2p/frame.js';

describe('FrameParser', () => {
  it('decodes multiple frames across chunk boundaries', () => {
    const p = new FrameParser();
    const a = encodeFrame({ n: 1 });
    const b = encodeFrame({ n: 2 });
    // Split arbitrarily
    const blob = Buffer.concat([a, b]);
    const first = p.push(blob.subarray(0, 3));
    expect(first).toEqual([]);
    const rest = p.push(blob.subarray(3));
    expect(rest.length).toBe(2);
  });

  it('throws when a single frame exceeds the 10 MB cap', () => {
    const p = new FrameParser();
    // Synthesise a 4-byte header advertising 11 MB without the payload.
    const header = Buffer.alloc(4);
    header.writeUInt32BE(11 * 1024 * 1024, 0);
    expect(() => p.push(header)).toThrow(/frame too large/);
  });

  it('throws when buffered bytes exceed the 16 MB cap', () => {
    const p = new FrameParser();
    // Header says 9 MB (under the per-frame cap). Feed 9 MB minus 1 byte so
    // the decoder can't emit the frame yet. Then push another 8 MB — total
    // unbounded buffer now exceeds 16 MB and must throw.
    const header = Buffer.alloc(4);
    header.writeUInt32BE(9 * 1024 * 1024, 0);
    p.push(header);
    p.push(Buffer.alloc(9 * 1024 * 1024 - 1, 0));
    expect(() => p.push(Buffer.alloc(8 * 1024 * 1024, 0))).toThrow(/buffer overflow/);
  });
});
