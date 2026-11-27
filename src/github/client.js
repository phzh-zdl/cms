const API = 'https://api.github.com'

export class GitHubError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
  }
}
export class AuthError extends GitHubError {
  constructor(status, message) {
    super(status, message)
    this.name = 'AuthError'
  }
}
export class ConflictError extends GitHubError {
  constructor(status, message) {
    super(status, message)
    this.name = 'ConflictError'
  }
}

function bytesToBase64(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}

function base64ToBytes(b64) {
  const bin = atob(b64.replace(/\s+/g, ''))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/')

export function createClient(token, fetchImpl = (...a) => fetch(...a)) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  async function raw(url, method = 'GET', body) {
    const opts = { method, headers: body === undefined ? headers : { ...headers, 'Content-Type': 'application/json' } }
    if (body !== undefined) opts.body = JSON.stringify(body)
    let res
    try {
      res = await fetchImpl(url.startsWith('http') ? url : API + url, opts)
    } catch {
      throw new GitHubError(0, 'Keine Verbindung zu GitHub. Bitte Internetverbindung prüfen.')
    }
    return res
  }

  async function fail(res, extra) {
    let message = ''
    try {
      message = (await res.json())?.message ?? ''
    } catch { /* kein JSON */ }
    const s = res.status
    if (s === 401 || (s === 403 && /bad credentials|expired/i.test(message))) {
      return new AuthError(s, 'Anmeldung ungültig oder abgelaufen. Bitte erneut anmelden.')
    }
    if (s === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
      return new GitHubError(s, 'GitHub-Anfragelimit erreicht. Bitte in einigen Minuten erneut versuchen.')
    }
    if (extra) {
      const e = extra(s, message)
      if (e) return e
    }
    if (s === 403) return new GitHubError(s, 'Zugriff verweigert. Fehlende Berechtigung für dieses Repository.')
    if (s === 404) return new GitHubError(s, 'Nicht gefunden.')
    return new GitHubError(s, `GitHub-Fehler (${s})${message ? ': ' + message : ''}`)
  }

  async function request(url, method, body, extra) {
    const res = await raw(url, method, body)
    if (!res.ok) throw await fail(res, extra)
    return res
  }

  const json = async (...a) => (await request(...a)).json()

  const getBlob = async (repo, sha) => base64ToBytes((await json(`/repos/${repo}/git/blobs/${sha}`)).content)

  return {
    async getUser() {
      const u = await json('/user')
      return { login: u.login, name: u.name }
    },

    async listRepos() {
      const out = []
      let url = '/user/repos?per_page=100'
      while (url) {
        const res = await request(url)
        for (const r of await res.json()) out.push({ full_name: r.full_name, private: r.private })
        const m = (res.headers.get('link') || '').match(/<([^>]+)>\s*;\s*rel="next"/)
        url = m ? m[1] : null
      }
      return out
    },

    async getRef(repo, branch) {
      return (await json(`/repos/${repo}/git/ref/heads/${encodePath(branch)}`)).object.sha
    },

    async getTree(repo, sha, recursive = true) {
      const t = await json(`/repos/${repo}/git/trees/${sha}${recursive ? '?recursive=1' : ''}`)
      return t.tree.map(({ path, type, sha, mode }) => ({ path, type, sha, mode }))
    },

    getBlob,

    async getFileText(repo, path, ref) {
      const query = ref ? `?ref=${encodeURIComponent(ref)}` : ''
      const res = await raw(`/repos/${repo}/contents/${encodePath(path)}${query}`)
      if (res.status === 404) return null
      if (!res.ok) throw await fail(res)
      const f = await res.json()
      if (Array.isArray(f)) {
        throw new GitHubError(res.status, `Erwartet wurde eine Datei, gefunden wurde ein Ordner: ${path}`)
      }
      // Dateien über 1 MB liefert die Contents-API ohne Inhalt (encoding "none")
      const bytes = f.encoding === 'base64' ? base64ToBytes(f.content) : await getBlob(repo, f.sha)
      return { text: new TextDecoder().decode(bytes), sha: f.sha }
    },

    async createBlob(repo, bytes) {
      return (await json(`/repos/${repo}/git/blobs`, 'POST', { content: bytesToBase64(bytes), encoding: 'base64' })).sha
    },

    async createTree(repo, baseTree, entries) {
      const tree = entries.map(({ path, sha }) => ({ path, mode: '100644', type: 'blob', sha }))
      return (await json(`/repos/${repo}/git/trees`, 'POST', { base_tree: baseTree, tree })).sha
    },

    async createCommit(repo, message, tree, parent) {
      return (await json(`/repos/${repo}/git/commits`, 'POST', { message, tree, parents: [parent] })).sha
    },

    async updateRef(repo, branch, sha) {
      await request(`/repos/${repo}/git/refs/heads/${encodePath(branch)}`, 'PATCH', { sha, force: false }, (s, msg) =>
        (s === 409 || s === 422) && /fast.?forward/i.test(msg)
          ? new ConflictError(s, 'Der Branch wurde inzwischen geändert. Bitte Änderungen neu laden.')
          : null,
      )
    },

    async listCommits(repo, { path, perPage = 20 } = {}) {
      let url = `/repos/${repo}/commits?per_page=${perPage}`
      if (path) url += `&path=${encodeURIComponent(path)}`
      const list = await json(url)
      return list.map((c) => ({
        sha: c.sha,
        message: c.commit.message,
        author: { name: c.commit.author?.name ?? null, login: c.author?.login ?? null },
        date: c.commit.author?.date ?? null,
      }))
    },
  }
}
