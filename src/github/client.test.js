import { describe, it, expect } from 'vitest'
import { createClient, GitHubError, AuthError, ConflictError } from './client.js'

function res(status, body, headers = {}) {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k) => h[k.toLowerCase()] ?? null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

function fake(...responses) {
  const calls = []
  const impl = async (url, opts = {}) => {
    calls.push({ url, opts, body: opts.body ? JSON.parse(opts.body) : undefined })
    const r = responses.length > 1 ? responses.shift() : responses[0]
    if (r instanceof Error) throw r
    return r
  }
  impl.calls = calls
  return impl
}

const toB64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)))

describe('github client', () => {
  it('sendet Bearer-Header und API-Version', async () => {
    const f = fake(res(200, { login: 'a', name: 'A' }))
    const user = await createClient('tok', f).getUser()
    expect(user).toEqual({ login: 'a', name: 'A' })
    expect(f.calls[0].url).toBe('https://api.github.com/user')
    const h = f.calls[0].opts.headers
    expect(h.Authorization).toBe('Bearer tok')
    expect(h['X-GitHub-Api-Version']).toBe('2022-11-28')
    expect(h.Accept).toBe('application/vnd.github+json')
  })

  it('getFileText dekodiert UTF-8 aus base64 mit Zeilenumbrüchen', async () => {
    const b64 = toB64('Grüezi «Zürich»')
    const f = fake(res(200, { content: b64.slice(0, 8) + '\n' + b64.slice(8) + '\n', encoding: 'base64', sha: 's1' }))
    const r = await createClient('t', f).getFileText('o/r', 'a b/ü.md', 'main')
    expect(r).toEqual({ text: 'Grüezi «Zürich»', sha: 's1' })
    expect(f.calls).toHaveLength(1)
    expect(f.calls[0].url).not.toContain('/git/blobs')
    expect(f.calls[0].url).toBe('https://api.github.com/repos/o/r/contents/a%20b/%C3%BC.md?ref=main')
  })

  it('getFileText falls back to the blob API for files over 1 MB', async () => {
    const f = fake(
      res(200, { content: '', encoding: 'none', sha: 'abc' }),
      res(200, { content: toB64('Grüezi ä') }),
    )
    const r = await createClient('t', f).getFileText('o/r', 'big.md', 'main')
    expect(r).toEqual({ text: 'Grüezi ä', sha: 'abc' })
    expect(f.calls[1].url).toBe('https://api.github.com/repos/o/r/git/blobs/abc')
  })

  it('getFileText rejects a directory path with a German message', async () => {
    const f = fake(res(200, [{ name: 'a.md' }]))
    const err = await createClient('t', f).getFileText('o/r', 'dir', 'main').catch((e) => e)
    expect(err).toBeInstanceOf(GitHubError)
    expect(err.message).toBe('Erwartet wurde eine Datei, gefunden wurde ein Ordner: dir')
  })

  it('getFileText omits ref when not given', async () => {
    const f = fake(res(200, { content: toB64('x'), encoding: 'base64', sha: 's' }))
    await createClient('t', f).getFileText('o/r', 'a.md')
    expect(f.calls[0].url).toBe('https://api.github.com/repos/o/r/contents/a.md')
  })

  it('getFileText gibt null bei 404', async () => {
    const f = fake(res(404, { message: 'Not Found' }))
    expect(await createClient('t', f).getFileText('o/r', 'x.md', 'main')).toBeNull()
  })

  it('listRepos folgt Link rel=next', async () => {
    const f = fake(
      res(200, [{ full_name: 'a/b', private: true, id: 1 }], {
        Link: '<https://api.github.com/user/repos?per_page=100&page=2>; rel="next", <https://x>; rel="last"',
      }),
      res(200, [{ full_name: 'c/d', private: false, id: 2 }]),
    )
    const repos = await createClient('t', f).listRepos()
    expect(repos).toEqual([
      { full_name: 'a/b', private: true },
      { full_name: 'c/d', private: false },
    ])
    expect(f.calls[0].url).toBe('https://api.github.com/user/repos?per_page=100')
    expect(f.calls[1].url).toBe('https://api.github.com/user/repos?per_page=100&page=2')
  })

  it('401 wirft AuthError', async () => {
    const f = fake(res(401, { message: 'Bad credentials' }))
    await expect(createClient('t', f).getUser()).rejects.toBeInstanceOf(AuthError)
  })

  it('403 Bad credentials wirft AuthError, Rate Limit GitHubError', async () => {
    const a = fake(res(403, { message: 'Bad credentials' }))
    await expect(createClient('t', a).getUser()).rejects.toBeInstanceOf(AuthError)
    const b = fake(res(403, { message: 'rate limit' }, { 'x-ratelimit-remaining': '0' }))
    const err = await createClient('t', b).getUser().catch((e) => e)
    expect(err).toBeInstanceOf(GitHubError)
    expect(err).not.toBeInstanceOf(AuthError)
    expect(err.message).toBe('GitHub-Anfragelimit erreicht. Bitte in einigen Minuten erneut versuchen.')
  })

  it('Netzwerkfehler → GitHubError Status 0', async () => {
    const f = fake(new TypeError('fail'))
    const err = await createClient('t', f).getUser().catch((e) => e)
    expect(err).toBeInstanceOf(GitHubError)
    expect(err.status).toBe(0)
    expect(err.message).toBe('Keine Verbindung zu GitHub. Bitte Internetverbindung prüfen.')
  })

  it('updateRef 422 fast forward → ConflictError, sendet force:false', async () => {
    const f = fake(res(422, { message: 'Update is not a fast forward' }))
    const err = await createClient('t', f).updateRef('o/r', 'main', 'abc').catch((e) => e)
    expect(err).toBeInstanceOf(ConflictError)
    expect(f.calls[0].opts.method).toBe('PATCH')
    expect(f.calls[0].url).toBe('https://api.github.com/repos/o/r/git/refs/heads/main')
    expect(f.calls[0].body).toEqual({ sha: 'abc', force: false })
  })

  it('createTree mit sha null sendet Löscheintrag', async () => {
    const f = fake(res(201, { sha: 'tree1' }))
    const sha = await createClient('t', f).createTree('o/r', 'base', [
      { path: 'a.md', sha: null },
      { path: 'b.md', sha: 'blob1' },
    ])
    expect(sha).toBe('tree1')
    expect(f.calls[0].body).toEqual({
      base_tree: 'base',
      tree: [
        { path: 'a.md', mode: '100644', type: 'blob', sha: null },
        { path: 'b.md', mode: '100644', type: 'blob', sha: 'blob1' },
      ],
    })
  })

  it('createBlob/getBlob Round-Trip über base64', async () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255])
    const f = fake(res(201, { sha: 'b1' }))
    expect(await createClient('t', f).createBlob('o/r', bytes)).toBe('b1')
    expect(f.calls[0].body).toEqual({ content: 'AAEC+v8=', encoding: 'base64' })
    const g = fake(res(200, { content: 'AAEC+v8=\n' }))
    expect(await createClient('t', g).getBlob('o/r', 'b1')).toEqual(bytes)
  })

  it('getRef, getTree, createCommit, listCommits', async () => {
    const f = fake(
      res(200, { object: { sha: 'r1' } }),
      res(200, { tree: [{ path: 'a', type: 'blob', sha: 's', mode: '100644', size: 3 }] }),
      res(201, { sha: 'c1' }),
      res(200, [{ sha: 'c1', commit: { message: 'm', author: { name: 'N', date: 'D' } }, author: null }]),
    )
    const c = createClient('t', f)
    expect(await c.getRef('o/r', 'main')).toBe('r1')
    expect(await c.getTree('o/r', 'r1')).toEqual([{ path: 'a', type: 'blob', sha: 's', mode: '100644' }])
    expect(f.calls[1].url).toBe('https://api.github.com/repos/o/r/git/trees/r1?recursive=1')
    expect(await c.createCommit('o/r', 'msg', 't1', 'p1')).toBe('c1')
    expect(f.calls[2].body).toEqual({ message: 'msg', tree: 't1', parents: ['p1'] })
    expect(await c.listCommits('o/r', { path: 'x/y.md' })).toEqual([
      { sha: 'c1', message: 'm', author: { name: 'N', login: null }, date: 'D' },
    ])
    expect(f.calls[3].url).toBe('https://api.github.com/repos/o/r/commits?per_page=20&path=x%2Fy.md')
  })
})
