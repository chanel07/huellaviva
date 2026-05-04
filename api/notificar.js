module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { titulo, mensaje, url } = req.body;

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + process.env.ONESIGNAL_REST_KEY
      },
      body: JSON.stringify({
        app_id: '9a21a76b-dcd3-471e-9e57-fa0804ace887',
        included_segments: ['All'],
        headings: { en: titulo || '🐾 HuellaViva', es: titulo || '🐾 HuellaViva' },
        contents: { en: mensaje || 'New report in Santa Marta', es: mensaje || 'Nuevo reporte en Santa Marta' },
        url: url || 'https://huellavivaapp.com',
        chrome_web_icon: 'https://huellavivaapp.com/icon-192.png',
      })
