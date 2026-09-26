// email.js
// One function: send an OTP email. Uses Resend's API directly over fetch,
// so we don't even need their SDK as a dependency.

async function sendOtpEmail(toEmail, code) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "AI Student Guardian <onboarding@resend.dev>";

  if (!apiKey) {
    // Fail loudly in a way that's obvious during setup, rather than silently
    // pretending the email sent.
    throw new Error("RESEND_API_KEY is not set in backend/.env");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: toEmail,
      subject: "Your AI Student Guardian login code",
      text: `Your login code is ${code}. It expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`,
      html: `<p>Your login code is <strong style="font-size:1.3em;letter-spacing:2px">${code}</strong>.</p><p>It expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error (${res.status}): ${body}`);
  }
}

module.exports = { sendOtpEmail };
