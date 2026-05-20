import { useMemo, useRef, useState } from 'react';

import { MEDIA_PROVIDERS } from '../media/models';
import { fetchAdminMediaConfig, saveAdminMediaConfig } from '../providers/registry';
import type {
  AdminMediaConfigResponse,
  AdminMediaProviderConfig,
  MediaProviderConfigInput,
} from '../types';

type ProviderDraft = Partial<MediaProviderConfigInput>;
type ProviderDrafts = Record<string, ProviderDraft>;

interface Props {
  daemonLive: boolean;
}

type AdminStatus =
  | { kind: 'idle'; text: string }
  | { kind: 'ok'; text: string }
  | { kind: 'error'; text: string };

function adminStatusLabel(entry: AdminMediaProviderConfig | undefined): string {
  if (!entry?.configured) return '未设置 (Unset)';
  if (entry.source === 'stored' && entry.apiKeyTail) return `已存储 (Stored) *${entry.apiKeyTail}`;
  if (entry.source === 'env') return '环境变量 (Environment)';
  if (entry.source?.startsWith('oauth')) return 'OAuth授权';
  if (entry.source === 'codex-auth') return 'Codex授权';
  return '已配置 (Configured)';
}

export function AdminView({ daemonLive }: Props) {
  const [adminToken, setAdminToken] = useState('');
  const [config, setConfig] = useState<AdminMediaConfigResponse | null>(null);
  const [drafts, setDrafts] = useState<ProviderDrafts>({});
  const [clearedProviderIds, setClearedProviderIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<AdminStatus>({
    kind: 'idle',
    text: '请输入守护进程管理员 token (admin token) 以管理媒体提供商凭证。',
  });

  const visibleProviders = useMemo(
    () =>
      MEDIA_PROVIDERS.filter((p) => p.settingsVisible !== false)
        .slice()
        .sort((a, b) => {
          if (a.integrated !== b.integrated) return a.integrated ? -1 : 1;
          return a.label.localeCompare(b.label);
        }),
    [],
  );

  const loadConfig = async () => {
    const token = tokenInputRef.current?.value.trim() || adminToken.trim();
    if (!token || loading) return;
    setLoading(true);
    setStatus({ kind: 'idle', text: '加载提供商配置中...' });
    const next = await fetchAdminMediaConfig(token);
    setLoading(false);
    if (!next) {
      setStatus({
        kind: 'error',
        text: 'Admin token 被拒绝或守护进程不可用。',
      });
      return;
    }
    setConfig(next);
    setClearedProviderIds(new Set());
    setDrafts(
      Object.fromEntries(
        visibleProviders.map((provider) => [
          provider.id,
          { baseUrl: next.providers[provider.id]?.baseUrl ?? '' },
        ]),
      ),
    );
    setStatus({ kind: 'ok', text: '提供商配置已加载。' });
  };

  const saveConfig = async () => {
    const token = tokenInputRef.current?.value.trim() || adminToken.trim();
    if (!token || saving) return;
    setSaving(true);
    setStatus({ kind: 'idle', text: '保存提供商配置中...' });
    const payload: ProviderDrafts = {};
    const providerIds = new Set([
      ...visibleProviders.map((provider) => provider.id),
      ...Object.keys(config?.providers ?? {}),
    ]);
    for (const providerId of providerIds) {
      const current = config?.providers[providerId];
      if (clearedProviderIds.has(providerId)) {
        payload[providerId] = { apiKey: '', baseUrl: '' };
        continue;
      }
      const draft = drafts[providerId] ?? {};
      const entry: Partial<MediaProviderConfigInput> = {};
      if (typeof draft.apiKey === 'string') {
        entry.apiKey = draft.apiKey.trim();
      }
      entry.baseUrl =
        typeof draft.baseUrl === 'string'
          ? draft.baseUrl.trim()
          : (current?.baseUrl ?? '');
      if (entry.apiKey !== undefined || entry.baseUrl || current?.configured) {
        payload[providerId] = entry;
      }
    }
    const next = await saveAdminMediaConfig(token, { providers: payload });
    setSaving(false);
    if (!next) {
      setStatus({
        kind: 'error',
        text: '保存失败。请检查 admin token 及守护进程日志。',
      });
      return;
    }
    setConfig(next);
    setClearedProviderIds(new Set());
    setDrafts(
      Object.fromEntries(
        visibleProviders.map((provider) => [
          provider.id,
          { baseUrl: next.providers[provider.id]?.baseUrl ?? '' },
        ]),
      ),
    );
    setStatus({ kind: 'ok', text: '提供商配置已保存。' });
  };

  const updateDraft = (providerId: string, patch: ProviderDraft) => {
    setDrafts((curr) => ({
      ...curr,
      [providerId]: { ...(curr[providerId] ?? {}), ...patch },
    }));
    setClearedProviderIds((curr) => {
      if (!curr.has(providerId)) return curr;
      const next = new Set(curr);
      next.delete(providerId);
      return next;
    });
  };

  const clearProvider = (providerId: string) => {
    setDrafts((curr) => ({
      ...curr,
      [providerId]: { apiKey: '', baseUrl: '' },
    }));
    setClearedProviderIds((curr) => {
      const next = new Set(curr);
      next.add(providerId);
      return next;
    });
  };

  const canSubmitToken = Boolean(adminToken.trim()) && !loading;

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div>
          <span className="admin-kicker">管理控制台</span>
          <h1>媒体提供商配置</h1>
        </div>
        <span className={`admin-live-pill${daemonLive ? ' on' : ''}`}>
          {daemonLive ? '守护进程在线' : '守护进程离线'}
        </span>
      </header>

      <section className="admin-panel admin-auth-panel">
        <div>
          <h2>访问令牌 (Access token)</h2>
          <p>
            凭证由本地守护进程存储，不会保存在常规网络设置或浏览器 localStorage 中。
          </p>
        </div>
        <form
          className="admin-token-form"
          onSubmit={(event) => {
            event.preventDefault();
            void loadConfig();
          }}
        >
          <input
            ref={tokenInputRef}
            type="password"
            value={adminToken}
            placeholder="OD_ADMIN_TOKEN"
            autoComplete="current-password"
            onChange={(event) => setAdminToken(event.target.value)}
          />
          <button
            type="submit"
            className="primary"
            disabled={!canSubmitToken}
          >
            {loading ? '加载中...' : '解锁'}
          </button>
        </form>
        <p className={`admin-status ${status.kind}`} role="status">
          {status.text}
        </p>
      </section>

      <section className="admin-panel">
        <div className="admin-section-head">
          <div>
            <h2>提供商 (Providers)</h2>
            <p>将 API 密钥字段留空以保留现有的存储密钥。</p>
          </div>
          <button
            type="button"
            className="primary"
            disabled={!config || saving}
            onClick={() => void saveConfig()}
          >
            {saving ? '保存中...' : '保存更改'}
          </button>
        </div>
        <div className="admin-provider-list">
          {visibleProviders.map((provider) => {
            const entry = config?.providers[provider.id];
            const draft = drafts[provider.id] ?? {};
            const markedForClear = clearedProviderIds.has(provider.id);
            const disabled = !config || !provider.integrated;
            return (
              <article
                key={provider.id}
                className={`admin-provider-row${provider.integrated ? '' : ' pending'}`}
              >
                <div className="admin-provider-copy">
                  <div className="admin-provider-title">
                    <h3>{provider.label}</h3>
                    <span
                      className={`admin-provider-badge${entry?.configured ? ' configured' : ''}`}
                    >
                      {adminStatusLabel(entry)}
                    </span>
                  </div>
                  <p>{provider.hint}</p>
                  {provider.docsUrl ? (
                    <a href={provider.docsUrl} target="_blank" rel="noreferrer">
                      提供商文档
                    </a>
                  ) : null}
                </div>
                <div className="admin-provider-fields">
                  <label className="field">
                    <span className="field-label">API 密钥 (API key)</span>
                    <input
                      type="password"
                      value={draft.apiKey ?? ''}
                      placeholder={
                        markedForClear
                          ? '将清除存储的密钥'
                          : entry?.apiKeyTail
                            ? `保留以 ${entry.apiKeyTail} 结尾的存储密钥`
                            : '粘贴 API 密钥'
                      }
                      disabled={disabled || markedForClear}
                      onChange={(event) =>
                        updateDraft(provider.id, { apiKey: event.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">基础 URL (Base URL)</span>
                    <input
                      type="url"
                      inputMode="url"
                      value={draft.baseUrl ?? ''}
                      placeholder={provider.defaultBaseUrl || '默认提供商 URL'}
                      disabled={disabled || markedForClear}
                      onChange={(event) =>
                        updateDraft(provider.id, { baseUrl: event.target.value })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="ghost admin-clear-btn"
                    disabled={!config || !entry?.configured}
                    onClick={() =>
                      markedForClear
                        ? updateDraft(provider.id, {
                            apiKey: undefined,
                            baseUrl: entry?.baseUrl ?? '',
                          })
                        : clearProvider(provider.id)
                    }
                  >
                    {markedForClear ? '保留当前值' : '清除存储的值'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
