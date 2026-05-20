import React, { useEffect, useMemo, useState } from "react";
import { getAdminMediaConfig, getProviders, putAdminMediaConfig } from "../api";
import { Button } from "../components/Button";

const TOKEN_STORAGE_KEY = "od-admin-token";

function providerRowsFromStatus(status) {
  const providers = status?.providers || {};
  const rows = Array.isArray(providers) ? providers : Object.values(providers);
  return rows
    .filter(Boolean)
    .map((provider) => ({
      ...provider,
      name: provider.name || provider.label || provider.id,
    }))
    .sort((a, b) => {
      if (Boolean(a.integrated) !== Boolean(b.integrated)) return a.integrated ? -1 : 1;
      return String(a.name || a.id).localeCompare(String(b.name || b.id));
    });
}

function adminStatusLabel(entry) {
  if (!entry?.configured) return "Unset";
  if (entry.source === "stored" && entry.apiKeyTail) return `Stored *${entry.apiKeyTail}`;
  if (entry.source === "env") return "Environment";
  if (entry.source?.startsWith("oauth")) return "OAuth";
  if (entry.source === "codex-auth") return "Codex auth";
  return "Configured";
}

function readSavedToken() {
  try {
    return window.localStorage?.getItem(TOKEN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function rememberToken(token) {
  try {
    if (token) window.localStorage?.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // localStorage can be unavailable in private contexts; token still works for this session.
  }
}

function ProviderEditor({ provider, entry, draft, onDraftChange, onClear }) {
  const providerName = provider.name || provider.id;
  const configured = Boolean(entry?.configured || provider.configured);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-[18px] font-black text-slate-800">{providerName}</h4>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{provider.hint || provider.id}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${configured ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
          {adminStatusLabel(entry || provider)}
        </span>
      </div>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-500">API Key</span>
          <input
            aria-label={`${providerName} API Key`}
            value={draft.apiKey || ""}
            onChange={(e) => onDraftChange(provider.id, { apiKey: e.target.value })}
            placeholder={configured ? "留空保持当前密钥；输入新密钥则替换" : "输入 API Key"}
            type="password"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-500">Base URL</span>
          <input
            aria-label={`${providerName} Base URL`}
            value={draft.baseUrl ?? entry?.baseUrl ?? ""}
            onChange={(e) => onDraftChange(provider.id, { baseUrl: e.target.value })}
            placeholder={provider.defaultBaseUrl || "https://api.example.com/v1"}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <div className="rounded-xl bg-white/80 px-4 py-3 text-xs font-semibold leading-5 text-slate-500 ring-1 ring-slate-200">
          Source: {entry?.source || provider.source || "unset"} · Integrated: {provider.integrated ? "yes" : "pending"}
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={() => onClear(provider.id)}>清空该 Provider</Button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [providerStatus, setProviderStatus] = useState([]);
  const [adminToken, setAdminToken] = useState(() => readSavedToken());
  const [config, setConfig] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [clearedProviderIds, setClearedProviderIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const providers = useMemo(() => providerRowsFromStatus({ providers: providerStatus }), [providerStatus]);

  useEffect(() => {
    getProviders()
      .then((data) => setProviderStatus(providerRowsFromStatus(data)))
      .catch((err) => console.error("Failed to fetch providers:", err));
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (adminToken.trim()) loadConfig(adminToken);
  }, []);

  function showToast(message) {
    setToast(message);
  }

  function resetDrafts(nextConfig) {
    const nextDrafts = {};
    const allProviderIds = new Set([...providers.map((provider) => provider.id), ...Object.keys(nextConfig?.providers || {})]);
    for (const providerId of allProviderIds) {
      nextDrafts[providerId] = { baseUrl: nextConfig?.providers?.[providerId]?.baseUrl || "" };
    }
    setDrafts(nextDrafts);
  }

  async function loadConfig(tokenOverride = adminToken) {
    const token = tokenOverride.trim();
    if (!token || loading) return;
    setLoading(true);
    try {
      const nextConfig = await getAdminMediaConfig(token);
      setConfig(nextConfig);
      setClearedProviderIds(new Set());
      resetDrafts(nextConfig);
      rememberToken(token);
      showToast("Provider configuration loaded.");
    } catch (err) {
      showToast(`加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(providerId, patch) {
    setDrafts((current) => ({
      ...current,
      [providerId]: { ...(current[providerId] || {}), ...patch },
    }));
    setClearedProviderIds((current) => {
      if (!current.has(providerId)) return current;
      const next = new Set(current);
      next.delete(providerId);
      return next;
    });
  }

  function clearProvider(providerId) {
    setDrafts((current) => ({ ...current, [providerId]: { apiKey: "", baseUrl: "" } }));
    setClearedProviderIds((current) => new Set(current).add(providerId));
  }

  async function saveConfig() {
    const token = adminToken.trim();
    if (!token || saving) return;
    setSaving(true);
    try {
      const payload = {};
      const allProviderIds = new Set([...providers.map((provider) => provider.id), ...Object.keys(config?.providers || {})]);
      for (const providerId of allProviderIds) {
        if (clearedProviderIds.has(providerId)) {
          payload[providerId] = { apiKey: "", baseUrl: "" };
          continue;
        }
        const current = config?.providers?.[providerId];
        const draft = drafts[providerId] || {};
        const entry = {};
        if (typeof draft.apiKey === "string" && draft.apiKey.trim()) entry.apiKey = draft.apiKey.trim();
        entry.baseUrl = typeof draft.baseUrl === "string" ? draft.baseUrl.trim() : (current?.baseUrl || "");
        if (entry.apiKey !== undefined || entry.baseUrl || current?.configured || providers.some((provider) => provider.id === providerId)) {
          payload[providerId] = entry;
        }
      }
      const nextConfig = await putAdminMediaConfig(token, { providers: payload });
      setConfig(nextConfig);
      setClearedProviderIds(new Set());
      resetDrafts(nextConfig);
      rememberToken(token);
      showToast("Provider configuration saved.");
    } catch (err) {
      showToast(`保存失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {toast ? (
        <div className="fixed right-5 top-5 z-[90] rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl" role="status">
          {toast}
        </div>
      ) : null}
      <div className="mx-auto max-w-[1040px] px-5 py-12 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-[32px] font-black text-slate-950">管理员控制台</h2>
            <p className="mt-2 text-[15px] font-medium text-slate-500">
              使用 OpenDesign daemon 的 Admin media config 管理媒体 Provider 密钥与 Base URL。
            </p>
          </div>
          <Button variant="secondary" onClick={() => { window.location.href = "/"; }}>
            返回主页
          </Button>
        </div>

        <div className="mb-6 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-500">Admin Token</span>
              <input
                aria-label="Admin Token"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                type="password"
                autoComplete="off"
                placeholder="输入 daemon admin token"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => loadConfig()} disabled={!adminToken.trim() || loading}>
                {loading ? "加载中..." : "加载配置"}
              </Button>
              <Button onClick={saveConfig} disabled={!adminToken.trim() || saving}>
                {saving ? "保存中..." : "保存全部配置"}
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            Token 仅保存到本机 localStorage；请求会通过 x-od-admin-token header 发送到 daemon。
          </p>
        </div>

        <div className="grid gap-6 rounded-[28px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[20px] font-black text-slate-950">媒体 Provider 配置</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Provider 状态来自 /api/providers，密钥和 Base URL 通过 /api/admin/media/config 管理。
              </p>
            </div>
          </div>
          <div className="mt-2 grid gap-5 md:grid-cols-2">
            {providers.map((provider) => (
              <ProviderEditor
                key={provider.id}
                provider={provider}
                entry={config?.providers?.[provider.id]}
                draft={drafts[provider.id] || {}}
                onDraftChange={updateDraft}
                onClear={clearProvider}
              />
            ))}
            {providers.length === 0 && (
              <div className="col-span-full rounded-2xl bg-slate-50 p-12 text-center text-sm font-semibold text-slate-400">
                加载中或没有获取到模型服务配置...
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
