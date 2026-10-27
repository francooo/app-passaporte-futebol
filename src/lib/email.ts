import "server-only";

type Email = { to: string; subject: string; html: string; text: string };

/**
 * Envia via API do Resend. Sem RESEND_API_KEY (desenvolvimento), apenas
 * registra no console do servidor para o link poder ser testado.
 */
export async function sendEmail({ to, subject, html, text }: Email) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[email:dev] Para: ${to}\nAssunto: ${subject}\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Passaporte Esportivo <onboarding@resend.dev>",
      to,
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    console.error("[email] falha no envio", res.status, await res.text());
  }
}
