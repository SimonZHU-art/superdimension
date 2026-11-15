import {latestVisitorProjection} from './visitorProjection.mjs';
import { createServer } from 'node:http';
import { randomInt, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Store } from './store.mjs';
import { IslandDomain, DEFAULT_AVATAR, avatar, contactPublic, jobPublic, publicProfile, source, visitorPublic } from './domain.mjs';
import { ApiError, digest, email, fail, now, profileUrl, readBody, readPublicJson, secretEqual, string, token, uid } from './security.mjs';
import { ANSWER_SCHEMA, FACT_BOUNDARY, ROLES, answerProjection, generateDraft, modelJson, modelConfigured, modelSettings, sendMail, sourceParagraphs, validateRefs } from './agents.mjs';

import { councilShelf } from './council.mjs';
import { roomShelf } from './rooms.mjs';
import { IslandLife } from './life.mjs';
import {DailyDirector} from './dailyDirector.mjs';
import {Voyages} from './voyage.mjs';
import {createGatheringDemo} from './gatheringDemo.mjs';
import {createGatheringProduct} from './gatheringProduct.mjs';
import {extractTestResume} from './testResume.mjs';
import { INDUSTRIES,runIndustryDemo } from '../shared/industries.js';
import { mailSettings } from './mail.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const escape = value => String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function createApp({ env = process.env, dataPath, fetchImpl = globalThis.fetch, lookupImpl, smtpTransportFactory } = {}) {
  const store = new Store(dataPath || env.DATA_PATH || resolve(here, 'data/island.sqlite'));
  const options = { env, fetchImpl, smtpTransportFactory };
  const domain = new IslandDomain(store, options);
  const dailyDirector=new DailyDirector(store,options,domain.config().islandId);
  const life = new IslandLife(store,dailyDirector);
  const voyages=new Voyages(store,life,()=>{const p=domain.published();return p.confirmed?[{id:'owner-public',title:'我已确认的公开介绍',text:JSON.stringify({name:p.name,bio:p.bio,background:p.background,projects:p.projects}),version:domain.config().updatedAt}]:[]});
  const demo=env.NODE_ENV==='development'?createGatheringDemo({modelOptions:options,initialProfile:store.read('gathering-demo:profiles','owner')||store.read('gatherings:profiles','owner:'+domain.config().islandId),onProfile:profile=>store.write('gathering-demo:profiles','owner',profile),getOwner:()=>{const p=domain.published();return {name:p.confirmed?p.name:domain.config().personalization?.npcNames?.main||'朱珠',avatar:p.avatar,publicPack:p.confirmed?[{title:'我已确认的公开介绍',text:JSON.stringify({name:p.name,bio:p.bio,projects:p.projects})}]:[],context:{owner:p,filter:domain.config().filter}}}}):null;
  const gatherings=createGatheringProduct({store,life,domain,modelOptions:options,schedulerMs:Number(env.GATHERING_INTERVAL_MS??1000),batchMs:Number(env.GATHERING_BATCH_MS??30000)});
  const deleteVisit=domain.deleteVisit.bind(domain);
  domain.deleteVisit=id=>store.transaction(()=>{gatherings.purgeVisitor(id);return deleteVisit(id)});
  const throttle = new Map();
  const operations = new Set();
  let interval;

  function limit(req, bucket, max, windowMs = 60_000) {
    // Deliberately ignore client-controlled forwarded IP headers.
    const key = `${bucket}:${req.socket.remoteAddress || 'local'}`; const current = throttle.get(key);
    const state = current && current.until > Date.now() ? current : { count: 0, until: Date.now() + windowMs };
    state.count++; throttle.set(key, state);
    if (state.count > max) fail(429, 'rate_limited', '请求过于频繁，请稍后再试。');
    if (throttle.size > 5000) for (const [id, t] of throttle) if (t.until < Date.now()) throttle.delete(id);
  }
  function ownerAuth() { return store.read('auth', 'owner'); }
  function ownerConfigured() { return !!ownerAuth() || !!env.OWNER_PASSWORD && env.OWNER_PASSWORD.length >= 12; }
  function passwordVersion() { return ownerAuth()?.version || digest(env.OWNER_PASSWORD || ''); }
  function verifyPassword(password) {
    const auth = ownerAuth();
    return auth ? timingSafeEqual(scryptSync(password, auth.salt, 64), Buffer.from(auth.hash, 'hex')) : secretEqual(password, env.OWNER_PASSWORD || '');
  }
  function session(req, kind) {
    const name = kind === 'owner' ? 'island_owner' : 'island_visit';
    const match = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`));
    if (!match) return null;
    const raw = match.slice(name.length + 1); if (!/^[a-zA-Z0-9_-]{43}$/.test(raw)) return null;
    const stored = store.read('sessions', digest(raw));
    if (!stored || stored.kind !== kind || stored.expiresAt < Date.now()) return null;
    // Changing the owner password revokes all previously issued owner sessions.
    if (kind === 'owner' && stored.passwordVersion !== passwordVersion()) return null;
    if (kind === 'visit' && !store.read('visits', stored.visitId)) return null;
    return stored;
  }
  function cookie(res, kind, value, maxAge) {
    const name = kind === 'owner' ? 'island_owner' : 'island_visit';
    const secure = env.COOKIE_SECURE === 'true' || /^https:/.test(env.PUBLIC_BASE_URL || '');
    res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`);
  }
  function newSession(res, kind, visitId) {
    const raw = token(); const id = digest(raw); const seconds = kind === 'owner' ? 8 * 3600 : 30 * 86400;
    store.write('sessions', id, { id, kind, ...(visitId ? { visitId } : {}), ...(kind === 'owner' ? { passwordVersion: passwordVersion() } : {}), expiresAt: Date.now() + seconds * 1000, createdAt: now() });
    cookie(res, kind, raw, seconds);
  }
  function requireOwner(req) { const s = session(req, 'owner'); if (!s) fail(401, 'owner_login_required', '请先登录岛主管理入口。'); return s; }
  function requireVisit(req, registered = false) {
    const s = session(req, 'visit'); if (!s) fail(401, 'visitor_session_required', '游客会话已失效，请重新进入小镇。');
    const v = store.read('visits', s.visitId);
    if (registered && v.kind === 'anonymous') fail(400, 'registration_required', '请先在海关自愿登记资料，再发起现实联系。');
    return v;
  }
  function publicBase(req) {
    if (env.PUBLIC_BASE_URL) return new URL(env.PUBLIC_BASE_URL).origin;
    const address = server.address();
    return `http://127.0.0.1:${address && typeof address === 'object' ? address.port : Number(env.PORT || 8787)}`;
  }
  function checkOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return; // non-browser CLI clients must still authenticate
    const allowed = new Set([publicBase(req), `http://${req.headers.host}`, ...(env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)]);
    if (!allowed.has(origin)) fail(403, 'origin_not_allowed', '请求来源不属于本岛。');
  }
  function response(res, data, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
  function mailReady() { return !!(mailSettings(env).configured && domain.config().private.contactEmail); }
  function modelReady() { return modelConfigured(env); }
  function budgetReady() {
    if (env.MAX_VISIT_COST_USD && (!Number(env.MODEL_INPUT_USD_PER_MILLION) || !Number(env.MODEL_OUTPUT_USD_PER_MILLION))) fail(503, 'pricing_unconfigured', '设置了费用上限，但尚未配置所选模型的输入与输出单价。');
  }
  function approvedOwner() { const p = domain.published(); if (!p.confirmed) fail(409, 'owner_setup_required', '岛主尚未确认真实公开资料，请先完成受保护的岛主配置。'); return p; }
  function lock(key) { if (operations.has(key)) fail(409, 'request_in_progress', '此请求正在处理，请稍后查看结果。'); operations.add(key); return () => operations.delete(key); }

  async function prepareDraft(visit) {
    approvedOwner(); budgetReady();
    const configSnapshot = domain.config();
    const previous = domain.contact(visit.id);
    if (previous && ['sent', 'sending', 'uncertain'].includes(previous.status)) return { contact: contactPublic(previous) };
    if (previous?.status === 'draft' && previous.inputVersion === visit.inputVersion && previous.ownerVersion === configSnapshot.version) return { contact: contactPublic(previous) };
    const release = lock(`draft:${visit.id}`); let reserved = 0;
    try {
      const sources = domain.sources(visit.id);
      reserved = domain.reserveCall(visit.id, JSON.stringify(sources).length + JSON.stringify(domain.published()).length, 1800);
      const result = await generateDraft(options, domain.published(), visitorPublic(visit), sources);
      domain.settleCall(visit.id, reserved, result.usage); reserved = 0;
      const live = store.read('visits', visit.id);
      if (!live || live.inputVersion !== visit.inputVersion) fail(409, 'draft_stale', '资料在起草期间发生变化，请重新生成。');
      if (domain.config().version !== configSnapshot.version) fail(409, 'draft_stale', '岛主资料或收件人在起草期间变化，请重新生成。');
      const contact = { id: uid('contact'), visitId: visit.id, islandId: visit.islandId, inputVersion: visit.inputVersion, status: 'draft', subject: result.value.subject, body: result.value.body,
        to: configSnapshot.private.contactEmail || '', replyTo: live.emailVerified ? live.email : '', decision: 'pending', source_refs: result.value.source_refs,
        sourcesSnapshot: sources, attachedInformation: [], ownerVersion: configSnapshot.version, createdAt: now(), model: result.model, usage: result.usage };
      store.write('contacts', contact.id, contact);
      return { contact: contactPublic(contact) };
    } finally { if (reserved) domain.settleCall(visit.id, reserved, null); release(); }
  }
  async function verifyEmail(visit, raw) {
    const replyTo = email(raw.email); if (!mailReady()) fail(503, 'mail_unconfigured', '邮箱验证需要配置真实邮件服务、发送地址及岛主收件邮箱。');
    if (visit.emailVerified && visit.email === replyTo) return { verified: true, email: replyTo };
    const old = store.read('verifications', visit.id);
    if (old && Date.now() - old.requestedAt < 60_000) fail(429, 'verification_cooldown', '验证码邮件每分钟最多发送一次。');
    const release = lock(`verification:${visit.id}`);
    const code = String(randomInt(100000, 1000000));
    const record = { id: visit.id, visitId: visit.id, email: replyTo, codeHash: digest(`${visit.id}:${code}`), attempts: 0, expiresAt: Date.now() + 10 * 60_000, requestedAt: Date.now(), status: 'sending' };
    store.transaction(() => { store.write('verifications', visit.id, record); store.write('visits', visit.id, { ...visit, email: replyTo, emailVerified: false }); });
    try {
      const delivery = await sendMail(options, { to: [replyTo], subject: '云汀岛 · 验证你的回复邮箱', text: `你正在为云汀岛的一次联系验证回复邮箱。\n验证码：${code}\n10 分钟内有效。若非本人操作，请忽略这封邮件。` }, `verify-${uid('mail')}`);
      if (!store.read('visits', visit.id)) fail(404, 'visit_deleted', '本次来访已删除。');
      store.write('verifications', visit.id, { ...record, status: 'sent', delivery });
      return { sent: true, expiresIn: 600, note: '邮件服务商已接收验证码请求，最终入箱以你的邮箱为准。' };
    } catch (error) {
      if (store.read('visits', visit.id)) store.write('verifications', visit.id, { ...record, status: error.code === 'mail_uncertain' ? 'uncertain' : 'failed' });
      throw error;
    } finally { release(); }
  }
  function confirmEmail(visit, raw) {
    const record = store.read('verifications', visit.id); const code = string(raw.code, '验证码', 10, true);
    if (!record || record.expiresAt < Date.now() || record.attempts >= 5 || record.status === 'failed') fail(400, 'verification_expired', '验证码已失效，请重新发送。');
    store.write('verifications', visit.id, { ...record, attempts: record.attempts + 1 });
    if (!secretEqual(record.codeHash, digest(`${visit.id}:${code}`))) fail(400, 'verification_invalid', '验证码不正确。');
    store.write('visits', visit.id, { ...visit, email: record.email, emailVerified: true });
    store.remove('verifications', visit.id);
    const contact = domain.contact(visit.id); if (contact?.status === 'draft') store.write('contacts', contact.id, { ...contact, replyTo: record.email });
    return { verified: true, email: record.email };
  }
  async function deliverContact(visit, raw) {
    if (raw.confirmed !== true) fail(400, 'send_confirmation_required', '请明确确认已经检查邮件主题、正文和回复邮箱。');
    const contactId = string(raw.contactId, '草稿标识', 100, true); const contact = store.read('contacts', contactId);
    if (!contact || contact.visitId !== visit.id) fail(404, 'contact_not_found', '找不到本次访客的联系草稿。');
    if (contact.status === 'sent') return { contact: contactPublic(contact) };
    if (!visit.emailVerified || !visit.email) fail(400, 'reply_email_unverified', '请先验证回复邮箱，再寄出真实邮件。');
    if (!mailReady()) fail(503, 'mail_unconfigured', '尚未配置真实邮件服务、发送地址和岛主收件邮箱。');
    const subject = string(raw.subject, '邮件主题', 200, true), body = string(raw.body, '邮件正文', 16000, true);
    if (/[\r\n]/.test(subject)) fail(400, 'invalid_subject', '主题不能包含换行。');
    if (contact.status === 'sending') fail(409, 'request_in_progress', '这封邮件正在发送，请稍后查看。');
    if (!contact.payload && (contact.inputVersion !== visit.inputVersion || contact.to !== domain.config().private.contactEmail)) fail(409, 'draft_stale', '资料或收件人已经变化，请重新生成草稿并检查。');
    const payload = { from: contact.payload?.from || env.MAIL_FROM, to: [contact.to], reply_to: visit.email, subject, text: body };
    if (contact.payload && digest(JSON.stringify(payload)) !== contact.payloadHash) fail(409, 'frozen_mail_payload', '发送曾被尝试，重试必须使用相同主题、正文、收件人及回复邮箱。');
    if (contact.status === 'uncertain' && Date.now() - contact.firstAttemptAt >= 23 * 3600000) fail(409, 'delivery_requires_review', '发送结果仍待核实，已超过安全重试窗口。请由岛主核对邮件服务记录，避免重复发送。');
    if (contact.firstAttemptAt && (contact.mailProvider || 'resend') !== mailSettings(env).provider) fail(409, 'delivery_requires_review', '这封邮件已尝试发送，不能切换发信服务重试。请岛主核对发送记录。');
    if (contact.status === 'uncertain' && contact.mailProvider === 'smtp') fail(409, 'delivery_requires_review', 'SMTP 发送结果待核实，请岛主检查已发送邮件。为避免重复寄出，暂不允许重试。');
    const release = lock(`send:${contact.id}`);
    const sending = { ...contact, mailProvider: mailSettings(env).provider, subject, body, replyTo: visit.email, payload: contact.payload || payload, payloadHash: contact.payloadHash || digest(JSON.stringify(payload)), firstAttemptAt: contact.firstAttemptAt || Date.now(), status: 'sending', error: null, confirmedAt: now() };
    store.write('contacts', contact.id, sending);
    try {
      const delivery = await sendMail(options, sending.payload, `contact-${contact.id}`);
      // Keep truthful external audit even if the visitor deleted during delivery.
      if (!store.read('visits', visit.id)) { store.write('delivery_audit', uid('delivery'), { ...delivery, sentAt: now(), note: '访客在发送期间删除站内资料，邮件副本无法收回。' }); fail(404, 'visit_deleted', '站内资料已删除，邮件服务商已接收先前确认的发送请求。'); }
      const sent = { ...sending, status: 'sent', delivery, sentAt: now() }; store.write('contacts', contact.id, sent);
      return { contact: contactPublic(sent), note: '邮件服务商已接收发送请求；这不表示邮件已经入箱。' };
    } catch (error) {
      if (store.read('visits', visit.id)) store.write('contacts', contact.id, { ...sending, status: error.code === 'mail_uncertain' ? 'uncertain' : 'failed', error: error.message });
      throw error;
    } finally { release(); }
  }
  async function importIsland(raw, req) {
    const input = string(raw.url, '个人岛链接', 2000, true);
    const base = publicBase(req); let identity, origin;
    const internalAllowed = new Set(['/test-island', '/test-island/', '/test-island/agent/profile.json', `${base}/test-island`, `${base}/test-island/`, `${base}/test-island/agent/profile.json`]);
    if (internalAllowed.has(input)) { identity = domain.identity(true); origin = `${base}/test-island/agent/profile.json`; }
    else { const imported = await readPublicJson(profileUrl(input), { lookupImpl }); identity = imported.value; origin = imported.url; }
    if (identity.version !== '1.0' || typeof identity.id !== 'string' || identity.id.length > 150) fail(400, 'incompatible_island', '身份包须符合 version 1.0，并有稳定 id。');
    if (identity.confirmed !== true || identity.developmentPlaceholder === true) fail(409, 'test_identity_unconfirmed', '该身份包仍是未确认的开发占位资料。请先填写获准真实资料并确认发布，再验证导入。');
    const profile = publicProfile({ ...identity, confirmed: true }); const appearance = avatar(identity.avatar);
    const fingerprint = digest(JSON.stringify({ origin, identity }));
    const previous = store.all('visits').find(v => v.importHash === fingerprint);
    if (previous) return domain.state(previous.id, true);
    return store.transaction(() => {
      const visit = domain.createVisit('imported', { name: profile.name, background: profile.background, purpose: '岛主导入公开身份快照', consentAt: now(), importHash: fingerprint, identityId: identity.id });
      const text = `公开称呼：${profile.name}\n公开介绍：${profile.bio}\n公开工作背景：${profile.background}\n公开项目：${JSON.stringify(profile.projects)}`;
      const s = source(visit.id, 'public_identity_package', '个人岛公开身份包', text, { origin, identityVersion: identity.version, identityId: identity.id, importedAt: now() });
      store.write('sources', s.id, s);
      const projection = { id: uid('projection'), visitId: visit.id, islandId: visit.islandId, identityId: identity.id, name: profile.name, bio: profile.bio, avatar: appearance.value,
        appearanceFallback: appearance.fallback, origin, snapshotVersion: 1, createdAt: now(), accepted: false, public: true };
      store.write('projections', projection.id, projection); domain.snapshotAndQueue(visit.id);
      return domain.state(visit.id, true);
    });
  }
  function decide(contactId, raw) {
    const decision = string(raw.decision, '联系决定', 20, true);
    if (!['accepted', 'rejected', 'pending'].includes(decision)) fail(400, 'invalid_decision', '请选择接受、拒绝或暂不处理。');
    const contact = store.read('contacts', contactId);
    if (!contact || contact.islandId !== domain.config().islandId) fail(404, 'contact_not_found', '联系记录不存在。');
    if (contact.status !== 'sent') fail(409, 'contact_not_sent', '只有邮件服务商已接收的真实联系，才能决定是否开放会议室。');
    return store.transaction(() => {
      const updated = { ...contact, decision, decidedAt: now() }; store.write('contacts', contactId, updated);
      let projection = domain.projection(contact.visitId); const visit = store.read('visits', contact.visitId);
      if (decision === 'accepted' && !projection) {
        projection = { id: uid('projection'), visitId: contact.visitId, islandId: contact.islandId, name: visit.name, bio: visit.background, avatar: DEFAULT_AVATAR, appearanceFallback: true, accepted: true, public: false, createdAt: now(), snapshotVersion: contact.inputVersion };
      }
      if (projection) store.write('projections', projection.id, { ...projection, accepted: decision === 'accepted' });
      if (decision === 'accepted' && !store.read('meetings', contactId)) store.write('meetings', contactId, { id: contactId, visitId: contact.visitId, contactId, inputVersion: contact.inputVersion, sourcesSnapshot: contact.sourcesSnapshot, messages: [], createdAt: now() });
      return { contact: contactPublic(updated), projection: domain.projection(contact.visitId) };
    });
  }
  function meeting(contactId) {
    const contact = store.read('contacts', contactId);
    if (!contact || contact.decision !== 'accepted' || contact.status !== 'sent') fail(403, 'meeting_closed', '只有岛主接受后的联系才可进入会议室。');
    const record = store.read('meetings', contactId); if (!record) fail(404, 'meeting_not_found', '会议记录不存在。');
    return record;
  }
  async function chatMeeting(contactId, raw) {
    const record = meeting(contactId); const message = string(raw.message, '会议问题', 3000, true); budgetReady();
    const release = lock(`meeting:${contactId}`); let reserved = 0;
    try {
      reserved = domain.reserveCall(record.visitId, JSON.stringify(record.sourcesSnapshot).length + message.length, 1500);
      const result = await answerProjection(options, message, record.sourcesSnapshot, record.messages.slice(-8));
      domain.settleCall(record.visitId, reserved, result.usage); reserved = 0;
      const live = meeting(contactId); if (!store.read('visits', record.visitId)) fail(404, 'visit_deleted', '会议资料已经删除。');
      const pair = [{ id: uid('message'), role: 'owner', text: message, createdAt: now() }, { id: uid('message'), role: 'projection', text: result.value.answer, source_refs: result.value.source_refs, uncertainties: result.value.uncertainties, model: result.model, createdAt: now() }];
      const updated = { ...live, messages: [...live.messages, ...pair] }; store.write('meetings', contactId, updated);
      return { answer: result.value.answer, source_refs: result.value.source_refs, uncertainties: result.value.uncertainties, meeting: updated };
    } finally { if (reserved) domain.settleCall(record.visitId, reserved, null); release(); }
  }

  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    try {
      const pathname = new URL(req.url, 'http://local').pathname;
      const method = req.method;
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) checkOrigin(req);
      if (pathname.startsWith('/api/')) {
        const rateIdentity=session(req,'visit')?.visitId||session(req,'owner')?.id||'anonymous';
        limit(req, 'api:'+rateIdentity, 180);
        if (pathname.startsWith('/api/owner/') && !['/api/owner/login', '/api/owner/session'].includes(pathname)) requireOwner(req);
        const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await readBody(req,['/api/gathering-demo/resume','/api/gatherings/resume'].includes(pathname)?2_850_000:240_000) : {};
        const gameKey=()=>{
          const view=new URL(req.url,'http://local').searchParams.get('view');
          if(view==='owner'){requireOwner(req);if(new URL(req.url,'http://local').searchParams.get('rehearsal')==='1'){if(env.NODE_ENV!=='development')fail(403,'dev_only','仅开发环境提供演示副本');return 'owner:rehearsal';}return 'owner';}
          return 'visitor:'+requireVisit(req).id;
        };
        if(pathname==='/api/voyage'){const key=gameKey();response(res,method==='GET'?{...voyages.read(key),exterior:key==='owner'?null:(({stage,status,changedAt,journey,level})=>({stage,status:journey?'away':status,changedAt,level,blueprint:false}))(voyages.read('owner').boat)}:voyages.action(key,body));return;}
        if(pathname==='/api/gathering-demo/resume'){requireOwner(req);if(method!=='POST')fail(405,'method','请上传简历文件。');if(env.NODE_ENV!=='development')fail(403,'dev_only','简历解析只用于开发隔离测试。');response(res,await extractTestResume(body,env));return;}
        if(pathname==='/api/gathering-demo'){requireOwner(req);if(env.NODE_ENV!=='development')fail(403,'dev_only','隔离聚会演示只在开发模式提供。');response(res,await demo.handle(body,method));return;}
        if(pathname==='/api/gatherings/landing'&&method==='GET'){response(res,gatherings.landing(new URL(req.url,'http://local').searchParams.get('invite')||''));return;}
        if(pathname==='/api/gatherings/archives'&&method==='GET'){requireOwner(req);response(res,{archives:gatherings.archives({kind:'owner'})});return;}
        if(pathname==='/api/gatherings'||pathname==='/api/gatherings/resume'){
          const view=new URL(req.url,'http://local').searchParams.get('view');const credential=view==='owner'?(requireOwner(req),{kind:'owner'}):{kind:'visitor',visitId:requireVisit(req).id};
          if(pathname.endsWith('/resume')){if(method!=='POST')fail(405,'method','请上传简历文件。');limit(req,'gathering-upload',10);response(res,await extractTestResume(body,env));return;}
          if(method==='POST'&&['begin','join','approach','say'].includes(body.action))limit(req,'gathering-action',40);
          const key=new URL(req.url,'http://local').searchParams.get('roomId');response(res,await gatherings.handle(credential,method==='GET'?{roomId:key||undefined}:body,method));return;
        }
        if(method==='GET'&&pathname==='/api/life'){response(res,{life:life.read(gameKey()),dev:env.NODE_ENV==='development'});return;}
        if(method==='POST'&&pathname==='/api/life/action'){const key=gameKey();if(body.action==='story-next'){const state=life.read(key);if(state.narrative.phase==='morning')await dailyDirector.prepare(state.narrative.number+1);}
          response(res,life.action(key,body,{owner:key.startsWith('owner'),dev:env.NODE_ENV==='development'}));return;}
        if(method==='GET'&&pathname==='/api/industries'){response(res,{industries:INDUSTRIES,mode:'demo'});return;}
        if(method==='GET'&&pathname==='/api/industry/results'){const key=gameKey();response(res,{results:store.read('industry',key)?.results||[]});return;}
        if(method==='POST'&&pathname==='/api/industry/demo'){
          const key=gameKey();let result;try{result=runIndustryDemo(body.industryId,body.skills,body.input);}catch(e){fail(400,'invalid_demo',e.message);}
          const record={...result,id:uid('demo'),createdAt:now()};store.transaction(()=>{const history=store.read('industry',key)?.results||[];store.write('industry',key,{results:[record,...history].slice(0,20)});});response(res,{result:record});return;
        }
        if(method==='POST'&&pathname==='/api/owner/visitor-chat'){
          const latest=latestVisitorProjection(store.all('visits'),store.all('projections'));
          if(!latest||body.visitId!==latest.visitId)fail(409,'visitor_changed','最新来访者已变化，请重新打开他的对话。');
          const visit=store.read('visits',latest.visitId),message=string(body.message,'想聊的话',3000,true);budgetReady();
          const release=lock('visitor-chat:'+visit.id);let reserved=0;
          try{const sources=domain.sources(visit.id),history=store.read('visitor_chats',visit.id);
            const messages=history?.inputVersion===visit.inputVersion?history.messages:[];
            reserved=domain.reserveCall(visit.id,JSON.stringify(sources).length+message.length,1500);
            const result=await answerProjection(options,message,sources,messages.slice(-8),true);
            domain.settleCall(visit.id,reserved,result.usage);reserved=0;
            if(store.read('visits',visit.id)?.inputVersion!==visit.inputVersion)fail(409,'visitor_changed','资料已更新或删除，请重新交谈。');
            const pair=[{role:'owner',text:message},{role:'projection',text:result.value.answer,source_refs:result.value.source_refs,uncertainties:result.value.uncertainties}];
            const updated=[...messages,...pair].slice(-20);store.write('visitor_chats',visit.id,{id:visit.id,visitId:visit.id,inputVersion:visit.inputVersion,messages:updated});
            response(res,{messages:updated,sources});return;
          }finally{if(reserved)domain.settleCall(visit.id,reserved,null);release();}
        }
        if(method==='GET'&&pathname==='/api/updates'){const entries=JSON.parse(await readFile(resolve(here,'../docs/updates.json'),'utf8'));response(res,{entries:entries.map(({privateNotes,...publicEntry})=>publicEntry)});return;}
        if(method==='GET'&&pathname==='/api/owner/work-log'){response(res,{markdown:await readFile(resolve(here,'../WORKLOG.md'),'utf8')});return;}
        if (method === 'GET' && pathname === '/api/world') {
          const isOwner = new URL(req.url,'http://local').searchParams.get('view') !== 'visitor' && !!session(req, 'owner');
          const latest=isOwner?latestVisitorProjection(store.all('visits'),store.all('projections')):null;const projections=latest?[latest]:[];
          response(res, { island: {name: domain.config().personalization?.islandName || '云汀岛'}, npcNames: domain.config().personalization?.npcNames || {}, npcStyles:life.read('owner').npcStyles, owner: domain.published(), serviceStatus: { modelConfigured: modelReady(), modelProvider: modelSettings(env).provider, modelName: modelSettings(env).model || null, mailConfigured: mailReady(), mailProvider: mailSettings(env).provider, ownerConfigured: ownerConfigured(), testIslandConfigured: domain.config().testIsland.confirmed }, projections, receptionWork:isOwner?store.all('jobs').filter(j=>['queued','running','succeeded','failed'].includes(j.status)).slice(-24).map(j=>({id:j.id,visitId:j.visitId,roleId:j.roleId,status:j.status})):[], roles: Object.keys(ROLES), testIslandUrl: `${publicBase(req)}/test-island` }); return;
        }
        if (method === 'POST' && pathname === '/api/visit') {
          let visit = session(req, 'visit');
          if (!visit) { limit(req, 'new-visit', 15); const created = domain.createVisit(); newSession(res, 'visit', created.id); visit = { visitId: created.id }; }
          response(res, domain.state(visit.visitId)); return;
        }
        if (method === 'GET' && pathname === '/api/visit') { response(res, domain.state(requireVisit(req).id)); return; }
        if (method === 'DELETE' && pathname === '/api/visit') { const visit = requireVisit(req); domain.deleteVisit(visit.id); cookie(res, 'visit', '', 0); response(res, { deleted: true, note: '资料、报告及派生记录已删除；已发送的外部邮件无法收回。' }); return; }
        if (method === 'POST' && pathname === '/api/visit/register') { response(res, domain.register(requireVisit(req).id, body)); return; }
        if (method === 'POST' && pathname === '/api/visit/messages') { limit(req, 'visitor-message', 15); response(res, domain.addMessage(requireVisit(req, true).id, body)); return; }
        if (method === 'POST' && pathname === '/api/contact/draft') { limit(req, 'contact-draft', 8); response(res, await prepareDraft(requireVisit(req, true))); return; }
        if (method === 'POST' && pathname === '/api/contact/verify') { limit(req, 'contact-verification', 5); response(res, await verifyEmail(requireVisit(req, true), body)); return; }
        if (method === 'POST' && pathname === '/api/contact/verify/confirm') { limit(req, 'contact-code', 10); response(res, confirmEmail(requireVisit(req, true), body)); return; }
        if (method === 'POST' && pathname === '/api/contact/send') { limit(req, 'contact-send', 10); response(res, await deliverContact(requireVisit(req, true), body)); return; }
        if (method === 'POST' && pathname === '/api/agent/chat') {
          limit(req, 'public-chat', 12, 3600000); approvedOwner(); const message = string(body.message, '问题', 2000, true);
          const sources = [source('public', 'owner_confirmed_public', '岛主已确认公开资料', JSON.stringify(domain.published()))];
          const paragraphs = sourceParagraphs(sources);
          const result = await modelJson({ ...options, system: `${FACT_BOUNDARY}\n你是岛主的主 Agent 介绍入口。仅介绍已确认公开的身份、工作背景、作品与当前方向；拒绝透露私人资料。不能表达岛主新的立场、合作决定、价格或档期。正式联系需本人邮件接受。`, input: { question: message, sources: paragraphs }, schema: ANSWER_SCHEMA, name: 'public_owner_answer', maxTokens: 1000 });
          validateRefs(result.value, paragraphs); response(res, result.value); return;
        }
        if (method === 'GET' && pathname === '/api/owner/session') { response(res, { authenticated: !!session(req, 'owner'), configured: ownerConfigured() }); return; }
        if (method === 'POST' && pathname === '/api/owner/login') {
          limit(req, 'owner-login', 5);
          if (!ownerConfigured()) fail(503, 'owner_auth_unconfigured', '请在服务端环境配置至少 12 字符的 OWNER_PASSWORD。没有默认管理密码。');
          if (!verifyPassword(string(body.password, '密码', 512, true))) fail(401, 'invalid_password', '岛主密码不正确。');
          newSession(res, 'owner'); response(res, { authenticated: true }); return;
        }
        if (method === 'POST' && pathname === '/api/owner/logout') { const s = session(req, 'owner'); if (s) store.remove('sessions', s.id); cookie(res, 'owner', '', 0); response(res, { authenticated: false }); return; }
        if (method === 'POST' && pathname === '/api/owner/password') {
          limit(req, 'owner-password', 5);
          const current = string(body.currentPassword, '当前密码', 512, true);
          const next = string(body.newPassword, '新密码', 128, true);
          if (!verifyPassword(current)) fail(401, 'invalid_password', '当前密码不正确。');
          if (next.length < 12) fail(400, 'weak_password', '新密码至少 12 个字符。');
          if (next !== body.confirmPassword) fail(400, 'password_mismatch', '两次新密码不一致。');
          if (current === next) fail(400, 'password_unchanged', '请设置与当前密码不同的新密码。');
          const salt = randomBytes(16).toString('hex');
          store.transaction(() => {
            store.write('auth', 'owner', {salt, hash: scryptSync(next, salt, 64).toString('hex'), version: uid('password'), updatedAt: now()});
            for (const session of store.all('sessions')) if (session.kind === 'owner') store.remove('sessions', session.id);
          });
          newSession(res, 'owner');
          response(res, { changed: true }); return;
        }
        if (method === 'GET' && pathname === '/api/owner/config') { response(res, domain.config()); return; }
        if (method === 'PUT' && pathname === '/api/owner/config') { response(res, domain.updateConfig(body)); return; }
        if (method === 'GET' && pathname === '/api/owner/council') { response(res, councilShelf(store, domain)); return; }
        if (method === 'GET' && pathname.startsWith('/api/owner/rooms/')) {
          const room = pathname.slice('/api/owner/rooms/'.length);
          if (!['archive','curator','liaison','specialist','customs'].includes(room)) fail(404, 'room_not_found', '没有这个居民成果室。');
          response(res, roomShelf(store, domain, room)); return;
        }
        if (method === 'POST' && pathname === '/api/owner/outreach') {
          limit(req, 'owner-outreach', 8);
          if (body.confirmed !== true) fail(400, 'send_confirmation_required', '请检查收件人和正文，并明确确认寄出。');
          const visitId = string(body.visitId, '来访档案', 100, true), visit = store.read('visits', visitId);
          if (!visit || !visit.emailVerified || !visit.email) fail(409, 'visitor_contact_unavailable', '这位访客尚未留下已验证的回复邮箱，暂时无法邮件联系。');
          if (!mailReady()) fail(503, 'mail_unconfigured', '邮局发信服务尚未配置。');
          const requestId = string(body.requestId, '发送请求', 100, true);
          const id = `outreach-${digest(requestId)}`;
          const subject = string(body.subject, '邮件主题', 200, true), text = string(body.text, '邮件正文', 16000, true);
          if (/[\r\n]/.test(subject)) fail(400, 'invalid_subject', '主题不能包含换行。');
          const payload = {from: env.MAIL_FROM, to: [visit.email], reply_to: domain.config().private.contactEmail, subject, text};
          const hash = digest(JSON.stringify({visitId,payload})); const previousDelivery = store.all('owner_outreach').find(r => r.payloadHash === hash && ['sent','sending','uncertain'].includes(r.status)); const old = store.read('owner_outreach', id) || previousDelivery;
          if (old && old.payloadHash !== hash) fail(409, 'frozen_mail_payload', '同一次发送请求不能更改收件人或正文。');
          if (old?.status === 'sent') { response(res, {sent:true,note:'这封邮件已经提交，不会重复发送。'}); return; }
          if (old && ['sending','uncertain'].includes(old.status)) fail(409, 'delivery_requires_review', '邮件发送结果待核实，请检查邮箱后再处理，避免重复寄出。');
          const release = lock(id);
          const record = {id,visitId,payload,payloadHash:hash,status:'sending',createdAt:old?.createdAt||now()};
          store.write('owner_outreach',id,record);
          try {
            const delivery = await sendMail(options,payload,id);
            store.write('owner_outreach',id,{...record,status:'sent',delivery,sentAt:now()});
            response(res,{sent:true,note:'邮件服务商已接受，最终入箱以访客邮箱为准。'});
          } catch(error) { store.write('owner_outreach',id,{...record,status:error.code==='mail_uncertain'?'uncertain':'failed',error:error.message});throw error; }
          finally {release();}
          return;
        }
        if (method === 'GET' && pathname === '/api/owner/visits') {
          const visits = store.all('visits'); response(res, { anonymousCount: visits.filter(v => v.kind === 'anonymous').length, visits: visits.filter(v => v.kind !== 'anonymous').map(v => ({ ...visitorPublic(v), jobs: domain.jobs(v.id, true).map(jobPublic), contact: contactPublic(domain.contact(v.id)), projection: domain.projection(v.id) })).reverse() }); return;
        }
        if (method === 'POST' && pathname === '/api/owner/import') { limit(req, 'owner-import', 15); response(res, await importIsland(body, req)); return; }
        let match;
        if ((match = pathname.match(/^\/api\/owner\/visits\/([^/]+)$/))) {
          const id = decodeURIComponent(match[1]); if (method === 'GET') { response(res, domain.state(id, true)); return; }
          if (method === 'DELETE') { domain.state(id, true); domain.deleteVisit(id); response(res, { deleted: true }); return; }
        }
        if (method === 'POST' && (match = pathname.match(/^\/api\/owner\/visits\/([^/]+)\/projects$/))) { budgetReady(); response(res, domain.rebuildProjects(decodeURIComponent(match[1]))); return; }
        if (method === 'POST' && (match = pathname.match(/^\/api\/owner\/visits\/([^/]+)\/retry$/))) { budgetReady(); response(res, domain.retry(decodeURIComponent(match[1]), body.roleId)); return; }
        if (method === 'POST' && (match = pathname.match(/^\/api\/owner\/visits\/([^/]+)\/corrections$/))) {
          const id = decodeURIComponent(match[1]); const visit = store.read('visits', id); if (!visit) fail(404, 'visit_not_found', '来访记录不存在。');
          const correction = { id: uid('correction'), text: string(body.text, '事实纠正', 5000, true), createdAt: now() };
          store.transaction(() => { store.write('visits', id, { ...visit, corrections: [...(visit.corrections || []), correction] }); domain.snapshotAndQueue(id); });
          response(res, domain.state(id, true)); return;
        }
        if (method === 'POST' && (match = pathname.match(/^\/api\/owner\/contacts\/([^/]+)\/decision$/))) { response(res, decide(decodeURIComponent(match[1]), body)); return; }
        if (method === 'GET' && (match = pathname.match(/^\/api\/owner\/meetings\/([^/]+)$/))) { response(res, { meeting: meeting(decodeURIComponent(match[1])) }); return; }
        if (method === 'POST' && (match = pathname.match(/^\/api\/owner\/meetings\/([^/]+)\/chat$/))) { response(res, await chatMeeting(decodeURIComponent(match[1]), body)); return; }
        fail(404, 'endpoint_not_found', '接口不存在。');
      }
      if (method !== 'GET' && method !== 'HEAD') fail(405, 'method_not_allowed', '此资源只支持读取。');
      if (pathname === '/agent/profile.json' || pathname === '/test-island/agent/profile.json') { response(res, domain.identity(pathname.startsWith('/test-island'))); return; }
      if (pathname === '/test-island' || pathname === '/test-island/') {
        const p = domain.published(true); const a = p.avatar;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'" });
        res.end(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(p.name)} · 测试岛</title><style>body{background:#ece2ce;color:#493d32;font:17px/1.8 system-ui;max-width:760px;margin:8vh auto;padding:30px}article{padding:40px;background:#fff9e9;border:1px solid #cbbc9d;box-shadow:8px 8px #d3c4a7}a{color:#567456}h1{font-size:36px;margin:15px 0}small{color:#806c55}svg{image-rendering:pixelated}pre{overflow:auto;font:12px/1.6 monospace;background:#e9e0cf;padding:20px}strong{color:#995435}</style><article><small>另一座岛 / 公开身份快照</small><br><svg width="96" height="128" viewBox="0 0 24 32"><path fill="${a.hair}" d="M7 4h10v11H7z"/><path fill="${a.skin}" d="M8 7h8v8H8z"/><path fill="${a.hat}" d="M5 3h14v4H5zM7 0h10v4H7z"/><path fill="${a.body}" d="M7 15h10v12H7zM4 16h3v9H4zM17 16h3v9h-3z"/><path fill="#45433e" d="M7 27h4v5H7zM13 27h4v5h-4zM9 10h2v2H9zM14 10h2v2h-2z"/></svg><h1>${escape(p.name)}</h1><p>${escape(p.bio)}</p><p>${escape(p.background)}</p>${!p.confirmed ? '<p><strong>当前是未确认的开发占位资料，不能用于真实人物或实际模型验收。请在主岛受保护配置里填入获准真实资料。</strong></p>' : '<p>此页与身份包使用同一份已确认资料。投影读取的是快照，不代表真人在线。</p>'}<ul>${p.projects.map(project => `<li>${project.url ? `<a href="${escape(project.url)}" rel="noreferrer">${escape(project.title)}</a>` : escape(project.title)}：${escape(project.description)}</li>`).join('')}</ul><p><a href="/test-island/agent/profile.json">查看公开机器身份包</a> · <a href="/">回到云汀岛</a></p><small>复制此页链接，交给主岛海关即可读取兼容身份与形象。</small></article></html>`); return;
      }
      const dist = resolve(here, '../dist'); const requested = resolve(dist, `.${decodeURIComponent(pathname)}`);
      if (!requested.startsWith(`${dist}${sep}`) && requested !== dist) fail(403, 'unsafe_path', '不能读取此文件。');
      let file = requested;
      const fileStat = await stat(file).catch(() => null);
      if (!fileStat?.isFile()) { if (extname(pathname)) fail(404, 'file_not_found', '资源不存在。'); file = resolve(dist, 'index.html'); }
      const content = await readFile(file).catch(() => fail(503, 'client_not_built', '网页尚未构建。开发时打开 Vite 地址；生产启动前运行 npm run build。'));
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public,max-age=3600', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" });
      res.end(method === 'HEAD' ? '' : content);
    } catch (error) {
      if (res.headersSent) { res.end(); return; }
      const status = error instanceof ApiError ? error.status : 500;
      response(res, { error: error instanceof ApiError ? error.message : '服务器发生错误，请稍后重试。', code: error.code || 'internal_error' }, status);
      if (!(error instanceof ApiError)) console.error('[island] unexpected error', error?.stack || error);
    }
  });
  server.requestTimeout = 120_000; server.headersTimeout = 15_000;
  domain.prune();
  const intervalMs = Number(env.QUEUE_INTERVAL_MS ?? 1000);
  if (intervalMs > 0) { interval = setInterval(() => { domain.runQueue().catch(error => console.error('[queue]', error.message)); }, intervalMs); interval.unref(); }
  let pruneInterval = setInterval(() => domain.prune(), 3600000); pruneInterval.unref();
  return { server, store, domain, gatherings, runQueue: () => domain.runQueue(),
    async close() {
      domain.closing = true; clearInterval(interval); clearInterval(pruneInterval);
      if (server.listening) { const drained=new Promise(resolve=>server.close(resolve));server.closeIdleConnections();const deadline=setTimeout(()=>server.closeAllConnections(),1500);await drained;clearTimeout(deadline); }
      await dailyDirector.close(); if (domain.active) await domain.active; if(demo)await demo.close(); await gatherings.close(); store.close();
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const app = await createApp(); const port = Number(process.env.PORT || 8787); const host = process.env.HOST || '127.0.0.1';
  app.server.listen(port, host, () => console.log(`云汀岛 API / production client: http://${host}:${port}\nSQLite persistent queue active. Model and mail are ${modelConfigured(process.env) ? 'model configured' : 'not fully configured'}; no simulated AI reports.`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
}
