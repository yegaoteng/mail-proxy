// Cloudflare Worker → Brevo v3 SMTP/email API
// https://developers.brevo.com/docs/send-a-transactional-email
export default {
  async fetch(request, env) {
    // 只允许 POST
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // 简单 CORS（按你前端域名收紧）
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const {
      to,          // "a@x.com" 或 [{ email, name }]
      subject,
      htmlContent,
      textContent,
      sender,      // 可选，默认用 env.SENDER_EMAIL
    } = body;

    if (!to || !subject || !htmlContent) {
      return new Response(JSON.stringify({ error: 'Missing to/subject/htmlContent' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 构造 Brevo payload
    const payload = {
      sender: sender || { email: env.SENDER_EMAIL },
      to: typeof to === 'string' ? [{ email: to }] : to,
      subject,
      htmlContent,
      ...(textContent && { textContent }),
    };

    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, messageId: data.messageId }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
