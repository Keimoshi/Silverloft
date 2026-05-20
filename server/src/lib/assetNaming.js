const LABELS = { image: '图片', video: '视频', audio: '音频' };
const PREFIX = { image: 'image', video: 'video', audio: 'audio' };

export function nextAssetName(db, conversationId, kind, ext = '') {
  const row = db.prepare('SELECT COUNT(*) as c FROM assets WHERE conversation_id=? AND kind=?').get(conversationId, kind);
  const n = Number(row?.c || 0) + 1;
  const padded = String(n).padStart(3, '0');
  const label = LABELS[kind] || '素材';
  const prefix = PREFIX[kind] || 'asset';
  return { index: n, alias: `${label}${n}`, mention: `@${label}${n}`, storageName: `${prefix}_${padded}${ext}` };
}
