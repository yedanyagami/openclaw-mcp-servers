// SMS Redirect Worker — HTTPS URL → sms: deep link
// Auth: Bearer token via env.SMS_AUTH_TOKEN (wrangler secret)
export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === '/send') {
            const to = url.searchParams.get('to');
            const body = url.searchParams.get('body');
            const auth = url.searchParams.get('auth');

            if (!env.SMS_AUTH_TOKEN || auth !== env.SMS_AUTH_TOKEN) {
                return new Response('Unauthorized', { status: 401 });
            }

            if (!to || !body) {
                return new Response('Missing to or body', { status: 400 });
            }

            // Sanitize inputs to prevent XSS
            const safeTo = to.replace(/[^+0-9\-\s]/g, '');
            const safeBody = body.replace(/[<>"'&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[c]));

            const encodedBody = encodeURIComponent(body);
            const smsAndroid = `sms:${safeTo}?body=${encodedBody}`;
            const smsIOS = `sms:${safeTo}&body=${encodedBody}`;

            return new Response(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>SMS</title>
    <style>
        body { font-family: -apple-system, sans-serif; max-width: 400px; margin: 40px auto; padding: 20px; text-align: center; }
        .btn { display: inline-block; padding: 16px 32px; background: #1a73e8; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; margin: 20px 0; }
        .info { background: #f5f5f5; padding: 12px; border-radius: 8px; margin: 10px 0; word-break: break-all; font-family: monospace; font-size: 14px; }
    </style>
</head>
<body>
    <h2>SMS</h2>
    <div class="info">${safeTo}</div>
    <div class="info">${safeBody}</div>
    <a id="smsBtn" href="#" class="btn">Open SMS App</a>
    <div class="info" style="user-select:all;cursor:pointer;">${safeBody}</div>
    <script>
        var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        var smsUri = isIOS ? "${smsIOS}" : "${smsAndroid}";
        document.getElementById('smsBtn').href = smsUri;
        if (/Android|iPhone/i.test(navigator.userAgent)) {
            setTimeout(function() { window.location.href = smsUri; }, 500);
        }
    </script>
</body>
</html>`, {
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                    'Content-Security-Policy': "default-src 'self' 'unsafe-inline' sms:"
                },
            });
        }

        if (url.pathname === '/health') {
            return new Response(JSON.stringify({ ok: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response('SMS Redirect Service', { status: 200 });
    }
};
