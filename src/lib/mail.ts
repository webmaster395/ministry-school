import nodemailer from "nodemailer";

/**
 * Envoi d'e-mails transactionnels depuis l'application (distinct des e-mails de connexion,
 * gérés par Supabase). Utilise les mêmes identifiants SMTP que Supabase si on les recopie ici
 * (voir .env.example) — sans eux, l'envoi est simplement ignoré, rien ne casse.
 */
export async function sendMail(opts: { to: string; subject: string; text: string }) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !user || !password) {
    console.warn("SMTP non configuré : e-mail non envoyé (" + opts.subject + ")");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: true,
    auth: { user, pass: password },
  });

  await transporter.sendMail({
    from: `Ministry School <${user}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });
}
