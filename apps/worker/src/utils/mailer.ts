import nodemailer from 'nodemailer'

type MailProvider = 'smtp' | 'resend'

type MailSendResult = {
  provider: MailProvider
  providerMessageId: string | null
}

function activeMailProvider(): MailProvider {
  return process.env.EMAIL_PROVIDER === 'resend' ? 'resend' : 'smtp'
}

function readMailerConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM
  }
}

function readResendConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.MAIL_FROM
  }
}

function isMailerConfigured() {
  if (activeMailProvider() === 'resend') {
    const config = readResendConfig()
    return Boolean(config.apiKey && config.from)
  }

  const config = readMailerConfig()
  return Boolean(config.host && config.user && config.pass && config.from)
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

function ensureMailerConfigured() {
  if (!isMailerConfigured()) {
    throw new Error('Email service is not configured')
  }
}

async function sendEmail(params: {
  to: string
  subject: string
  html: string
}) {
  ensureMailerConfigured()

  if (activeMailProvider() === 'resend') {
    const config = readResendConfig()
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: config.from,
        to: [params.to],
        subject: params.subject,
        html: params.html
      })
    })

    const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email with Resend')
    }

    return {
      provider: 'resend' as const,
      providerMessageId: data.id || null
    } satisfies MailSendResult
  }

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html
  })

  return {
    provider: 'smtp' as const,
    providerMessageId: info.messageId || null
  } satisfies MailSendResult
}

export async function sendVerificationEmail(params: {
  to: string
  name?: string | null
  verifyUrl: string
}) {
  const { to, name, verifyUrl } = params

  return sendEmail({
    to,
    subject: 'Verify your email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2>Verify your email</h2>
        <p>Hello ${name || 'there'},</p>
        <p>Click the button below to verify your email address.</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;background:#06b6d4;color:#0f172a;text-decoration:none;border-radius:10px;font-weight:700;">
            Verify email
          </a>
        </p>
        <p>If the button does not work, open this link:</p>
        <p>${verifyUrl}</p>
      </div>
    `
  })
}

export async function sendPasswordResetEmail(params: {
  to: string
  name?: string | null
  resetUrl: string
}) {
  const { to, name, resetUrl } = params

  return sendEmail({
    to,
    subject: 'Reset your password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2>Reset your password</h2>
        <p>Hello ${name || 'there'},</p>
        <p>Click the button below to reset your password.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#06b6d4;color:#0f172a;text-decoration:none;border-radius:10px;font-weight:700;">
            Reset password
          </a>
        </p>
        <p>If the button does not work, open this link:</p>
        <p>${resetUrl}</p>
      </div>
    `
  })
}

export async function sendInvitationEmail(params: {
  to: string
  invitedByName?: string | null
  workspaceName: string
  roleLabel: string
  acceptUrl: string
}) {
  const { to, invitedByName, workspaceName, roleLabel, acceptUrl } = params

  return sendEmail({
    to,
    subject: `Invitation to join ${workspaceName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2>You have been invited</h2>
        <p>${invitedByName || 'A teammate'} invited you to join <strong>${workspaceName}</strong>.</p>
        <p>Your access level: <strong>${roleLabel}</strong></p>
        <p>
          <a href="${acceptUrl}" style="display:inline-block;padding:12px 18px;background:#06b6d4;color:#0f172a;text-decoration:none;border-radius:10px;font-weight:700;">
            Accept invitation
          </a>
        </p>
        <p>If the button does not work, open this link:</p>
        <p>${acceptUrl}</p>
      </div>
    `
  })
}
