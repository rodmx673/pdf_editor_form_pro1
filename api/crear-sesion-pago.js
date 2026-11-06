export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST, OPTIONS');
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { plan, session_id } = req.body || {};
    const precios = { basico: '1.99', pro: '4.99' };

    if (!precios[plan]) {
        return res.status(400).json({ error: 'Plan inválido' });
    }
    if (typeof session_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(session_id)) {
        return res.status(400).json({ error: 'Sesión inválida' });
    }

    const precio = precios[plan];
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;
    const apiBase = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
    const siteUrl = (process.env.SITE_URL || 'https://pdfeditorformpro1.vercel.app').replace(/\/$/, '');

    if (!clientId || !secret) {
        return res.status(500).json({ error: 'Faltan configurar las credenciales de PayPal en Vercel' });
    }

    try {
        const auth = Buffer.from(clientId + ':' + secret).toString('base64');

        const tokenRes = await fetch(apiBase + '/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + auth,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error('Error de autenticación con PayPal');

        const orderRes = await fetch(apiBase + '/v2/checkout/orders', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + tokenData.access_token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    custom_id: session_id,
                    amount: { currency_code: 'USD', value: precio },
                    description: 'Plan ' + plan.toUpperCase() + ' - PDF Edit Forms'
                }],
                application_context: {
                    brand_name: 'PDF Edit Forms',
                    user_action: 'PAY_NOW',
                    shipping_preference: 'NO_SHIPPING',
                    return_url: siteUrl + '/?pago=exitoso&session_id=' + encodeURIComponent(session_id),
                    cancel_url: siteUrl + '/?pago=cancelado'
                }
            })
        });

        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.message || 'Error al crear la orden en PayPal');

        const approvalUrl = orderData.links.find(link => link.rel === 'approve').href;
        res.status(200).json({ url: approvalUrl, order_id: orderData.id });
    } catch (error) {
        console.error('Error PayPal:', error);
        res.status(500).json({ error: 'Error interno del servidor de pagos' });
    }
}
