export function resolveMentions(db, conversationId, mentions = [], prompt = '') {
  const found = new Set([...(mentions || [])]);
  for (const m of prompt.matchAll(/@[\u4e00-\u9fa5]+\d+/g)) found.add(m[0]);
  const resolved = [];
  for (const mention of found) {
    const row = db.prepare('SELECT * FROM assets WHERE conversation_id=? AND mention=?').get(conversationId, mention);
    if (!row) throw Object.assign(new Error(`未知素材引用：${mention}`), { status: 400 });
    resolved.push({ mention, assetId: row.id, alias: row.alias, path: row.path, storageName: row.storage_name, kind: row.kind });
  }
  return resolved;
}
