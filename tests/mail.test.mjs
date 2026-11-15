import test from 'node:test';
import assert from 'node:assert/strict';
import { mailSettings, sendMail } from '../server/mail.mjs';
const env = { MAIL_PROVIDER: 'smtp', SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '465', SMTP_USER: 'fixture@example.org', SMTP_PASSWORD: 'fixture-only-password', MAIL_FROM: 'fixture@example.org' };
const payload = { to: ['recipient@example.org'], reply_to: 'visitor@example.org', subject: 'TEST FIXTURE', text: 'TEST FIXTURE body' };

test('SMTP credentials must be complete and encrypted port supported', () => {
  assert.equal(mailSettings(env).configured, true);
  for (const key of ['SMTP_HOST','SMTP_USER','SMTP_PASSWORD','MAIL_FROM']) assert.equal(mailSettings({ ...env, [key]: '' }).configured, false);
  assert.equal(mailSettings({ ...env, SMTP_PORT: '25' }).configured, false);
});

test('SMTP maps sender, recipient and reply address with mandatory TLS', async () => {
  for (const port of ['465','587']) {
    let config, message, closed = false;
    const result = await sendMail({ env: { ...env, SMTP_PORT: port }, smtpTransportFactory: options => { config = options; return { async sendMail(value) { message = value; return { accepted: value.to, rejected: [], messageId: value.messageId }; }, close() { closed = true; } }; } }, payload, 'contact-fixture');
    assert.equal(config.secure, port === '465');
    assert.equal(config.requireTLS, true);
    assert.equal(config.debug, false);
    assert.equal(message.replyTo, payload.reply_to);
    assert.deepEqual(message.to, payload.to);
    assert.equal(message.from, env.MAIL_FROM);
    assert.equal(result.status, 'provider_accepted');
    assert.equal(closed, true);
  }
});

test('SMTP errors stay truthful and never disclose provider credential errors', async () => {
  for (const [error, code] of [[{code:'EAUTH'},'mail_rejected'], [{responseCode:550},'mail_rejected'], [{code:'ETIMEDOUT'},'mail_uncertain']]) {
    await assert.rejects(sendMail({ env, smtpTransportFactory: () => ({ async sendMail() { throw Object.assign(new Error('SECRET_SENTINEL'), error); }, close() {} }) }, payload, 'contact-fixture'), err => err.code === code && !err.message.includes('SECRET_SENTINEL'));
  }
});
