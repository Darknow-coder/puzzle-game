// A small Firebase client over the public REST APIs (no SDK): anonymous sign-in
// with Firebase Authentication, and the few Cloud Firestore calls the rankings
// need (read, batch read, query, count, atomic commit). The same code talks to
// the local Firebase emulators in tests.

export class OnlineError extends Error {
  /** code: 'offline' | 'denied' | 'conflict' | 'missing' | 'quota' | 'auth' | 'server' | 'bad' */
  constructor(code, message, status = 0) {
    super(message || code);
    this.code = code;
    this.status = status;
  }
}

// ------------------------------------------------------------- value coding

/** JS value → Firestore REST value. Integers stay integers. */
export function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: encFields(v) } };
}

export function encFields(o) {
  const f = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) f[k] = enc(v);
  return f;
}

/** Firestore REST value → JS value (timestamps become milliseconds). */
export function dec(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return !!v.booleanValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) return decFields(v.mapValue.fields || {});
  return null;
}

export function decFields(f) {
  const o = {};
  for (const [k, v] of Object.entries(f || {})) o[k] = dec(v);
  return o;
}

// ------------------------------------------------------------------- client

const STATUS_CODES = {
  PERMISSION_DENIED: 'denied',
  UNAUTHENTICATED: 'auth',
  FAILED_PRECONDITION: 'conflict',
  ALREADY_EXISTS: 'conflict',
  ABORTED: 'conflict',
  NOT_FOUND: 'missing',
  RESOURCE_EXHAUSTED: 'quota',
  INVALID_ARGUMENT: 'bad',
};

/**
 * cfg: { apiKey, projectId, emulator?: { auth: 'http://127.0.0.1:9099', firestore: 'http://127.0.0.1:8085' } }
 * opts.session: { uid, refresh } to resume; opts.onSession(session) is told about new credentials.
 */
export function createClient(cfg, opts = {}) {
  const doFetch = opts.fetch || ((...a) => fetch(...a));
  const timeoutMs = opts.timeout || 12000;
  const emu = cfg.emulator || {};
  const authBase = (emu.auth ? `${emu.auth}/` : 'https://') + 'identitytoolkit.googleapis.com/v1';
  const tokenBase = (emu.auth ? `${emu.auth}/` : 'https://') + 'securetoken.googleapis.com/v1';
  const dbName = `projects/${cfg.projectId}/databases/(default)/documents`;
  const fsBase = `${emu.firestore || 'https://firestore.googleapis.com'}/v1/${dbName}`;
  const full = (path) => `${dbName}/${path}`;

  let session = opts.session?.refresh ? { uid: opts.session.uid, refresh: opts.session.refresh, token: null, exp: 0 } : null;
  let clockOffset = 0; // server time − local time, learnt from responses
  let signing = null;

  async function call(url, { method = 'POST', body, form, token, raw, timeout = timeoutMs } = {}) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeout) : 0;
    let res;
    try {
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      let payload;
      if (form) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        payload = new URLSearchParams(form).toString();
      } else if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }
      res = await doFetch(url, { method, headers, body: payload, signal: ctl?.signal });
    } catch (e) {
      throw new OnlineError('offline', String(e?.message || e));
    } finally {
      clearTimeout(timer);
    }
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const err = (Array.isArray(data) ? data[0]?.error : data?.error) || {};
      const status = err.status || '';
      const msg = err.message || `HTTP ${res.status}`;
      let code = STATUS_CODES[status] || (res.status === 403 ? 'denied' : res.status === 429 ? 'quota' : res.status >= 500 ? 'server' : 'bad');
      if (/TOKEN_EXPIRED|INVALID_REFRESH_TOKEN|USER_NOT_FOUND|USER_DISABLED|INVALID_ID_TOKEN/.test(msg)) code = 'auth';
      throw new OnlineError(code, msg, res.status);
    }
    return raw ? res : data;
  }

  function learnTime(iso) {
    const t = Date.parse(iso || '');
    if (t) clockOffset = t - Date.now();
  }

  async function signUp() {
    const d = await call(`${authBase}/accounts:signUp?key=${encodeURIComponent(cfg.apiKey)}`, { body: { returnSecureToken: true } });
    session = { uid: d.localId, refresh: d.refreshToken, token: d.idToken, exp: Date.now() + (Number(d.expiresIn) || 3600) * 1000 };
    opts.onSession?.({ uid: session.uid, refresh: session.refresh });
    return session;
  }

  async function refresh() {
    const d = await call(`${tokenBase}/token?key=${encodeURIComponent(cfg.apiKey)}`, { form: { grant_type: 'refresh_token', refresh_token: session.refresh } });
    session = { uid: d.user_id || session.uid, refresh: d.refresh_token || session.refresh, token: d.id_token, exp: Date.now() + (Number(d.expires_in) || 3600) * 1000 };
    opts.onSession?.({ uid: session.uid, refresh: session.refresh });
    return session;
  }

  /** A valid ID token, signing in anonymously the first time. */
  async function token() {
    if (session?.token && session.exp - Date.now() > 60000) return session.token;
    if (!signing) {
      signing = (async () => {
        if (session?.refresh) {
          try {
            return await refresh();
          } catch (e) {
            if (e.code !== 'auth') throw e;
            // The account was deleted or the token revoked: start over.
            session = null;
          }
        }
        return signUp();
      })().finally(() => (signing = null));
    }
    return (await signing).token;
  }

  const docOut = (d) => (d && d.name ? { id: d.name.split('/').pop(), path: d.name.slice(dbName.length + 1), data: decFields(d.fields), updateTime: d.updateTime } : null);
  // Reads are public (see firestore.rules): they only carry the player's token
  // once there is one, so looking at a ranking never creates an account.
  const readToken = async () => (session ? token() : null);
  const keyQ = `?key=${encodeURIComponent(cfg.apiKey)}`;

  /** One document, or null. */
  async function get(path, { timeout } = {}) {
    try {
      return docOut(await call(`${fsBase}/${path}${keyQ}`, { method: 'GET', token: await readToken(), timeout }));
    } catch (e) {
      if (e.code === 'missing') return null;
      throw e;
    }
  }

  /** Several documents in one round trip: an array aligned with `paths` (null = missing). */
  async function getAll(paths) {
    if (!paths.length) return [];
    const res = await call(`${fsBase}:batchGet${keyQ}`, { body: { documents: paths.map(full) }, token: await readToken() });
    const byName = new Map();
    for (const r of res || []) {
      if (r.readTime) learnTime(r.readTime);
      if (r.found) byName.set(r.found.name, docOut(r.found));
    }
    return paths.map((p) => byName.get(full(p)) || null);
  }

  const filterOf = (where) =>
    where ? { fieldFilter: { field: { fieldPath: where.field }, op: where.op, value: enc(where.value) } } : undefined;

  /** Documents of `collection` under `parent` ('' for the root), ordered by one field. */
  async function query(parent, collection, { orderBy, direction = 'ASCENDING', where, limit = 20 } = {}) {
    const sq = { from: [{ collectionId: collection }], limit };
    if (orderBy) sq.orderBy = [{ field: { fieldPath: orderBy }, direction }];
    const w = filterOf(where);
    if (w) sq.where = w;
    const res = await call(`${fsBase}${parent ? '/' + parent : ''}:runQuery${keyQ}`, { body: { structuredQuery: sq }, token: await readToken() });
    const out = [];
    for (const r of res || []) {
      if (r.readTime) learnTime(r.readTime);
      if (r.document) out.push(docOut(r.document));
    }
    return out;
  }

  /** How many documents of `collection` under `parent` match `where`. */
  async function count(parent, collection, where) {
    const sq = { from: [{ collectionId: collection }] };
    const w = filterOf(where);
    if (w) sq.where = w;
    const res = await call(`${fsBase}${parent ? '/' + parent : ''}:runAggregationQuery${keyQ}`, {
      body: { structuredAggregationQuery: { structuredQuery: sq, aggregations: [{ alias: 'n', count: {} }] } },
      token: await readToken(),
    });
    for (const r of res || []) {
      if (r.readTime) learnTime(r.readTime);
      const n = r.result?.aggregateFields?.n;
      if (n) return Number(n.integerValue || 0);
    }
    return 0;
  }

  /**
   * Atomic writes. Each op: { set: path, data, create?, updateTime?, serverTime?: [fields] }
   * or { del: path, exists? }. Returns the commit result (with server times).
   */
  async function commit(ops) {
    const writes = ops.map((op) => {
      if (op.del) {
        const w = { delete: full(op.del) };
        if (op.exists !== undefined) w.currentDocument = { exists: op.exists };
        return w;
      }
      const w = { update: { name: full(op.set), fields: encFields(op.data) } };
      if (op.create) w.currentDocument = { exists: false };
      else if (op.updateTime) w.currentDocument = { updateTime: op.updateTime };
      else if (op.mustExist) w.currentDocument = { exists: true };
      if (op.serverTime?.length) w.updateTransforms = op.serverTime.map((f) => ({ fieldPath: f, setToServerValue: 'REQUEST_TIME' }));
      return w;
    });
    const res = await call(`${fsBase}:commit${keyQ}`, { body: { writes }, token: await token() });
    learnTime(res?.commitTime);
    return res;
  }

  /** Deletes the anonymous account itself (after its data). */
  async function deleteAccount() {
    if (!session) return;
    const tk = await token();
    await call(`${authBase}/accounts:delete?key=${encodeURIComponent(cfg.apiKey)}`, { body: { idToken: tk } });
    session = null;
    opts.onSession?.(null);
  }

  return {
    get uid() {
      return session?.uid || null;
    },
    /** Signs in if needed; returns the player's id. */
    async signIn() {
      await token();
      return session.uid;
    },
    /** Our best guess of the server's clock (ms). */
    now: () => Date.now() + clockOffset,
    get,
    getAll,
    query,
    count,
    commit,
    deleteAccount,
  };
}
