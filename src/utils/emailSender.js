const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

function buildMailtoUrl(to, subject, message) {
  const encodedSubject = encodeURIComponent(subject || 'Message');
  const encodedBody = encodeURIComponent(message || '');
  return `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
}

export async function sendAutomatedEmail({
  to,
  subject,
  message,
  templateId,
  templateParams = {},
  fallbackToMailto = true,
}) {
  const resolvedTo = Array.isArray(to) ? to.filter(Boolean).join(',') : (to || '').trim();
  if (!resolvedTo) {
    return { ok: false, method: 'mailto', error: 'No recipient provided' };
  }

  const serviceId = EMAILJS_SERVICE_ID || process.env.REACT_APP_EMAILJS_SERVICE_ID;
  const publicKey = EMAILJS_PUBLIC_KEY || process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

  if (serviceId && publicKey) {
    try {
      const payload = {
        service_id: serviceId,
        template_id: templateId || process.env.REACT_APP_EMAILJS_ACCESS_TEMPLATE_ID,
        user_id: publicKey,
        template_params: {
          to_email: resolvedTo,
          subject,
          message,
          ...templateParams,
        },
      };

      const response = await fetch('https://api.emailjs.com/api/v1/1/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return { ok: true, method: 'emailjs' };
      }

      const errorText = await response.text();
      console.error('EmailJS send failed', response.status, errorText);
    } catch (error) {
      console.error('EmailJS send failed', error);
    }
  }

  if (fallbackToMailto) {
    return {
      ok: false,
      method: 'mailto',
      fallbackUrl: buildMailtoUrl(resolvedTo, subject, message),
    };
  }

  return { ok: false, method: 'none', error: 'Email delivery unavailable' };
}
