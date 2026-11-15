/** HTTP integration helpers. All provider output below is an explicit TEST FIXTURE.
 * It is never imported by the product and is not evidence of real model quality.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server/index.mjs';

export const OWNER_PASSWORD = 'integration-owner-password';

export function fixtureOutput(body) {
  const name = body.text?.format?.name || '';
  const input = JSON.parse(body.input.find(item => item.role === 'user').content);
  const ref = input.sources?.[0]?.ref;
  const source_refs = ref ? [ref] : [];
  if (name.startsWith('report_')) {
    return { ...(name === 'report_specialist' ? { project_cards: [] } : {}), summary: `TEST FIXTURE ${name}`, findings: ref ? [{ text: 'TEST FIXTURE cited finding.', kind: 'self_report', source_refs }] : [], relevance: 'TEST FIXTURE relevance.', uncertainties: ['TEST FIXTURE: unverified synthetic input.'], next_steps: ['TEST FIXTURE: inspect the submitted source.'], source_refs };
  }
  if (name === 'contact_draft') return { subject: 'TEST FIXTURE contact subject', body: `TEST FIXTURE draft based on: ${input.sources?.map(source => source.text).join('\n') || ''}`, source_refs };
  return { answer: 'TEST FIXTURE saved-source answer. This is not the visitor speaking.', source_refs, uncertainties: ['TEST FIXTURE: requires human confirmation.'] };
}

export function providerFixture({ modelOutput, modelFailure, mailFailure, profiles = {} } = {}) {
  const requests = [];
  const state = { modelFailure, mailFailure, modelOutput, profiles };
  const fetchImpl = async (url, init = {}) => {
    const address = String(url);
    let body;
    try { body = JSON.parse(init.body || '{}'); } catch { body = init.body; }
    requests.push({ url: address, method: init.method || 'GET', body, headers: init.headers });
    if (address.startsWith('https://api.openai.com/')) {
      if (typeof state.modelFailure === 'function' ? state.modelFailure(body) : state.modelFailure) {
        return Response.json({ error: { message: 'TEST FIXTURE model unavailable' } }, { status: 503 });
      }
      const output = state.modelOutput === undefined ? fixtureOutput(body) : typeof state.modelOutput === 'function' ? state.modelOutput(body) : state.modelOutput;
      return Response.json({ id: 'fixture-response', status: 'completed', output_text: JSON.stringify(output), output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(output) }] }], usage: { input_tokens: 100, output_tokens: 40 } });
    }
    if (address.startsWith('https://api.resend.com/')) {
      if (state.mailFailure) return Response.json({ message: 'TEST FIXTURE mail unavailable' }, { status: 503 });
      return Response.json({ id: `fixture-mail-${requests.filter(r => r.url.startsWith('https://api.resend.com/')).length}` });
    }
    const profile = state.profiles[address];
    if (profile) return Response.json(profile);
    throw new Error(`Unexpected TEST FIXTURE network request: ${address}`);
  };
  return { fetchImpl, requests, state, modelRequests: () => requests.filter(r => r.url.startsWith('https://api.openai.com/')), mailRequests: () => requests.filter(r => r.url.startsWith('https://api.resend.com/')) };
}

export async function harness(options = {}) {
  const directory = options.directory || await mkdtemp(join(tmpdir(), 'superdimension-test-'));
  const provider = options.provider || providerFixture(options.fixture);
  const env = {
    OWNER_PASSWORD,
    QUEUE_INTERVAL_MS: '0',
    PUBLIC_BASE_URL: 'http://127.0.0.1',
    ...(options.withProviders ? { OPENAI_API_KEY: 'fixture-only-model-key', OPENAI_MODEL: 'fixture-only-model', RESEND_API_KEY: 'fixture-only-mail-key', MAIL_FROM: 'Test Fixture <fixture@example.org>' } : {}),
    ...options.env,
  };
  const app = await createApp({ env, dataPath: join(directory, 'island.sqlite'), fetchImpl: provider.fetchImpl, smtpTransportFactory: options.smtpTransportFactory, lookupImpl: options.lookupImpl || (async () => [{ address: '93.184.216.34', family: 4 }]) });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const origin = `http://127.0.0.1:${app.server.address().port}`;

  function client() {
    const jar = new Map();
    return {
      jar,
      async request(path, { method = 'GET', json, headers = {} } = {}) {
        const response = await fetch(origin + path, {
          method,
          headers: { ...(json !== undefined ? { 'content-type': 'application/json' } : {}), ...(jar.size ? { cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; ') } : {}), ...headers },
          ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
        });
        for (const cookie of response.headers.getSetCookie()) {
          const [pair] = cookie.split(';');
          const separator = pair.indexOf('=');
          jar.set(pair.slice(0, separator), pair.slice(separator + 1));
        }
        const raw = await response.text();
        let data;
        try { data = JSON.parse(raw); } catch { data = raw; }
        return { status: response.status, headers: response.headers, data, raw };
      },
    };
  }

  const owner = client();
  async function login() { return owner.request('/api/owner/login', { method: 'POST', json: { password: OWNER_PASSWORD } }); }
  async function visitor() {
    const guest = client();
    const response = await guest.request('/api/visit', { method: 'POST', json: {} });
    return { guest, response };
  }
  async function close({ remove = !options.directory } = {}) {
    await app.close();
    if (remove) await rm(directory, { recursive: true, force: true });
  }
  return { app, env, provider, origin, directory, owner, client, login, visitor, close };
}
