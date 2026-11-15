import nodemailer from 'nodemailer';
import { fail } from './security.mjs';

export function mailSettings(env) {
  const provider = (env.MAIL_PROVIDER || 'resend').toLowerCase();
  const port = Number(env.SMTP_PORT || 465);
  return { provider, port, configured: !!env.MAIL_FROM && (provider === 'smtp'
    ? !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && [465, 587].includes(port))
    : provider === 'resend' && !!env.RESEND_API_KEY) };
}

export async function sendMail(options, payload, idempotencyKey) {
  const { env, smtpTransportFactory = nodemailer.createTransport } = options;
  const settings = mailSettings(env);
  if (!settings.configured) fail(503, 'mail_unconfigured', '尚未配置真实邮件服务、发信地址和发信授权凭据。');
  if (settings.provider === 'resend') return sendResend(options, payload, idempotencyKey);
  const transport = smtpTransportFactory({
    host: env.SMTP_HOST, port: settings.port, secure: settings.port === 465,
    requireTLS: true, auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
  });
  try {
    const result = await transport.sendMail({
      from: payload.from || env.MAIL_FROM, to: payload.to,
      replyTo: payload.reply_to, subject: payload.subject, text: payload.text,
      // A stable Message-ID helps manual investigation; SMTP offers no deduplication guarantee.
      messageId: `<${idempotencyKey}@${env.SMTP_USER.split('@')[1] || 'island.local'}>`,
    });
    if (!result.accepted?.length || result.rejected?.length) fail(502, 'mail_rejected', '发信邮箱服务未接受收件地址，请检查地址和邮箱发送限制。');
    return { providerId: result.messageId, provider: 'smtp', status: 'provider_accepted' };
  } catch (error) {
    if (error.code === 'mail_rejected') throw error;
    if (error.code === 'EAUTH') fail(502, 'mail_rejected', '发信邮箱认证失败，请检查邮箱地址和 SMTP 授权码（Gmail 应用专用密码）。');
    if (error.responseCode >= 400 && error.responseCode < 600) fail(502, 'mail_rejected', `发信邮箱服务拒绝请求（SMTP ${error.responseCode}），请检查发送限制和收件地址。`);
    fail(502, 'mail_uncertain', '发信连接中断，结果待核实。请岛主检查已发送邮件，勿重复寄出。');
  } finally { transport.close?.(); }
}

async function sendResend({ env, fetchImpl }, payload, idempotencyKey) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) fail(503, 'mail_unconfigured', '尚未配置真实邮件服务和已验证发送地址。');
  let response;
  try { response = await fetchImpl('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(15_000), headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ from: env.MAIL_FROM, ...payload }) }); }
  catch { fail(502, 'mail_uncertain', '邮件服务连接中断，发送结果待核实。重试只复用原请求，避免重复邮件。'); }
  if (!response.ok) {
    const code = response.status >= 500 || response.status === 429 ? 'mail_uncertain' : 'mail_rejected';
    fail(502, code, `邮件服务返回 HTTP ${response.status}。${code === 'mail_uncertain' ? '发送结果待核实。' : '未接受邮件，请检查发送域名与配置。'}`);
  }
  const result = await response.json().catch(() => fail(502, 'mail_uncertain', '邮件服务响应无法解析，发送结果待核实。'));
  if (!result.id) fail(502, 'mail_uncertain', '邮件服务没有返回发送记录标识，结果待核实。');
  return { providerId: result.id, status: 'provider_accepted' };
}
