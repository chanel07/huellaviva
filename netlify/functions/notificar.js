
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { titulo, mensaje, url } = JSON.parse(event.body);

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + process.env.ONESIGNAL_REST_KEY
      },
      body: JSON.stringify({
        app_id: '9a21a76b-dcd3-471e-9e57-fa0804ace887',
        included_segments: ['All'],
        headings: { es: titulo || '🐾 HuellaViva' },
        contents: { es: mensaje || 'Nuevo reporte en Santa Marta' },
        url: url || 'https://huellavivaapp.com',
        chrome_web_icon: 'https://huellavivaapp.com/icon-192.png',
        firefox_icon: 'https://huellavivaapp.com/icon-192.png',
      })
    });

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, id: data.id })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
