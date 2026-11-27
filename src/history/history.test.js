import { describe, it, expect } from 'vitest';
import { listHistory } from './history.js';

describe('listHistory', () => {
  it('mappt Name, Login-Fallback, unbekannt, erste Zeile und Datum', async () => {
    const calls = [];
    const client = {
      listCommits: async (repo, opts) => {
        calls.push([repo, opts]);
        return [
          { message: 'Erste\n\nDetails', author: { name: 'Anna', login: 'anna1' }, date: '2026-11-27T10:00:00Z' },
          { message: 'Zweite', author: { name: null, login: 'bob' }, date: '2026-11-26T10:00:00Z' },
          { message: 'Dritte', author: { name: null, login: null }, date: '2026-11-25T10:00:00Z' },
        ];
      },
    };
    const h = await listHistory(client, 'o/r');
    expect(calls).toEqual([['o/r', { perPage: 20 }]]);
    expect(h.map((x) => x.who)).toEqual(['Anna', 'bob', 'unbekannt']);
    expect(h[0].message).toBe('Erste');
    expect(h[0].when).toEqual(new Date('2026-11-27T10:00:00Z'));
  });
});
