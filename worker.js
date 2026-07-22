export default {
  async fetch(request, env, ctx) {
    // ===== CORS 配置 =====
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const {
      to,
      subject,
      htmlContent,
      textContent,
      sender,
      attachments = [],
    } = body;

    if (!to || !subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: 'Missing to / subject / htmlContent' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // ===== 构造 Brevo payload =====
    const payload = {
      sender: sender || { email: env.SENDER_EMAIL },
      to: typeof to === 'string' ? [{ email: to }] : to,
      subject,
      htmlContent,
      ...(textContent && { textContent }),
    };

    // 附件处理（base64）
    if (Array.isArray(attachments) && attachments.length > 0) {
      payload.attachment = attachments.map((att) => ({
        name: att.name,
        content: att.content, // base64
      }));
    }

    // ===== 调用 Brevo API =====
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return new Response(
        JSON.stringify({
          error: data.message || data,
          code: resp.status,
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        messageId: data.messageId,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  },
};
