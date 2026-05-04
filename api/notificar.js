module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { titulo, mensaje, url, ciudad } = req.body;

    // Si hay ciudad, notificar solo a usuarios de esa ciudad
    const filtros = ciudad ? {
      filters: [
        { field: 'tag', key: 'ciudad', relation: '=', value: ciudad }
      ]
    } : {
      included_segments: ['All']
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + process.env.ONESIGNAL_REST_KEY
      },
      body: JSON.stringify({
        app_id: '9a21a76b-dcd3-471e-9e57-fa0804ace887',
        ...filtros,
        headings: { en: titulo || '🐾 HuellaViva', es: titulo || '🐾 HuellaViva' },
        contents: { en: mensaje || 'New report', es: mensaje || 'Nuevo reporte' },
        url: url || 'https://huellavivaapp.com',
        chrome_web_icon: 'https://huellavivaapp.com/icon-192.png',
      })
    });

    const data = await response.json();
    console.log('OneSignal response:', JSON.stringify(data));
    if (data.errors) {
      return res.status(400).json({ ok: false, errors: data.errors });
    }
    return res.status(200).json({ ok: true, id: data.id, recipients: data.recipients });
  } catch (e) {
    console.error('Error:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
