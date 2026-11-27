import { describe, it, expect } from 'vitest';
import { buildCommitMessage, summarizeChanges } from './commitMessage.js';

const config = {
  collections: [
    { id: 'categories', label: 'Fachbereiche', key: 'id', titleField: 'label' },
    { id: 'resources', label: 'Ressourcen', key: 'id', titleField: 'title' },
    { id: 'misc', label: 'Sonstiges', key: 'id', titleField: 'name' },
  ],
  pages: [{ id: 'impressum', label: 'Impressum' }],
};

describe('buildCommitMessage', () => {
  it('1 Eintrag + 1 Bild', () => {
    expect(buildCommitMessage([{ label: 'Ressource', verb: 'geändert', title: 'Kikkerschwimmen' }], 1))
      .toBe('Ressource „Kikkerschwimmen“ geändert, 1 Bild hinzugefügt');
  });
  it('mehrere Bilder', () => {
    expect(buildCommitMessage([{ label: 'Fachbereich', verb: 'hinzugefügt', title: 'Natur' }], 2))
      .toBe('Fachbereich „Natur“ hinzugefügt, 2 Bilder hinzugefügt');
  });
  it('bis 3 Eintraege einzeln', () => {
    expect(buildCommitMessage([
      { label: 'Ressource', verb: 'geändert', title: 'A' },
      { label: 'Fachbereich', verb: 'gelöscht', title: 'B' },
    ], 0)).toBe('Ressource „A“ geändert, Fachbereich „B“ gelöscht');
  });
  it('mehr als 3 Eintraege zusammengefasst', () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ label: 'Ressource', verb: 'geändert', title: `R${i}` }));
    expect(buildCommitMessage(five, 0)).toBe('5 Einträge geändert');
    expect(buildCommitMessage(five, 1)).toBe('5 Einträge geändert, 1 Bild hinzugefügt');
  });
  it('Textseite', () => {
    expect(buildCommitMessage([{ label: 'Seite', verb: 'geändert', title: 'Impressum' }], 0))
      .toBe('Seite „Impressum“ geändert');
  });
  it('nur Bilder / nichts Benennbares', () => {
    expect(buildCommitMessage([], 1)).toBe('1 Bild hinzugefügt');
    expect(buildCommitMessage([], 0)).toBe('Inhalte aktualisiert');
  });
});

describe('summarizeChanges', () => {
  const base = {
    categories: [{ id: 'natur', label: 'Natur' }, { id: 'kunst', label: 'Kunst' }],
    resources: [{ id: 'r1', title: 'Kikkerschwimmen' }],
    misc: [{ id: 'm1', name: 'Alt' }],
  };
  it('erkennt hinzugefuegt / geaendert / geloescht je Eintrag', () => {
    const data = {
      categories: [{ id: 'natur', label: 'Natur' }, { id: 'sport', label: 'Sport' }],
      resources: [{ id: 'r1', title: 'Kikkerschwimmen!' }],
      misc: [{ id: 'm1', name: 'Alt' }],
    };
    expect(summarizeChanges(config, base, data, {}, {})).toEqual([
      { label: 'Fachbereich', verb: 'hinzugefügt', title: 'Sport' },
      { label: 'Fachbereich', verb: 'gelöscht', title: 'Kunst' },
      { label: 'Ressource', verb: 'geändert', title: 'Kikkerschwimmen!' },
    ]);
  });
  it('unbekanntes Sammlungs-Label bleibt wie es ist; Seiten', () => {
    const data = { ...base, misc: [{ id: 'm1', name: 'Neu' }] };
    expect(summarizeChanges(config, base, data, { impressum: { body: 'a' } }, { impressum: { body: 'b' } })).toEqual([
      { label: 'Sonstiges', verb: 'geändert', title: 'Neu' },
      { label: 'Seite', verb: 'geändert', title: 'Impressum' },
    ]);
  });
});
