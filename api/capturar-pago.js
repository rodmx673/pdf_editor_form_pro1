const PRECIOS_VALIDOS = ['1.99', '4.99'];

async function getAccessToken(apiBase, clientId, secret) {
    const auth = Buffer.from(clientId + ':' + secret).toString('base64');
    const res = await fetch(apiBase + '/v1/oauth2/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + auth,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Error de autenticación con PayPal');
    return data.access_token;
}

async function getOrder(apiBase, token, orderId) {
    const res = await fetch(apiBase + '/v2/checkout/orders/' + encodeURIComponent(orderId), {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'No se pudo consultar la orden de PayPal');
    return data;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { order_id, session_id } = req.body || {};

    if (typeof order_id !== 'string' || !/^[A-Z0-9]{8,40}$/i.test(order_id)) {
        return res.status(400).json({ error: 'Orden de PayPal inválida' });
    }
    if (typeof session_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(session_id)) {
        return res.status(400).json({ error: 'Sesión inválida' });
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;
    const unlockToken = process.env.PDF_UNLOCK_TOKEN;
    const apiBase = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
    const pythonBase = (process.env.PYTHON_API_BASE || 'https://pdf.teclingoingles.com').replace(/\/$/, '');

    if (!clientId || !secret || !unlockToken) {
        return res.status(500).json({ error: 'Faltan variables de entorno del servidor de pagos' });
    }

    try {
        const accessToken = await getAccessToken(apiBase, clientId, secret);

        let order;
        const captureRes = await fetch(apiBase + '/v2/checkout/orders/' + encodeURIComponent(order_id) + '/capture', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            }
        });

        order = await captureRes.json();

        if (!captureRes.ok) {
            const issue = order && order.details && order.details[0] && order.details[0].issue;
            if (issue === 'ORDER_ALREADY_CAPTURED') {
                order = await getOrder(apiBase, accessToken, order_id);
            } else {
                throw new Error(order.message || 'PayPal rechazó el pago');
            }
        }

        if (order.status !== 'COMPLETED') {
            throw new Error('El pago no está completado en PayPal');
        }

        const units = order.purchase_units || [];
        const customIds = units.map(unit => unit.custom_id).filter(Boolean);
        
        if (customIds.length > 0 && !customIds.includes(session_id)) {
            throw new Error('La orden de PayPal no corresponde a esta sesión');
        }

        const captured = units[0] && units[0].payments && units[0].payments.captures && units[0].payments.captures[0]
            ? units[0].payments.captures[0].amount
            : units[0] && units[0].amount;
        const capturedAmount = captured && captured.value;
        const capturedCurrency = captured && captured.currency_code;

        if (!PRECIOS_VALIDOS.includes(String(capturedAmount)) || capturedCurrency !== 'USD') {
            throw new Error('El monto capturado no corresponde a un plan válido');
        }

        const markRes = await fetch(pythonBase + '/api/session/' + encodeURIComponent(session_id) + '/mark-paid', {
            method: 'POST',
            headers: { 'X-Unlock-Token': unlockToken }
        });
        const markData = await markRes.json().catch(() => ({}));

        if (!markRes.ok || !markData.paid) {
            throw new Error(markData.detail || 'No se pudo desbloquear la sesión');
        }

        res.status(200).json({
            status: 'ok',
            paid: true,
            session_id: session_id,
            order_id: order_id,
            amount: String(capturedAmount)
        });
    } catch (error) {
        console.error('Error capturando pago:', error);
        res.status(400).json({ error: error.message || 'No se pudo confirmar el pago' });
    }
}
