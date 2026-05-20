function withQuery(path, query) {
  if (!query || typeof query !== 'object') return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  if (!qs) return path;
  return path.includes('?') ? `${path}&${qs}` : `${path}?${qs}`;
}

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function asJsonBody(body, headers) {
  if (body === undefined || body === null) return { body: undefined, headers };
  if (isFormData(body)) return { body, headers };
  const nextHeaders = { ...headers };
  if (!Object.keys(nextHeaders).some((key) => key.toLowerCase() === 'content-type')) {
    nextHeaders['content-type'] = 'application/json';
  }
  return { body: JSON.stringify(body), headers: nextHeaders };
}

export async function api(path, options = {}) {
  const {
    method = 'GET',
    headers = {},
    query,
    body,
    rawBody,
  } = options;

  const url = withQuery(path, query);
  const normalizedHeaders = { ...headers };
  const normalized = rawBody ? { body, headers: normalizedHeaders } : asJsonBody(body, normalizedHeaders);
  const response = await fetch(url, {
    method,
    headers: normalized.headers,
    body: normalized.body,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const message = isJson
      ? payload?.error?.message || payload?.error || payload?.message || `HTTP ${response.status}`
      : payload || `HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

function enc(value) {
  return encodeURIComponent(String(value));
}

// ---------------------------------------------------------------------------
// OpenDesign daemon API client (primary)
// ---------------------------------------------------------------------------

export const listProjects = () => api('/api/projects');
export const createProject = (payload) => api('/api/projects', { method: 'POST', body: payload });

export const listConversations = (projectId) => api(`/api/projects/${enc(projectId)}/conversations`);
export const createConversation = (projectId, payload = {}) => api(
  `/api/projects/${enc(projectId)}/conversations`,
  { method: 'POST', body: payload },
);

export const listMessages = (projectId, conversationId) => api(
  `/api/projects/${enc(projectId)}/conversations/${enc(conversationId)}/messages`,
);
export const putMessage = (projectId, conversationId, messageId, payload) => api(
  `/api/projects/${enc(projectId)}/conversations/${enc(conversationId)}/messages/${enc(messageId)}`,
  { method: 'PUT', body: payload },
);

export async function uploadProjectFiles(projectId, files) {
  const form = new FormData();
  for (const file of files || []) form.append('files', file);
  return api(`/api/projects/${enc(projectId)}/upload`, {
    method: 'POST',
    body: form,
    rawBody: true,
  });
}

export const getMediaModels = () => api('/api/media/models');
export const generateProjectMedia = (projectId, payload) => api(
  `/api/projects/${enc(projectId)}/media/generate`,
  { method: 'POST', body: payload },
);
export const waitMediaTask = (taskId, payload = {}) => api(
  `/api/media/tasks/${enc(taskId)}/wait`,
  { method: 'POST', body: payload },
);
export const listProjectMediaTasks = (projectId, query = {}) => api(
  `/api/projects/${enc(projectId)}/media/tasks`,
  { query },
);
export const listProjectFiles = (projectId) => api(`/api/projects/${enc(projectId)}/files`);

export const getProviders = () => api('/api/providers');
export const getAdminMediaConfig = (token) => api('/api/admin/media/config', {
  headers: { 'x-od-admin-token': token },
});
export const putAdminMediaConfig = (token, payload) => api('/api/admin/media/config', {
  method: 'PUT',
  headers: { 'x-od-admin-token': token },
  body: payload,
});
