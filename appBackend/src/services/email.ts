const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
const appName = process.env.APP_NAME ?? 'SNAP';

type ResendClient = {
  emails: {
    send: (payload: {
      from: string;
      to: string;
      subject: string;
      html: string;
    }) => Promise<{ data?: unknown; error?: { message: string } | null }>;
  };
};

let resendClient: ResendClient | null = null;

async function getResend(): Promise<ResendClient | null> {
  if (!resendApiKey) return null;
  if (resendClient) return resendClient;
  try {
    const { Resend } = await import('resend');
    resendClient = new Resend(resendApiKey) as ResendClient;
    return resendClient;
  } catch {
    return null;
  }
}

function formatFromAddress(): string {
  if (fromEmail.includes('<') && fromEmail.includes('>')) {
    return fromEmail;
  }
  return `${appName} <${fromEmail}>`;
}

export function normalizeEmail(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const subject = `${appName} verification code`;
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827;">
      <h1 style="font-size:20px;margin:0 0 12px;">Your ${appName} code</h1>
      <p style="margin:0 0 16px;color:#4B5563;">Enter this 6-digit code to continue. Do not share it with anyone.</p>
      <p style="font-size:32px;letter-spacing:6px;font-weight:700;margin:0 0 16px;">${code}</p>
      <p style="margin:0;color:#6B7280;font-size:13px;">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  const client = await getResend();
  if (!client) {
    console.log(`[DEV] Email OTP for ${to}: ${code}`);
    return;
  }

  const { error } = await client.emails.send({
    from: formatFromAddress(),
    to,
    subject,
    html,
  });

  if (error) {
    console.error('Failed to send OTP email:', error.message);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Email OTP for ${to}: ${code}`);
      return;
    }
    throw new Error(error.message);
  }
}
