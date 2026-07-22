export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const body = await request.json();
    const {
      to,
      subject,
      htmlContent,
      attachments = [],
    } = body;

    function replaceVars(str, to) {
      const now = new Date();
      return str
        .replaceAll('{{email}}', to.email)
        .replaceAll('{{name}}', to.name || to.email)
        .replaceAll('{{date}}', now.toLocaleDateString('zh-CN'))
        .replaceAll('{{time}}', now.toLocaleTimeString('zh-CN'));
    }

    for (const recipient of (Array.isArray(to) ? to : [{ email: to }])) {
      const personalizedHtml = replaceVars(htmlContent, recipient);

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            email: env.SENDER_EMAIL,
            name: env.SENDER_NAME || '闲时科技',
          },
          to: [recipient],
          subject,
          htmlContent: personalizedHtml,
          ...(attachments.length && { attachment: attachments }),
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};
