import { describe, it, expect } from 'vitest';
import { linkTarget } from './linkTarget.js';

describe('linkTarget', () => {
  it('accepts https, mailto and relative targets', () => {
    expect(linkTarget(' https://phzh.ch ')).toBe('https://phzh.ch');
    expect(linkTarget('mailto:a@b.ch')).toBe('mailto:a@b.ch');
    expect(linkTarget('impressum.html')).toBe('impressum.html');
    expect(linkTarget('#katalog')).toBe('#katalog');
  });
  it('rejects other schemes and empty input', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'http://x.ch', 'ftp://x.ch', '', '   ']) {
      expect(linkTarget(bad)).toBeNull();
    }
  });
});
