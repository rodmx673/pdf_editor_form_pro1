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

    // URL de tu Google Apps Script (ya configurada)
    const URL_GOOGLE_SCRIPT = 'https://script.google.com/macros/s/AKfycbx6I_CVjTENkeWgV30jNDgd-4pt_6Iz0UQnQ65cADS-fqgjl6Oo7j6JOXT0GLmxELiiWQ/exec';

    try {
        const response = await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.status(200).json(data);

    } catch (error) {
        console.error('Error al conectar con Google:', error);
        res.status(500).json({ error: 'Error al guardar en Google Sheets' });
    }
}
