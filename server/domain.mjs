import {STORY_NAMES} from '../shared/storyResidents.js';
import { ApiError, digest, email, fail, now, string, uid } from './security.mjs';
import { generateReport, ROLES, modelConfigured } from './agents.mjs';

export const DEFAULT_AVATAR = { style: 'pixel-v1', body: '#587b6b', hair: '#5b4132', skin: '#efbc91', hat: '#d29a54' };
const TEST_AVATAR = { style: 'pixel-v1', body: '#8870a3', hair: '#283d50', skin: '#dcae83', hat: '#9db6be' };
// The user explicitly authorized reusing this existing public profile on 2026-10-03.
const AUTHORIZED_OWNER = { name: '朱烁光', bio: '我是朱烁光，关注数据分析、统计建模、机器学习与 AI 工作流，希望把复杂问题沉淀成清晰、可靠、可复用的工具。', background: '数据科学专业；数据分析、统计建模与机器学习。', projects: [], avatar: DEFAULT_AVATAR, confirmed: true };
export function avatar(raw, fallback = DEFAULT_AVATAR) {
  const valid = raw && ['body', 'hair', 'skin', 'hat'].every(key => /^#[0-9a-f]{6}$/i.test(raw[key] || ''));
  return { value: valid ? Object.fromEntries(['body', 'hair', 'skin', 'hat'].map(key => [key, raw[key]]).concat([['style', 'pixel-v1']])) : { ...fallback }, fallback: !valid };
}
function projects(raw = []) {
  if (!Array.isArray(raw) || raw.length > 12) fail(400, 'invalid_projects', '最多配置 12 个作品。');
  return raw.map(p => {
    const url = string(p.url, '作品链接', 1000);
    if (url && !/^https?:\/\//i.test(url)) fail(400, 'invalid_project_url', '作品链接须使用 HTTP 或 HTTPS。');
    return { title: string(p.title, '作品名称', 100, true), description: string(p.description, '作品说明', 2000), url };
  });
}
export function publicProfile(raw, { test = false } = {}) {
  if (!raw || typeof raw !== 'object') fail(400, 'invalid_profile', '公开资料格式不正确。');
  const result = {
    name: string(raw.name, '公开称呼', 80), bio: string(raw.bio, '公开介绍', 3000), background: string(raw.background, '工作背景', 5000),
    projects: projects(raw.projects), avatar: avatar(raw.avatar, test ? TEST_AVATAR : DEFAULT_AVATAR).value,
    confirmed: raw.confirmed === true,
  };
  if (test) result.consent = raw.consent === true;
  if (result.confirmed && (!result.name || !result.bio || !result.background)) fail(400, 'profile_incomplete', '确认公开前，请填写称呼、介绍和工作背景。');
  if (test && result.confirmed && !result.consent) fail(400, 'test_consent_required', '测试岛须确认资料真实且已获准使用。');
  return result;
}
export function normalizeFilter(raw = {}) {
  for (const key of ['focus', 'priorities', 'avoid', 'tone', 'length', 'examples', 'specialty']) if (Object.hasOwn(raw, key) && typeof raw[key] !== 'string') fail(400, 'invalid_filter', `过滤器 ${key} 须填写文字。`);
  return Object.fromEntries(['focus', 'priorities', 'avoid', 'tone', 'length', 'examples', 'specialty'].map(key => [key, string(raw[key], `过滤器 ${key}`, key === 'examples' ? 6000 : 3000)]));
}
export function source(visitId, kind, label, text, extra = {}) {
  const paragraphs = text.split(/\n\s*\n|\r?\n/).map(p => p.trim()).filter(Boolean);
  return { id: uid('src'), visitId, kind, label, text, paragraphs, createdAt: now(), ...extra };
}
export function visitorPublic(visit) {
  if (!visit) return null;
  return Object.fromEntries(['id', 'kind', 'name', 'background', 'purpose', 'inputVersion', 'createdAt', 'updatedAt', 'consentAt', 'email', 'emailVerified'].map(key => [key, visit[key] ?? null]));
}
export function contactPublic(contact) {
  if (!contact) return null;
  return Object.fromEntries(['id', 'visitId', 'status', 'subject', 'body', 'to', 'replyTo', 'decision', 'inputVersion', 'createdAt', 'sentAt', 'error', 'source_refs', 'delivery', 'attachedInformation'].map(key => [key, contact[key] ?? null]));
}
export function jobPublic(job) {
  return Object.fromEntries(['id', 'roleId', 'inputVersion', 'filterVersion', 'status', 'error', 'errorCode', 'createdAt', 'completedAt', 'attempts', 'nextAttemptAt'].map(key => [key, job[key] ?? null]));
}

export class IslandDomain {
  constructor(store, options) {
    this.store = store; this.options = options; this.env = options.env; this.active = null; this.closing = false;
    if (!store.read('config', 'owner')) store.write('config', 'owner', {
      islandId: uid('island'), version: 1, filterVersion: 1, updatedAt: now(),
      public: AUTHORIZED_OWNER,
      private: { background: '', contactEmail: '', documents: [] },
      filter: { focus: '', priorities: '', avoid: '', tone: '清楚、朴素；保留来源与未确认事项', length: '简短但完整', examples: '', specialty: '' },
      testIsland: { name: '待配置的测试岛', bio: '开发占位身份；未使用真实人物资料，不能作为真实链路验收输入。', background: '', projects: [], avatar: TEST_AVATAR, confirmed: false, consent: false },
    });
    const existing = store.read('config', 'owner');
    if (existing.public.name === '待配置的岛主' && existing.version === 1 && !existing.public.confirmed) store.write('config', 'owner', { ...existing, public: AUTHORIZED_OWNER, updatedAt: now() });
    // Crash recovery never invents success. Reports and job completion commit together.
    store.transaction(() => {
      for (const job of store.all('jobs')) if (job.status === 'running') store.write('jobs', job.id, { ...job, status: 'queued', error: '服务重启后恢复队列，尚未确认处理完成。', nextAttemptAt: 0 });
      for (const c of store.all('owner_outreach')) if (c.status === 'sending') store.write('owner_outreach', c.id, { ...c, status: 'uncertain', error: '服务重启，邮件发送结果待核实。' });
      for (const c of store.all('contacts')) if (c.status === 'sending') store.write('contacts', c.id, { ...c, status: 'uncertain', error: '服务重启，邮件发送结果待核实。' });
    });
  }
  config() {const c=this.store.read('config','owner');if(c){c.personalization??={islandName:'云汀岛',npcNames:{}};if(!c.personalization.legacyNpcNames){c.personalization.legacyNpcNames={...c.personalization.npcNames};}c.personalization.npcNames={...STORY_NAMES};}return c;}
  published(test = false) {
    const config = this.config(); const p = test ? config.testIsland : config.public;
    if (!p.confirmed) return { name: test ? '待配置的测试岛' : '待配置的岛主', bio: '开发占位身份；真实公开资料尚未确认发布。', background: '', projects: [], avatar: test ? { ...TEST_AVATAR } : { ...DEFAULT_AVATAR }, confirmed: false, developmentPlaceholder: true, ...(test ? { consent: false } : {}) };
    return { ...p, projects: p.projects || [], avatar: { ...p.avatar }, ...(p.confirmed ? {} : { developmentPlaceholder: true }) };
  }
  identity(test = false) {
    const c = this.config(); const p = this.published(test);
    return { version: '1.0', id: test ? `${c.islandId}-test` : c.islandId, island_id: test ? `${c.islandId}-test` : c.islandId,
      name: p.name, bio: p.bio, background: p.background, projects: p.projects, avatar: p.avatar,
      confirmed: p.confirmed, developmentPlaceholder: !p.confirmed,
      ...(test ? { consent: p.consent } : {}), scope: ['public_identity', 'public_projects', 'snapshot_projection'], updatedAt: c.updatedAt };
  }
  updateConfig(raw) {
    const previous = this.config();
    const pub = raw.public ? publicProfile(raw.public) : previous.public;
    const privRaw = raw.private || previous.private;
    const docs = privRaw.documents ?? previous.private.documents;
    if (!Array.isArray(docs) || docs.length > 8) fail(400, 'invalid_documents', '最多配置 8 份私人文本资料。');
    const privateProfile = { background: string(privRaw.background, '私人工作背景', 6000), contactEmail: privRaw.contactEmail ? email(privRaw.contactEmail) : '',
      documents: docs.map(d => ({ name: string(d.name, '资料名', 200, true), text: string(d.text, '资料正文', 10000, true) })) };
    if (privateProfile.documents.reduce((n, d) => n + d.text.length, 0) > 20000) fail(400, 'owner_docs_too_large', '私人资料合计最多 20,000 字符。');
    const filter = raw.filter ? normalizeFilter({ ...previous.filter, ...raw.filter }) : previous.filter;
    const testIsland = raw.testIsland ? publicProfile(raw.testIsland, { test: true }) : previous.testIsland;
    const previousPersonalization = previous.personalization || { islandName: '云汀岛', npcNames: {} };
    const personalRaw = raw.personalization || previousPersonalization;
    const names = personalRaw.npcNames || previousPersonalization.npcNames;
    if (!names || typeof names !== 'object' || Array.isArray(names)) fail(400, 'invalid_npc_names', '居民名字配置无效。');
    const defaults = {main:'云舟',customs:'阿渡',archive:'知墨',curator:'织夏',liaison:'小邮',specialist:'星禾',wanderer:'松果'};
    const personalization = {islandName: string(personalRaw.islandName || previousPersonalization.islandName, '岛屿名称', 40, true), npcNames: {...STORY_NAMES},legacyNpcNames:previousPersonalization.legacyNpcNames||previousPersonalization.npcNames};
    const changedFilter = digest(JSON.stringify(filter)) !== digest(JSON.stringify(previous.filter));
    const next = { ...previous, public: pub, private: privateProfile, testIsland, filter, personalization, version: previous.version + 1,
      filterVersion: previous.filterVersion + (changedFilter ? 1 : 0), updatedAt: now() };
    this.store.write('config', 'owner', next); return next;
  }
  sources(visitId) { return this.store.all('sources').filter(s => s.visitId === visitId); }
  jobs(visitId, currentOnly = false) {
    const visit = this.store.read('visits', visitId);
    return this.store.all('jobs').filter(j => j.visitId === visitId && (!currentOnly || j.inputVersion === visit?.inputVersion && j.filterVersion === this.config().filterVersion));
  }
  contact(visitId) { return this.store.all('contacts').filter(c => c.visitId === visitId).at(-1) || null; }
  projection(visitId) { return this.store.all('projections').find(p => p.visitId === visitId) || null; }
  state(visitId, owner = false) {
    const visit = this.store.read('visits', visitId);
    if (!visit) fail(404, 'visit_deleted', '本次来访记录已不存在。');
    const result = { visit: owner ? { ...visitorPublic(visit), usage: visit.usage || null, corrections: visit.corrections || [] } : visitorPublic(visit),
      sources: this.sources(visitId), jobs: this.jobs(visitId, !owner).map(jobPublic), contact: contactPublic(this.contact(visitId)), projection: this.projection(visitId) };
    if (owner) result.reports = this.store.all('reports').filter(r => r.visitId === visitId);
    return result;
  }
  createVisit(kind = 'anonymous', extra = {}) {
    const visit = { id: uid('visit'), islandId: this.config().islandId, kind, name: '', background: '', purpose: '', inputVersion: 0,
      email: '', emailVerified: false, usage: { calls: 0, totalTokens: 0, reservedTokens: 0, estimatedCostUsd: null }, createdAt: now(), updatedAt: now(), corrections: [], ...extra };
    this.store.write('visits', visit.id, visit); return visit;
  }
  snapshotAndQueue(visitId, increment = true) {
    return this.store.transaction(() => {
      const visit = this.store.read('visits', visitId); if (!visit || visit.kind === 'anonymous') fail(400, 'registration_required', '请先自愿登记资料。');
      const config = this.config();
      const updated = { ...visit, inputVersion: visit.inputVersion + (increment ? 1 : 0), updatedAt: now() };
      this.store.write('visits', visitId, updated);
      const snapshotId = `${visitId}:${updated.inputVersion}:${config.filterVersion}`;
      const snapshot = { id: snapshotId, islandId: config.islandId, visitId, inputVersion: updated.inputVersion, filterVersion: config.filterVersion, ownerVersion: config.version,
        visitor: { name: visit.name, background: visit.background, purpose: visit.purpose }, sources: this.sources(visitId),
        owner: { public: config.public.confirmed ? config.public : { confirmed: false }, private: { background: config.private.background, documents: config.private.documents } },
        filter: config.filter, corrections: visit.corrections || [], createdAt: now() };
      if (!this.store.read('snapshots', snapshotId)) this.store.write('snapshots', snapshotId, snapshot);
      for (const roleId of Object.keys(ROLES)) {
        const id = `${snapshotId}:${roleId}`;
        if (!this.store.read('jobs', id)) this.store.write('jobs', id, { id, islandId: config.islandId, visitId, roleId, snapshotId, inputVersion: updated.inputVersion,
          filterVersion: config.filterVersion, status: 'queued', attempts: 0, nextAttemptAt: 0, error: null, createdAt: now() });
      }
      return updated;
    });
  }
  register(visitId, raw) {
    if (raw.consent !== true) fail(400, 'consent_required', '登记须先同意本次资料处理和保存范围。');
    const name = string(raw.name, '称呼', 80, true), background = string(raw.background, '背景介绍', 5000, true), purpose = string(raw.purpose, '来访目的', 2000, true), text = string(raw.text, '补充资料', 14000);
    const files = raw.files || [];
    if (!Array.isArray(files) || files.length > 3) fail(400, 'file_limit', '每次最多提交 3 份 TXT 或 MD 文件。');
    const normalizedFiles = files.map(file => {
      const name = string(file.name, '文件名', 180, true);
      if (!/\.(txt|md)$/i.test(name)) fail(400, 'unsupported_file', '当前支持 TXT/MD 文本；PDF 文本提取尚未接入。');
      return { name, text: string(file.text, '文件正文', 14000, true) };
    });
    if (background.length + purpose.length + text.length + normalizedFiles.reduce((n, f) => n + f.text.length, 0) > 32000) fail(400, 'source_limit', '本次资料合计最多 32,000 字符。');
    const fingerprint = digest(JSON.stringify({ name, background, purpose, text, files: normalizedFiles }));
    return this.store.transaction(() => {
      const visit = this.store.read('visits', visitId); if (!visit) fail(404, 'visit_deleted', '来访记录已删除。');
      if (visit.registrationHash === fingerprint) return this.state(visitId);
      if (visit.kind !== 'anonymous') fail(409, 'already_registered', '已经完成登记，请通过 NPC 对话补充资料。');
      this.store.write('visits', visitId, { ...visit, kind: 'registered', name, background, purpose, consentAt: now(), registrationHash: fingerprint });
      const inputs = [source(visitId, 'visitor_self_report', '海关登记', `称呼：${name}\n背景：${background}\n来访目的：${purpose}`), ...(text ? [source(visitId, 'visitor_self_report', '访客补充资料', text)] : []), ...normalizedFiles.map(f => source(visitId, 'visitor_document', f.name, f.text))];
      inputs.forEach(s => this.store.write('sources', s.id, s));
      this.snapshotAndQueue(visitId); return this.state(visitId);
    });
  }
  addMessage(visitId, raw) {
    const visit = this.store.read('visits', visitId);
    if (!visit || visit.kind === 'anonymous') fail(400, 'registration_required', '现实资料交流须先自愿登记；生活对话可以继续在小镇体验。');
    const npcId = string(raw.npcId, 'NPC', 40, true);
    if (!['archive', 'archivist', 'curator', 'liaison', 'specialist', 'customs'].includes(npcId)) fail(400, 'invalid_npc', '该角色不接收现实资料。');
    const text = string(raw.text, '交流内容', 4000, true);
    const requestId = string(raw.requestId, '请求标识', 100) || digest(`${npcId}:${text}`);
    const receiptId = `${visitId}:${requestId}`;
    if (this.store.read('receipts', receiptId)) return { ...this.state(visitId), reply: '这段资料已记录，无需重复提交。' };
    if (this.sources(visitId).reduce((n, s) => n + s.text.length, 0) + text.length > 40000) fail(400, 'source_limit', '本次来访资料已达到 40,000 字符上限。');
    this.store.transaction(() => {
      const s = source(visitId, 'npc_conversation', `${npcId === 'archive' ? '档案官' : ROLES[npcId]?.name || '海关'}交流`, text, { npcId });
      this.store.write('sources', s.id, s); this.store.write('receipts', receiptId, { id: receiptId, visitId, createdAt: now() }); this.snapshotAndQueue(visitId);
    });
    return { ...this.state(visitId), reply: '这段交流已经作为新来源保存。居民会在后台更新各自的汇报。' };
  }
  reserveCall(visitId, estimatedInputCharacters = 40000, maxOutputTokens = 2400) {
    if (!modelConfigured(this.env)) fail(503, 'model_unconfigured', '尚未配置真实模型的 API 密钥和模型名称。任务保留，可配置后重试。');
    const visit = this.store.read('visits', visitId); if (!visit) fail(404, 'visit_deleted', '本次资料已删除。');
    const usage = visit.usage || { calls: 0, totalTokens: 0, reservedTokens: 0, estimatedCostUsd: 0 };
    const reserved = estimatedInputCharacters + maxOutputTokens; // conservative Chinese-input upper bound
    if (usage.calls >= Number(this.env.MAX_VISIT_MODEL_CALLS || 24) || usage.totalTokens + usage.reservedTokens + reserved > Number(this.env.MAX_VISIT_TOTAL_TOKENS || 350000)) fail(429, 'visit_budget_exhausted', '本次来访已达到模型调用或 Token 预算上限。');
    const pricingConfigured = Number(this.env.MODEL_INPUT_USD_PER_MILLION) > 0 && Number(this.env.MODEL_OUTPUT_USD_PER_MILLION) > 0;
    if (this.env.MAX_VISIT_COST_USD && !pricingConfigured) fail(503, 'pricing_unconfigured', '设置了费用上限，但尚未配置真实所选模型的输入与输出单价。');
    const cost = pricingConfigured ? (estimatedInputCharacters * Number(this.env.MODEL_INPUT_USD_PER_MILLION) + maxOutputTokens * Number(this.env.MODEL_OUTPUT_USD_PER_MILLION)) / 1_000_000 : null;
    if (this.env.MAX_VISIT_COST_USD && usage.estimatedCostUsd + cost > Number(this.env.MAX_VISIT_COST_USD)) fail(429, 'visit_budget_exhausted', '本次来访达到配置的费用预算上限。');
    this.store.write('visits', visitId, { ...visit, usage: { ...usage, calls: usage.calls + 1, reservedTokens: usage.reservedTokens + reserved, estimatedCostUsd: cost === null ? null : Number(usage.estimatedCostUsd || 0) + cost } });
    return reserved;
  }
  settleCall(visitId, reserved, usage) {
    const visit = this.store.read('visits', visitId); if (!visit) return;
    // Failed/network-uncertain calls count against the conservative token ceiling.
    const total = Number(usage?.total_tokens ?? reserved);
    this.store.write('visits', visitId, { ...visit, usage: { ...visit.usage, reservedTokens: Math.max(0, visit.usage.reservedTokens - reserved), totalTokens: visit.usage.totalTokens + total } });
  }
  async runQueue() {
    if (this.active) return this.active;
    this.active = (async () => {
      while (!this.closing) {
        const next = this.store.all('jobs').find(j => j.status === 'queued' && j.nextAttemptAt <= Date.now());
        if (!next) break;
        const snapshot = this.store.read('snapshots', next.snapshotId); const visit = this.store.read('visits', next.visitId);
        if (!snapshot || !visit) { this.store.write('jobs', next.id, { ...next, status: 'cancelled' }); continue; }
        const running = { ...next, status: 'running', startedAt: now(), attempts: next.attempts + 1, error: null };
        this.store.write('jobs', next.id, running);
        let reserved = 0;
        try {
          reserved = this.reserveCall(next.visitId, JSON.stringify(snapshot).length, 2400);
          const archive = this.store.read('reports', `${next.snapshotId}:archivist`);
          const result = await generateReport(this.options, next.roleId, snapshot, archive);
          this.settleCall(next.visitId, reserved, result.usage); reserved = 0;
          // A deletion during model IO cannot recreate data or deliver an event.
          const live = this.store.read('jobs', next.id);
          if (!this.store.read('visits', next.visitId) || !live || live.status === 'cancelled') continue;
          this.store.transaction(() => {
            const report = { id: next.id, islandId: next.islandId, visitId: next.visitId, roleId: next.roleId, inputVersion: next.inputVersion, filterVersion: next.filterVersion,
              island_id: next.islandId, visit_id: next.visitId, role_id: next.roleId, input_version: next.inputVersion, filter_version: next.filterVersion,
              status: 'succeeded', content: result.value, ...result.value, source_refs: result.value.source_refs, model: result.model, responseId: result.responseId, usage: result.usage, createdAt: now(), created_at: now() };
            this.store.write('reports', next.id, report);
            this.store.write('jobs', next.id, { ...live, status: 'succeeded', error: null, errorCode: null, completedAt: now() });
            const eventId = `report:${next.id}`;
            this.store.write('events', eventId, { id: eventId, visitId: next.visitId, roleId: next.roleId, kind: 'report_ready', inputVersion: next.inputVersion, createdAt: now() });
          });
        } catch (error) {
          if (reserved) this.settleCall(next.visitId, reserved, null);
          const live = this.store.read('jobs', next.id); if (!live || !this.store.read('visits', next.visitId) || live.status === 'cancelled') continue;
          const retry = error.retryable && running.attempts < 3;
          this.store.write('jobs', next.id, { ...live, status: retry ? 'queued' : 'failed', error: error instanceof ApiError ? error.message : '处理服务发生错误，未生成报告。',
            errorCode: error.code || 'internal_error', nextAttemptAt: retry ? Date.now() + 2 ** running.attempts * 1000 : 0, completedAt: retry ? null : now() });
        }
      }
    })().finally(() => { this.active = null; });
    return this.active;
  }
  retry(visitId, roleId) {
    if (roleId === 'archive') roleId = 'archivist';
    if (roleId && !Object.hasOwn(ROLES, roleId)) fail(400, 'invalid_role', '未知汇报角色。');
    this.snapshotAndQueue(visitId, false);
    this.store.transaction(() => {
      for (const job of this.jobs(visitId, true)) if ((!roleId || job.roleId === roleId) && job.status === 'failed') this.store.write('jobs', job.id, { ...job, status: 'queued', attempts: 0, error: null, nextAttemptAt: 0 });
    });
    return this.state(visitId, true);
  }
  rebuildProjects(visitId) {
    this.state(visitId, true);
    this.snapshotAndQueue(visitId, false);
    const job = this.jobs(visitId, true).find(j => j.roleId === 'specialist');
    const report = job && this.store.read('reports', job.id);
    if (!job || ['queued','running'].includes(job.status) || Array.isArray(report?.content?.project_cards)) return this.state(visitId, true);
    this.store.transaction(() => {
      if (report && !this.store.read('reports', `${report.id}:before-project-cards`)) this.store.write('reports', `${report.id}:before-project-cards`, { ...report, id: `${report.id}:before-project-cards`, historical: true });
      this.store.write('jobs', job.id, { ...job, status: 'queued', attempts: 0, error: null, errorCode: null, nextAttemptAt: 0 });
    });
    return this.state(visitId, true);
  }
  deleteVisit(visitId) {
    this.store.remove('life','visitor:'+visitId);this.store.remove('industry','visitor:'+visitId);
    this.store.transaction(() => {
      for (const bucket of ['visitor_chats', 'sources', 'snapshots', 'reports', 'jobs', 'contacts', 'meetings', 'projections', 'events', 'receipts', 'verifications', 'sessions', 'owner_outreach']) {
        for (const item of this.store.all(bucket)) if (item.visitId === visitId) {
          if (['contacts','owner_outreach'].includes(bucket) && ['sent', 'uncertain', 'sending'].includes(item.status)) this.store.write('delivery_audit', uid('delivery'), { status: item.status, providerId: item.delivery?.providerId || null, sentAt: item.sentAt || null, deletedAt: now(), note: '站内资料已删除；邮件服务商的外部副本不能收回。' });
          this.store.remove(bucket, item.id);
        }
      }
      this.store.remove('visits', visitId);
    });
  }
  prune() {
    const expiry = Date.now() - 30 * 86400000;
    for (const visit of this.store.all('visits')) if (new Date(visit.createdAt).getTime() < expiry && this.contact(visit.id)?.decision !== 'accepted') this.deleteVisit(visit.id);
    for (const session of this.store.all('sessions')) if (session.expiresAt < Date.now()) this.store.remove('sessions', session.id);
  }
}
