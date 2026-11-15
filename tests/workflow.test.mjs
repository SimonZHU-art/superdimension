import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { harness, fixtureOutput, providerFixture } from './helpers.mjs';

const registration = { name: 'TEST FIXTURE visitor', background: 'Synthetic integration background.', purpose: 'Validate states and source boundaries.', consent: true, text: 'TEST FIXTURE original material paragraph.', requestId: 'fixture-register-1' };
const ok = response => { assert.ok(response.status >= 200 && response.status < 300, response.raw); return response.data; };
const payloadInput = request => JSON.parse(request.body.input.find(item => item.role === 'user').content);
const requestName = request => request.body.text.format.name;

async function withApp(fn, options = {}) {
  const h = await harness({ withProviders: true, ...options });
  try { await fn(h); } finally { await h.close(); }
}
async function registered(h) {
  const { guest } = await h.visitor();
  ok(await guest.request('/api/visit/register', { method: 'POST', json: registration }));
  const current = ok(await guest.request('/api/visit'));
  return { guest, visit: current.visit };
}
async function ownerConfig(h, changes = {}) {
  ok(await h.login());
  const response = ok(await h.owner.request('/api/owner/config'));
  const config = response.config || response;
  const next = { ...config, ...changes, public: { ...config.public, ...changes.public }, private: { ...config.private, ...changes.private }, filter: { ...config.filter, ...changes.filter }, testIsland: { ...config.testIsland, ...changes.testIsland } };
  ok(await h.owner.request('/api/owner/config', { method: 'PUT', json: next }));
  return next;
}
async function details(h, id) { return ok(await h.owner.request(`/api/owner/visits/${id}`)); }
async function draft(h, guest) {
  await ownerConfig(h, { public: { name: 'TEST FIXTURE owner', bio: 'Consented synthetic owner introduction.', background: 'Synthetic public owner facts.', confirmed: true }, private: { contactEmail: 'owner-fixture@example.org' } });
  const response = ok(await guest.request('/api/contact/draft', { method: 'POST', json: {} }));
  return response.contact || response;
}
async function verify(h, guest) {
  ok(await guest.request('/api/contact/verify', { method: 'POST', json: { email: 'visitor-fixture@example.org' } }));
  const request = h.provider.mailRequests().at(-1);
  const code = `${request.body.text || ''} ${request.body.html || ''}`.match(/\b(\d{6})\b/)?.[1];
  assert.ok(code, 'TEST FIXTURE mailbox should contain the verification code');
  ok(await guest.request('/api/contact/verify/confirm', { method: 'POST', json: { code } }));
}

test('missing model config persists truthful failed jobs and no reports', () => withApp(async h => {
  const { guest, visit } = await registered(h);
  await h.app.runQueue();
  ok(await h.login());
  const data = await details(h, visit.id);
  assert.equal(data.reports.length, 0);
  assert.equal(data.jobs.length, 4);
  assert.ok(data.jobs.every(job => job.status === 'failed'));
  assert.ok(data.jobs.every(job => job.errorCode === 'model_unconfigured'));
  assert.equal(h.provider.modelRequests().length, 0);
  await ownerConfig(h, { public: { name: 'TEST FIXTURE owner', bio: 'TEST FIXTURE approved introduction.', background: 'TEST FIXTURE approved background.', confirmed: true }, private: { contactEmail: 'owner-fixture@example.org' } });
  assert.equal((await guest.request('/api/contact/draft', { method: 'POST', json: {} })).status, 503);
  assert.equal((await guest.request('/api/visit')).data.contact, null);
}, { withProviders: false }));

test('fixture provider yields four separate cited reports without visitor polling', () => withApp(async h => {
  const { visit } = await registered(h);
  // The visitor does not make another request while server-side processing runs.
  await h.app.runQueue();
  ok(await h.login());
  const data = await details(h, visit.id);
  assert.equal(data.reports.length, 4);
  assert.deepEqual(new Set(data.reports.map(report => report.role_id || report.roleId)), new Set(['archivist', 'curator', 'liaison', 'specialist']));
  assert.ok(data.jobs.every(job => job.status === 'succeeded'));
  assert.equal(h.provider.modelRequests().length, 4);
  for (const request of h.provider.modelRequests()) {
    const input = payloadInput(request);
    assert.ok(input.sources.some(source => source.text.includes('TEST FIXTURE original material')));
    assert.equal(request.body.store, false);
  }
}));

test('invented model citations fail validation and never appear as saved reports', () => withApp(async h => {
  const { visit } = await registered(h);
  await h.app.runQueue();
  ok(await h.login());
  const data = await details(h, visit.id);
  assert.equal(data.reports.length, 0);
  assert.ok(data.jobs.every(job => job.status === 'failed'));
  assert.ok(data.jobs.every(job => job.errorCode === 'invalid_model_output'));
}, { fixture: { modelOutput: body => ({ ...fixtureOutput(body), source_refs: ['invented:p999'] }) } }));

test('one role failure preserves other completed reports and explicit retry is idempotent', () => withApp(async h => {
  h.provider.state.modelOutput = body => body.text.format.name === 'report_curator' ? { ...fixtureOutput(body), source_refs: ['invented:p1'] } : fixtureOutput(body);
  const { visit } = await registered(h);
  await h.app.runQueue();
  ok(await h.login());
  const partial = await details(h, visit.id);
  assert.equal(partial.reports.length, 3);
  assert.equal(partial.jobs.find(job => job.roleId === 'curator').status, 'failed');
  h.provider.state.modelOutput = fixtureOutput;
  ok(await h.owner.request(`/api/owner/visits/${visit.id}/retry`, { method: 'POST', json: { roleId: 'curator' } }));
  await h.app.runQueue();
  const finished = await details(h, visit.id);
  assert.equal(finished.reports.length, 4);
  ok(await h.owner.request(`/api/owner/visits/${visit.id}/retry`, { method: 'POST', json: { roleId: 'curator' } }));
  await h.app.runQueue();
  assert.equal((await details(h, visit.id)).reports.length, 4);
}));

test('same registration requestId does not duplicate sources jobs or input versions', () => withApp(async h => {
  const { guest, visit } = await registered(h);
  const initial = ok(await guest.request('/api/visit'));
  ok(await guest.request('/api/visit/register', { method: 'POST', json: registration }));
  const repeated = ok(await guest.request('/api/visit'));
  assert.equal(repeated.visit.id, visit.id);
  assert.equal(repeated.visit.inputVersion, initial.visit.inputVersion);
  assert.equal(repeated.sources.length, initial.sources.length);
  assert.equal(repeated.jobs.length, initial.jobs.length);
}));

test('NPC input is versioned and idempotent with inspectable paragraph sources', () => withApp(async h => {
  const { guest, visit } = await registered(h);
  const message = { npcId: 'archivist', text: 'TEST FIXTURE NPC SUPPLEMENT.', requestId: 'fixture-message-1' };
  ok(await guest.request('/api/visit/messages', { method: 'POST', json: message }));
  const after = ok(await guest.request('/api/visit'));
  assert.equal(after.visit.inputVersion, visit.inputVersion + 1);
  assert.ok(after.sources.some(source => JSON.stringify(source).includes('TEST FIXTURE NPC SUPPLEMENT.')));
  ok(await guest.request('/api/visit/messages', { method: 'POST', json: message }));
  const repeated = ok(await guest.request('/api/visit'));
  assert.equal(repeated.visit.inputVersion, after.visit.inputVersion);
  assert.equal(repeated.sources.length, after.sources.length);
  await h.app.runQueue();
  const latest = h.provider.modelRequests().map(payloadInput).filter(input => input.input_version === after.visit.inputVersion);
  assert.equal(latest.length, 4);
  assert.ok(latest.every(input => input.sources.some(source => source.ref && source.text.includes('NPC SUPPLEMENT'))));
}));

test('filter revisions retain old report versions and send changed preferences in new tasks', () => withApp(async h => {
  await ownerConfig(h, { filter: { focus: 'TEST FIXTURE focus A' } });
  const { visit } = await registered(h);
  await h.app.runQueue();
  const first = await details(h, visit.id);
  const firstVersion = first.reports[0].filter_version;
  await ownerConfig(h, { filter: { focus: 'TEST FIXTURE focus B' } });
  ok(await h.owner.request(`/api/owner/visits/${visit.id}/retry`, { method: 'POST', json: {} }));
  await h.app.runQueue();
  const second = await details(h, visit.id);
  assert.equal(second.reports.filter(report => report.filter_version === firstVersion).length, 4);
  assert.equal(new Set(second.reports.map(report => report.filter_version)).size, 2);
  const inputs = h.provider.modelRequests().map(payloadInput);
  assert.ok(inputs.some(input => input.filter.focus === 'TEST FIXTURE focus A'));
  assert.ok(inputs.some(input => input.filter.focus === 'TEST FIXTURE focus B'));
  // Only context/version plumbing is verified; a fixture cannot verify semantic personalization.
}));

test('unchanged owner config does not create a spurious filter revision', () => withApp(async h => {
  const config = await ownerConfig(h, { filter: { focus: 'TEST FIXTURE stable preference' } });
  const { visit } = await registered(h);
  await h.app.runQueue();
  const before = await details(h, visit.id);
  ok(await h.owner.request('/api/owner/config', { method: 'PUT', json: config }));
  ok(await h.owner.request(`/api/owner/visits/${visit.id}/retry`, { method: 'POST', json: {} }));
  await h.app.runQueue();
  const after = await details(h, visit.id);
  assert.equal(after.reports.length, before.reports.length);
  assert.equal(h.provider.modelRequests().length, 4);
}));

test('owner correction remains separate from model reports and survives rerun', () => withApp(async h => {
  const { visit } = await registered(h);
  await h.app.runQueue();
  ok(await h.login());
  ok(await h.owner.request(`/api/owner/visits/${visit.id}/corrections`, { method: 'POST', json: { text: 'TEST FIXTURE OWNER CORRECTION: retain this statement.' } }));
  const saved = await details(h, visit.id);
  assert.match(JSON.stringify(saved), /TEST FIXTURE OWNER CORRECTION/);
  ok(await h.owner.request(`/api/owner/visits/${visit.id}/retry`, { method: 'POST', json: {} }));
  await h.app.runQueue();
  assert.match(JSON.stringify(await details(h, visit.id)), /TEST FIXTURE OWNER CORRECTION/);
  const rerun = h.provider.modelRequests().map(payloadInput).filter(input => input.input_version > visit.inputVersion);
  assert.equal(rerun.length, 4);
  assert.ok(rerun.every(input => input.owner_corrections.some(correction => correction.text.includes('TEST FIXTURE OWNER CORRECTION'))));
}));

test('queued work and owner state survive server restart on the same SQLite file', async () => {
  const first = await harness({ withProviders: true });
  let second;
  try {
    const config = await ownerConfig(first, { filter: { focus: 'TEST FIXTURE restart preference' } });
    const { guest, visit } = await registered(first);
    const contact = await draft(first, guest);
    await verify(first, guest);
    const send = { contactId: contact.id, subject: contact.subject, body: contact.body, confirmed: true };
    ok(await guest.request('/api/contact/send', { method: 'POST', json: send }));
    ok(await first.owner.request(`/api/owner/contacts/${contact.id}/decision`, { method: 'POST', json: { decision: 'accepted' } }));
    const queued = await details(first, visit.id);
    assert.equal(queued.jobs.length, 4);
    assert.ok(queued.jobs.every(job => job.status === 'queued'));
    await first.close({ remove: false });
    second = await harness({ directory: first.directory, withProviders: true });
    ok(await second.login());
    const restored = await details(second, visit.id);
    assert.equal(restored.visit.name, visit.name);
    assert.equal(restored.jobs.length, 4);
    assert.equal(restored.contact.status, 'sent');
    assert.equal(restored.contact.decision, 'accepted');
    assert.equal(restored.projection.accepted, true);
    ok(await second.owner.request(`/api/owner/meetings/${contact.id}`));
    const returningVisitor = second.client();
    for (const [key, value] of guest.jar) returningVisitor.jar.set(key, value);
    ok(await returningVisitor.request('/api/contact/send', { method: 'POST', json: send }));
    assert.equal(second.provider.mailRequests().length, 0, 'durable sent state must prevent resend after restart');
    await second.app.runQueue();
    assert.equal((await details(second, visit.id)).reports.length, 4);
    const configResponse = ok(await second.owner.request('/api/owner/config'));
    assert.equal((configResponse.config || configResponse).filter.focus, config.filter.focus);
  } finally {
    if (second) await second.close();
    else { try { await first.close({ remove: false }); } catch {} }
    await rm(first.directory, { recursive: true, force: true });
  }
});

test('deleting a visitor cancels pending processing and removes private derived material', () => withApp(async h => {
  const { guest, visit } = await registered(h);
  ok(await guest.request('/api/visit/messages', { method: 'POST', json: { npcId: 'archivist', text: 'DELETED_SOURCE_SENTINEL', requestId: 'fixture-delete-source' } }));
  ok(await guest.request('/api/visit', { method: 'DELETE', json: {} }));
  await h.app.runQueue();
  ok(await h.login());
  assert.equal((await h.owner.request(`/api/owner/visits/${visit.id}`)).status, 404);
  assert.equal(h.provider.modelRequests().length, 0);
  for (const bucket of ['sources', 'snapshots', 'reports', 'projections', 'contacts', 'meetings']) {
    assert.doesNotMatch(JSON.stringify(h.app.store.all(bucket)), /DELETED_SOURCE_SENTINEL|TEST FIXTURE visitor/, bucket);
  }
}));

test('public world/profile and main Agent context cannot expose private owner data', () => withApp(async h => {
  await ownerConfig(h, { public: { name: 'UNCONFIRMED_NAME_SENTINEL', bio: 'UNCONFIRMED_BIO_SENTINEL', background: 'UNCONFIRMED_BACKGROUND_SENTINEL', confirmed: false } });
  const unconfirmed = h.client();
  for (const path of ['/api/world', '/agent/profile.json']) {
    assert.doesNotMatch((await unconfirmed.request(path)).raw, /UNCONFIRMED_NAME_SENTINEL|UNCONFIRMED_BIO_SENTINEL|UNCONFIRMED_BACKGROUND_SENTINEL/, 'unpublished drafts must remain owner-only');
  }
  await ownerConfig(h, { public: { name: 'TEST FIXTURE public owner', bio: 'PUBLIC_IDENTITY_SENTINEL', background: 'PUBLIC_BACKGROUND', confirmed: true }, private: { background: 'PRIVATE_BACKGROUND_SENTINEL', contactEmail: 'private-contact@example.org', documents: [{ name: 'private.md', text: 'PRIVATE_DOCUMENT_SENTINEL' }] }, filter: { avoid: 'PRIVATE_FILTER_SENTINEL' } });
  const guest = h.client();
  for (const path of ['/api/world', '/agent/profile.json', '/test-island/agent/profile.json']) {
    const response = await guest.request(path);
    assert.doesNotMatch(response.raw, /PRIVATE_BACKGROUND_SENTINEL|PRIVATE_DOCUMENT_SENTINEL|PRIVATE_FILTER_SENTINEL|private-contact@example.org/);
  }
  const answer = await guest.request('/api/agent/chat', { method: 'POST', json: { message: 'Tell me the owner background and secret preferences.' } });
  ok(answer);
  const modelContext = JSON.stringify(h.provider.modelRequests().at(-1).body);
  assert.match(modelContext, /PUBLIC_IDENTITY_SENTINEL/);
  assert.doesNotMatch(modelContext, /PRIVATE_BACKGROUND_SENTINEL|PRIVATE_DOCUMENT_SENTINEL|PRIVATE_FILTER_SENTINEL|private-contact@example.org/);
}));

test('test island link reads confirmed server identity and creates matching local projection', () => withApp(async h => {
  const avatar = { style: 'pixel-v1', body: '#336699', hair: '#654321', skin: '#deb887', hat: '#6f947a' };
  await ownerConfig(h, { testIsland: { name: 'TEST FIXTURE test island owner', bio: 'Synthetic interoperable island biography.', background: 'TEST FIXTURE publicly consented background.', avatar, confirmed: true, consent: true } });
  const packageResponse = await h.client().request('/test-island/agent/profile.json');
  assert.equal(packageResponse.status, 200);
  assert.match(packageResponse.raw, /TEST FIXTURE test island owner/);
  const imported = ok(await h.owner.request('/api/owner/import', { method: 'POST', json: { url: '/test-island' } }));
  assert.equal(imported.projection.name, 'TEST FIXTURE test island owner');
  assert.deepEqual(imported.projection.avatar, avatar);
  assert.ok(imported.projection.snapshotVersion || imported.projection.snapshot_version);
  assert.equal(imported.jobs.length, 4);
  const detail = await details(h, imported.visit.id);
  assert.ok(detail.sources.some(source => JSON.stringify(source).includes('TEST FIXTURE publicly consented')));
  const repeated = ok(await h.owner.request('/api/owner/import', { method: 'POST', json: { url: '/test-island' } }));
  assert.equal(repeated.projection.id, imported.projection.id);
  assert.equal(repeated.jobs.length, 4);
  const secondAvatar = { ...avatar, body: '#994433', hair: '#213d50' };
  await ownerConfig(h, { testIsland: { avatar: secondAvatar } });
  const second = ok(await h.owner.request('/api/owner/import', { method: 'POST', json: { url: '/test-island' } }));
  assert.deepEqual(second.projection.avatar, secondAvatar);
  assert.notEqual(second.projection.id, imported.projection.id);
  // Explicit TEST FIXTURE incompatible appearance, served by the same HTTP profile
  // route. Production always generates its own compatible appearance.
  const identity = h.app.domain.identity.bind(h.app.domain);
  h.app.domain.identity = testIsland => {
    const value = identity(testIsland);
    if (testIsland) delete value.avatar;
    return value;
  };
  assert.equal((await h.client().request('/test-island/agent/profile.json')).data.avatar, undefined);
  const fallback = ok(await h.owner.request('/api/owner/import', { method: 'POST', json: { url: '/test-island' } }));
  assert.equal(fallback.projection.appearanceFallback, true);
  assert.equal(fallback.projection.avatar.style, 'pixel-v1');
}));

test('mail draft has current source context but never private reports or preferences', () => withApp(async h => {
  const { guest } = await registered(h);
  ok(await guest.request('/api/visit/messages', { method: 'POST', json: { npcId: 'liaison', text: 'TEST FIXTURE MAIL_SOURCE_SUPPLEMENT', requestId: 'fixture-mail-source' } }));
  await ownerConfig(h, { private: { background: 'PRIVATE_MAIL_CONTEXT_SENTINEL' }, filter: { avoid: 'PRIVATE_MAIL_FILTER_SENTINEL' } });
  const contact = await draft(h, guest);
  assert.match(contact.body, /MAIL_SOURCE_SUPPLEMENT/);
  assert.equal(h.provider.mailRequests().length, 0);
  const request = h.provider.modelRequests().find(request => requestName(request) === 'contact_draft');
  assert.match(JSON.stringify(request.body), /MAIL_SOURCE_SUPPLEMENT/);
  assert.doesNotMatch(JSON.stringify(request.body), /PRIVATE_MAIL_CONTEXT_SENTINEL|PRIVATE_MAIL_FILTER_SENTINEL|archivist_report/);
  await verify(h, guest);
  ok(await guest.request('/api/visit/messages', { method: 'POST', json: { npcId: 'liaison', text: 'TEST FIXTURE NEW MAIL FACT', requestId: 'fixture-new-mail-fact' } }));
  const stale = await guest.request('/api/contact/send', { method: 'POST', json: { contactId: contact.id, subject: contact.subject, body: contact.body, confirmed: true } });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.code, 'draft_stale');
  const refreshed = ok(await guest.request('/api/contact/draft', { method: 'POST', json: {} })).contact;
  assert.notEqual(refreshed.id, contact.id);
  assert.match(refreshed.body, /NEW MAIL FACT/);
  await ownerConfig(h, { private: { contactEmail: 'updated-owner-fixture@example.org' } });
  const newRecipient = ok(await guest.request('/api/contact/draft', { method: 'POST', json: {} })).contact;
  assert.equal(newRecipient.to, 'updated-owner-fixture@example.org');
  assert.notEqual(newRecipient.id, refreshed.id);
}));

test('contact send requires explicit confirmation and verified visitor email', () => withApp(async h => {
  const { guest } = await registered(h);
  const contact = await draft(h, guest);
  const send = { contactId: contact.id, subject: contact.subject, body: contact.body };
  assert.ok((await guest.request('/api/contact/send', { method: 'POST', json: send })).status >= 400);
  assert.ok((await guest.request('/api/contact/send', { method: 'POST', json: { ...send, confirmed: true } })).status >= 400);
  assert.equal(h.provider.mailRequests().length, 0);
}));

test('verification code is sent only to mailbox; confirmed edited contact sends once and gates meeting', () => withApp(async h => {
  const { guest } = await registered(h);
  const contact = await draft(h, guest);
  const unverified = ok(await guest.request('/api/contact/verify', { method: 'POST', json: { email: 'visitor-fixture@example.org' } }));
  assert.equal(unverified.code, undefined);
  const mail = h.provider.mailRequests().at(-1);
  const code = `${mail.body.text || ''} ${mail.body.html || ''}`.match(/\b(\d{6})\b/)?.[1];
  assert.ok(code);
  assert.doesNotMatch(JSON.stringify(unverified), new RegExp(code));
  assert.ok((await guest.request('/api/contact/verify/confirm', { method: 'POST', json: { code: '000000' === code ? '111111' : '000000' } })).status >= 400);
  ok(await guest.request('/api/contact/verify/confirm', { method: 'POST', json: { code } }));
  const send = { contactId: contact.id, subject: 'TEST FIXTURE edited subject', body: 'TEST FIXTURE edited and confirmed body.', confirmed: true };
  ok(await guest.request('/api/contact/send', { method: 'POST', json: send }));
  assert.equal(h.provider.mailRequests().length, 2); // one verification, one actual contact submission
  const actual = h.provider.mailRequests().at(-1);
  assert.equal(actual.body.subject, send.subject);
  assert.match(actual.body.text, /TEST FIXTURE edited and confirmed body/);
  assert.ok(actual.headers['Idempotency-Key']);
  ok(await guest.request('/api/contact/send', { method: 'POST', json: send }));
  assert.equal(h.provider.mailRequests().length, 2);
  assert.ok((await h.owner.request(`/api/owner/meetings/${contact.id}`)).status >= 400);
  ok(await h.owner.request(`/api/owner/contacts/${contact.id}/decision`, { method: 'POST', json: { decision: 'accepted' } }));
  ok(await h.owner.request(`/api/owner/meetings/${contact.id}`));
  const answer = ok(await h.owner.request(`/api/owner/meetings/${contact.id}/chat`, { method: 'POST', json: { message: 'Which project was supplied?' } }));
  assert.match(JSON.stringify(answer), /source_refs/);
  assert.match(JSON.stringify(answer), /TEST FIXTURE/);
}));

test('missing mail credentials cannot produce email verification or sent success', () => withApp(async h => {
  const { guest } = await registered(h);
  const contact = await draft(h, guest);
  h.env.RESEND_API_KEY = '';
  h.env.MAIL_FROM = '';
  const verifyResult = await guest.request('/api/contact/verify', { method: 'POST', json: { email: 'visitor-fixture@example.org' } });
  assert.equal(verifyResult.status, 503);
  assert.equal(h.provider.mailRequests().length, 0);
  assert.equal((await guest.request('/api/visit')).data.visit.emailVerified, false);
  const sendResult = await guest.request('/api/contact/send', { method: 'POST', json: { contactId: contact.id, subject: contact.subject, body: contact.body, confirmed: true } });
  assert.ok(sendResult.status >= 400);
  assert.equal(h.provider.mailRequests().length, 0);
}));

test('uncertain mail retries preserve provider idempotency and immutable confirmed payload', () => withApp(async h => {
  const { guest } = await registered(h);
  const contact = await draft(h, guest);
  await verify(h, guest);
  h.provider.state.mailFailure = true;
  const send = { contactId: contact.id, subject: 'TEST FIXTURE retry subject', body: 'TEST FIXTURE immutable retry body.', confirmed: true };
  assert.equal((await guest.request('/api/contact/send', { method: 'POST', json: send })).status, 502);
  const firstMail = h.provider.mailRequests().at(-1);
  const attempted = h.app.store.read('contacts', contact.id);
  h.app.store.write('contacts', contact.id, { ...attempted, firstAttemptAt: Date.now() - 24 * 3600000 });
  const count = h.provider.mailRequests().length;
  const expired = await guest.request('/api/contact/send', { method: 'POST', json: send });
  assert.equal(expired.status, 409);
  assert.equal(expired.data.code, 'delivery_requires_review');
  assert.equal(h.provider.mailRequests().length, count);
  h.app.store.write('contacts', contact.id, attempted);
  const changed = await guest.request('/api/contact/send', { method: 'POST', json: { ...send, body: 'TEST FIXTURE modified after ambiguous delivery.' } });
  assert.equal(changed.status, 409);
  assert.equal(changed.data.code, 'frozen_mail_payload');
  assert.equal(h.provider.mailRequests().length, count);
  h.provider.state.mailFailure = false;
  ok(await guest.request('/api/contact/send', { method: 'POST', json: send }));
  const secondMail = h.provider.mailRequests().at(-1);
  assert.equal(firstMail.headers['Idempotency-Key'], secondMail.headers['Idempotency-Key']);
  assert.deepEqual(firstMail.body, secondMail.body);
  const current = ok(await guest.request('/api/visit'));
  assert.equal(current.contact.status, 'sent');
}));

test('a source revision during model work cannot overwrite the latest version reports', async () => {
  const provider = providerFixture();
  const normalFetch = provider.fetchImpl;
  let resume;
  let started;
  const waiting = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { resume = resolve; });
  let gated = false;
  provider.fetchImpl = async (url, init) => {
    if (String(url).startsWith('https://api.openai.com/') && !gated) { gated = true; started(); await gate; }
    return normalFetch(url, init);
  };
  await withApp(async h => {
    const { guest, visit } = await registered(h);
    const running = h.app.runQueue();
    await waiting;
    try { ok(await guest.request('/api/visit/messages', { method: 'POST', json: { npcId: 'archivist', text: 'TEST FIXTURE NEWEST SOURCE', requestId: 'fixture-concurrent-source' } })); }
    finally { resume(); }
    await running;
    await h.app.runQueue();
    ok(await h.login());
    const data = await details(h, visit.id);
    const latestVersion = data.visit.inputVersion;
    const latest = data.reports.filter(report => report.input_version === latestVersion);
    assert.equal(latestVersion, visit.inputVersion + 1);
    assert.equal(latest.length, 4);
    assert.ok(h.provider.modelRequests().filter(request => payloadInput(request).input_version === latestVersion).every(request => payloadInput(request).sources.some(source => source.text.includes('NEWEST SOURCE'))));
  }, { provider });
});

test('deletion while a model request is running cannot resurrect reports or sources', async () => {
  const provider = providerFixture();
  const normalFetch = provider.fetchImpl;
  let resume;
  let started;
  const waiting = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { resume = resolve; });
  let gated = false;
  provider.fetchImpl = async (url, init) => {
    if (String(url).startsWith('https://api.openai.com/') && !gated) { gated = true; started(); await gate; }
    return normalFetch(url, init);
  };
  await withApp(async h => {
    const { guest, visit } = await registered(h);
    const running = h.app.runQueue();
    await waiting;
    try { ok(await guest.request('/api/visit', { method: 'DELETE', json: {} })); }
    finally { resume(); }
    await running;
    await h.app.runQueue();
    ok(await h.login());
    assert.equal((await h.owner.request(`/api/owner/visits/${visit.id}`)).status, 404);
    assert.equal(h.app.store.all('reports').length, 0);
    assert.equal(h.app.store.all('sources').length, 0);
    assert.equal(h.app.store.all('snapshots').length, 0);
  }, { provider });
});


test('SMTP confirmed contact sends once; interrupted delivery cannot be resent', async () => {
  const messages = [];
  let interrupt = false;
  await withApp(async h => {
    const { guest } = await registered(h);
    const contact = await draft(h, guest);
    ok(await guest.request('/api/contact/verify', { method: 'POST', json: { email: 'visitor-fixture@example.org' } }));
    const code = messages.at(-1).text.match(/\b(\d{6})\b/)[1];
    ok(await guest.request('/api/contact/verify/confirm', { method: 'POST', json: { code } }));
    const send = { contactId: contact.id, subject: contact.subject, body: contact.body, confirmed: true };
    interrupt = true;
    const failed = await guest.request('/api/contact/send', { method: 'POST', json: send });
    assert.equal(failed.data.code, 'mail_uncertain');
    assert.equal(messages.length, 2);
    interrupt = false;
    const retry = await guest.request('/api/contact/send', { method: 'POST', json: send });
    assert.equal(retry.data.code, 'delivery_requires_review');
    assert.equal(messages.length, 2);
    assert.equal((await guest.request('/api/visit')).data.contact.status, 'uncertain');
  }, { env: { MAIL_PROVIDER: 'smtp', SMTP_HOST: 'smtp.example.org', SMTP_USER: 'sender@example.org', SMTP_PASSWORD: 'fixture-only-app-password' }, smtpTransportFactory: () => ({ async sendMail(message) { messages.push(message); if (interrupt) throw new Error('TEST FIXTURE socket closed'); return { accepted: message.to, rejected: [], messageId: message.messageId }; }, close() {} }) });
});
