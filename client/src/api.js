export async function api(path, options = {}) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const type = res.headers.get('content-type') || '';
  return type.includes('application/json') ? res.json() : res.text();
}

export const getCurrentConversation = () => api('/api/conversations/current');
export const getMessages = (id) => api(`/api/conversations/${id}/messages`);
export const getProviders = () => api('/api/providers');
export const getTemplates = () => api('/api/templates');
export const getPersonas = () => api('/api/personas');
export const getAllAssets = () => api('/api/assets');
export const getAssetLibrary = () => api('/api/asset-library');
export const getJobs = () => api('/api/jobs');
export const updateProvider = (id, payload) => api(`/api/providers/${id}`, { method:'PATCH', headers:{ 'content-type':'application/json' }, body:JSON.stringify(payload) });

export async function uploadAsset({ conversationId, kind, file }) {
  const form = new FormData();
  form.append('conversationId', conversationId);
  form.append('kind', kind);
  form.append('file', file);
  return api('/api/assets/upload', { method: 'POST', body: form });
}

export async function generate(payload) {
  return api('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export const saveResultToAssets = (id) => api(`/api/results/${id}/save-to-assets`, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({}) });
export const regenerateResult = (id) => api(`/api/results/${id}/regenerate`, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({}) });
export const downloadResource = (payload) => api('/api/resources/download', { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify(payload) });
