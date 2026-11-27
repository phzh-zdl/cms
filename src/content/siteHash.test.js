import { describe, it, expect } from 'vitest';
import { parseSiteHash } from './siteHash.js';

describe('parseSiteHash', () => {
  it('accepts an org repo', () => {
    expect(parseSiteHash('#/phzh-zdl/oer-dashboard')).toBe('phzh-zdl/oer-dashboard');
  });
  it.each(['#/../x', '#/./.', '#/other/repo', '#/a/%', '#/phzh-zdl%2Fa/b', '#/phzh-zdl/..', '#/phzh-zdl/a/b', '', '#', '#/'])(
    'rejects %j', (h) => { expect(parseSiteHash(h)).toBeNull(); },
  );
  it('uses the given org', () => {
    expect(parseSiteHash('#/other/repo', 'other')).toBe('other/repo');
  });
});
