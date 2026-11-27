import { describe, it, expect } from 'vitest';
import { detectImageType } from './detect.js';

const b = (...a) => new Uint8Array(a);
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

describe('detectImageType', () => {
  it('erkennt PNG, JPEG, WebP und GIF an den Magic Bytes', () => {
    expect(detectImageType(b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a))).toBe('png');
    expect(detectImageType(b(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
    expect(detectImageType(b(...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WEBP')))).toBe('webp');
    expect(detectImageType(b(...ascii('GIF89a')))).toBe('gif');
    expect(detectImageType(b(...ascii('GIF87a')))).toBe('gif');
  });
  it('lehnt SVG-Text ab', () => {
    expect(detectImageType(b(...ascii('<svg xmlns="http://www.w3.org/2000/svg"/>')))).toBeNull();
    expect(detectImageType(b(...ascii('<?xml version="1.0"?><svg/>')))).toBeNull();
  });
  it('gibt null bei Zufallsbytes, RIFF ohne WEBP und zu kurzen Daten', () => {
    expect(detectImageType(b(1, 2, 3, 4))).toBeNull();
    expect(detectImageType(b(...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WAVE')))).toBeNull();
    expect(detectImageType(b())).toBeNull();
  });
});
