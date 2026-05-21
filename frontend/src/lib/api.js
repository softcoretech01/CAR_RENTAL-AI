const BASE = '/api/v1';

async function handle(r) {
  if (r.ok) { if (r.status === 204) return null; return r.json(); }
  let msg = r.statusText;
  try { const t = await r.text(); if (t) msg = t; } catch {}
  throw new Error(msg);
}

export const api = {
  get: (path) => fetch(`${BASE}${path}`).then(handle),
  post: (path, body) => fetch(`${BASE}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle),
  patch: (path, body = {}) => fetch(`${BASE}${path}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle),
  delete: (path) => fetch(`${BASE}${path}`, { method: 'DELETE' }).then(handle),
  postFile: (path, file, field = 'file') => {
    const form = new FormData();
    form.append(field, file);
    return fetch(`${BASE}${path}`, { method: 'POST', body: form }).then(handle);
  },
};
