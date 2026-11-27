import { describe, it, expect, beforeEach } from 'vitest';
import { loadToken, saveToken, clearToken } from './token.js';

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

describe('token storage', () => {
  it('returns null when nothing is stored', () => {
    expect(loadToken()).toBeNull();
  });
  it('saveToken(t, false) writes only sessionStorage', () => {
    saveToken('abc', false);
    expect(sessionStorage.getItem('cms.token')).toBe('abc');
    expect(localStorage.getItem('cms.token')).toBeNull();
  });
  it('saveToken(t, true) writes only localStorage', () => {
    saveToken('abc', true);
    expect(localStorage.getItem('cms.token')).toBe('abc');
    expect(sessionStorage.getItem('cms.token')).toBeNull();
  });
  it('saveToken replaces a token kept in the other storage', () => {
    saveToken('old', true);
    saveToken('new', false);
    expect(localStorage.getItem('cms.token')).toBeNull();
    expect(loadToken()).toBe('new');
  });
  it('loadToken prefers sessionStorage over localStorage', () => {
    localStorage.setItem('cms.token', 'local');
    sessionStorage.setItem('cms.token', 'session');
    expect(loadToken()).toBe('session');
  });
  it('loadToken falls back to localStorage', () => {
    localStorage.setItem('cms.token', 'local');
    expect(loadToken()).toBe('local');
  });
  it('clearToken empties both', () => {
    sessionStorage.setItem('cms.token', 'a');
    localStorage.setItem('cms.token', 'b');
    clearToken();
    expect(loadToken()).toBeNull();
    expect(sessionStorage.getItem('cms.token')).toBeNull();
    expect(localStorage.getItem('cms.token')).toBeNull();
  });
});
