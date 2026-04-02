import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
};

// メール送信（失敗してもエラーを投げない）
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || "noreply@example.com";

  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: `Sports Team <${fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error("メール送信エラー:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("メール送信例外:", err);
    return false;
  }
}
