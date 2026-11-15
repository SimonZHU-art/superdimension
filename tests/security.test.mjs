import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, OWNER_PASSWORD } from './helpers.mjs';

const registration = { name: 'TEST FIXTURE visitor', background: 'Consented synthetic integration input.', purpose: 'Verify HTTP boundaries.', consent: true, text: 'TEST FIXTURE: a portfolio project.' };

async function withApp(fn, options) {
  const h = await harness(options);
  try { await fn(h); } finally { await h.close(); }
}

test('owner APIs reject anonymous callers and fabricated owner cookie', () => withApp(async h => {
  const stranger = h.client();
  for (const path of ['/api/owner/config', '/api/owner/visits', '/api/owner/visits/not-mine', '/api/owner/meetings/not-mine']) {
    assert.equal((await stranger.request(path)).status, 401, path);
  }
  stranger.jar.set('island_owner', 'fabricated-token');
  assert.equal((await stranger.request('/api/owner/config')).status, 401);
}));

test('owner credentials have no missing or weak-password fallback', async () => {
  for (const password of ['', 'short']) {
    await withApp(async h => {
      const result = await h.owner.request('/api/owner/login', { method: 'POST', json: { password } });
      assert.ok(result.status >= 400);
      assert.equal((await h.owner.request('/api/owner/config')).status, 401);
    }, { env: { OWNER_PASSWORD: password } });
  }
});

test('owner login uses HttpOnly session and logout revokes the actual token', () => withApp(async h => {
  assert.equal((await h.owner.request('/api/owner/login', { method: 'POST', json: { password: 'incorrect' } })).status, 401);
  const result = await h.login();
  assert.equal(result.status, 200);
  assert.match(result.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(result.headers.get('set-cookie'), /SameSite=(?:Strict|Lax)/i);
  const copied = h.client();
  copied.jar.set('island_owner', h.owner.jar.get('island_owner'));
  assert.equal((await copied.request('/api/owner/config')).status, 200);
  assert.equal((await h.owner.request('/api/owner/logout', { method: 'POST', json: {} })).status, 200);
  assert.equal((await copied.request('/api/owner/config')).status, 401);
}));

test('cross-origin owner mutation is rejected despite an authenticated cookie', () => withApp(async h => {
  await h.login();
  const config = (await h.owner.request('/api/owner/config')).data;
  const result = await h.owner.request('/api/owner/config', { method: 'PUT', json: config.config || config, headers: { origin: 'https://attacker.example' } });
  assert.equal(result.status, 403);
}));

test('anonymous visit saves only arrival data and cannot start research', () => withApp(async h => {
  const { guest, response } = await h.visitor();
  assert.ok(response.status >= 200 && response.status < 300);
  const visit = await guest.request('/api/visit');
  assert.equal(visit.data.visit.kind, 'anonymous');
  assert.equal(visit.data.jobs.length, 0);
  assert.equal(h.app.store.all('jobs').length, 0);
  assert.equal(h.app.store.all('reports').length, 0);
  assert.equal(h.provider.modelRequests().length, 0);
  const dialogue = await guest.request('/api/visit/messages', { method: 'POST', json: { npcId: 'archivist', text: 'I have not consented to research.' } });
  assert.ok(dialogue.status >= 400);
  await h.app.runQueue();
  assert.equal(h.app.store.all('jobs').length, 0);
  assert.equal(h.provider.modelRequests().length, 0);
}));

test('registration requires explicit consent and nonempty required facts', () => withApp(async h => {
  const { guest } = await h.visitor();
  for (const changes of [{ consent: false }, { consent: undefined }, { name: '' }, { background: '' }, { purpose: '' }]) {
    const result = await guest.request('/api/visit/register', { method: 'POST', json: { ...registration, ...changes } });
    assert.equal(result.status, 400);
  }
  assert.equal(h.app.store.all('jobs').length, 0);
}));

test('one visitor cannot read another visitor or owner reports', () => withApp(async h => {
  const first = await h.visitor();
  const second = await h.visitor();
  await first.guest.request('/api/visit/register', { method: 'POST', json: { ...registration, text: 'PRIVATE_FIRST_VISITOR_SENTINEL' } });
  const own = await first.guest.request('/api/visit');
  const other = await second.guest.request('/api/visit');
  assert.notEqual(other.data.visit.id, own.data.visit.id);
  assert.doesNotMatch(other.raw, /PRIVATE_FIRST_VISITOR_SENTINEL/);
  assert.equal((await second.guest.request(`/api/owner/visits/${own.data.visit.id}`)).status, 401);
  assert.equal((await first.guest.request('/api/visit')).data.reports, undefined);
}));

test('SSRF rejects dangerous literal URLs without issuing network requests', async () => {
  const addresses = [
    'http://example.com/', 'file:///etc/passwd', 'https://localhost/', 'https://127.0.0.1/',
    'https://10.0.0.1/', 'https://172.16.0.1/', 'https://192.168.0.1/',
    'https://169.254.169.254/latest/meta-data/', 'https://100.64.0.1/',
    'https://[::1]/', 'https://[::ffff:127.0.0.1]/', 'https://[fe80::1]/',
    'https://[2001:db8::1]/', 'https://[2001:2::1]/', 'https://[3fff::1]/',
    'https://user:secret@example.com/', 'https://example.com:8443/',
  ];
  // Separate local servers keep the matrix below the real per-minute rate limit.
  for (let start = 0; start < addresses.length; start += 10) {
    await withApp(async h => {
      await h.login();
      for (const url of addresses.slice(start, start + 10)) {
        const result = await h.owner.request('/api/owner/import', { method: 'POST', json: { url } });
        assert.equal(result.status, 400, `${url}: ${result.raw}`);
      }
      assert.equal(h.app.store.all('jobs').length, 0);
      assert.equal(h.provider.requests.length, 0);
    }, { lookupImpl: async () => [{ address: '127.0.0.1', family: 4 }] });
  }
});

test('SSRF blocks a hostname if any DNS answer resolves into private space', () => withApp(async h => {
  await h.login();
  const result = await h.owner.request('/api/owner/import', { method: 'POST', json: { url: 'https://mixed-address.example/island' } });
  assert.equal(result.status, 400);
  assert.equal(h.app.store.all('jobs').length, 0);
}, { lookupImpl: async () => [{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.9', family: 4 }] }));

test('JSON parsing and size constraints do not mutate existing visitor state', () => withApp(async h => {
  const { guest } = await h.visitor();
  const before = (await guest.request('/api/visit')).data;
  const wrongType = await fetch(h.origin + '/api/visit/register', { method: 'POST', headers: { 'content-type': 'text/plain', cookie: `island_visit=${guest.jar.get('island_visit')}` }, body: 'not JSON' });
  assert.equal(wrongType.status, 415);
  const oversized = await guest.request('/api/visit/register', { method: 'POST', json: { ...registration, text: 'x'.repeat(250_000) } });
  assert.equal(oversized.status, 413);
  const after = (await guest.request('/api/visit')).data;
  assert.equal(after.visit.inputVersion, before.visit.inputVersion);
  assert.equal(after.jobs.length, 0);
}));
