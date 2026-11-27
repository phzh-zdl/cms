import { describe, it, expect } from 'vitest';
import { safeHttps } from './safeHttps.js';

describe('safeHttps', () => {
  it('accepts https and protocol-relative, rejects everything else', () => {
    expect(safeHttps('https://phzh.ch')).toBe('https://phzh.ch');
    expect(safeHttps('//phzh.ch')).toBe('https://phzh.ch');
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'http://x.ch', 'mailto:a@b.ch', '', null]) {
      expect(safeHttps(bad)).toBe('');
    }
  });
});
