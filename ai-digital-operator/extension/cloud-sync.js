const ShadowCloud = (() => {
  function apiBase(projectId) {
    return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  }

  function authHeaders(idToken) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    };
  }

  function firestoreFields(payload, meta = {}) {
    return {
      json: { stringValue: JSON.stringify(payload) },
      kind: { stringValue: String(meta.kind || '') },
      deviceId: { stringValue: String(meta.deviceId || '') },
      updatedAt: { timestampValue: meta.updatedAt || new Date().toISOString() }
    };
  }

  function parseFirestoreDoc(doc) {
    try {
      return {
        name: doc.name,
        id: doc.name?.split('/').pop() || null,
        kind: doc.fields?.kind?.stringValue || '',
        deviceId: doc.fields?.deviceId?.stringValue || '',
        updatedAt: doc.fields?.updatedAt?.timestampValue || null,
        payload: JSON.parse(doc.fields?.json?.stringValue || '{}')
      };
    } catch {
      return null;
    }
  }

  async function signIn(config, email, password) {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Firebase login failed');
    return {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      uid: data.localId,
      email: data.email || email,
      expiresAt: Date.now() + (Number(data.expiresIn || 3600) - 120) * 1000
    };
  }

  async function refresh(config, refreshToken) {
    const url = `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(config.apiKey)}`;
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Firebase token refresh failed');
    return {
      idToken: data.id_token,
      refreshToken: data.refresh_token || refreshToken,
      uid: data.user_id,
      expiresAt: Date.now() + (Number(data.expires_in || 3600) - 120) * 1000
    };
  }

  async function ensureToken(config, auth) {
    if (!auth?.refreshToken) throw new Error('Cloud sync is not connected');
    if (auth.idToken && Number(auth.expiresAt || 0) > Date.now()) return auth;
    const refreshed = await refresh(config, auth.refreshToken);
    return { ...auth, ...refreshed };
  }

  function docName(config, uid, collection, id) {
    return `projects/${config.projectId}/databases/(default)/documents/shadowAgents/${uid}/${collection}/${id}`;
  }

  async function commit(config, auth, uid, operations) {
    if (!operations.length) return { token: auth, writeResults: [] };
    const token = await ensureToken(config, auth);
    if (token.uid !== uid) throw new Error('Cloud user scope mismatch');
    const writes = operations.map((op) => ({
      update: {
        name: docName(config, uid, op.collection, op.id),
        fields: firestoreFields(op.payload, {
          kind: op.kind,
          deviceId: op.deviceId,
          updatedAt: op.updatedAt
        })
      }
    }));

    const response = await fetch(`${apiBase(config.projectId)}:commit`, {
      method: 'POST',
      headers: authHeaders(token.idToken),
      body: JSON.stringify({ writes })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Firestore sync failed');
    return { token, writeResults: data.writeResults || [] };
  }

  async function listCollection(config, auth, uid, collection, pageSize = 250) {
    const token = await ensureToken(config, auth);
    if (token.uid !== uid) throw new Error('Cloud user scope mismatch');
    const url = `${apiBase(config.projectId)}/shadowAgents/${encodeURIComponent(uid)}/${encodeURIComponent(collection)}?pageSize=${Math.min(1000, pageSize)}`;
    const response = await fetch(url, { headers: authHeaders(token.idToken) });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `Failed to load ${collection}`);
    const items = (data.documents || []).map(parseFirestoreDoc).filter(Boolean);
    return { token, items };
  }

  return { signIn, refresh, ensureToken, commit, listCollection };
})();
