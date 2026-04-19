export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nombre, tipo, ubicacion, raza } = req.body;

  const tipoTexto = tipo === 'perdido' ? '🚨 Perro perdido' : tipo === 'encontrado' ? '🐾 Perro encontrado' : '👁️ Avistamiento';
  const heading = tipoTexto + (nombre ? ': ' + nombre : '');
  const content = [raza, ubicacion].filter(Boolean).join(' · ') || 'Nuevo reporte en tu zona';

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + process.env.ONESIGNAL_API_KEY
      },
      body: JSON.stringify({
        app_id: '9a21a76b-dcd3-471e-9e57-fa0804ace887',
        included_segments: ['All'],
        headings: { en: heading, es: heading },
        contents: { en: content, es: content },
        url: 'https://huellaviva.vercel.app'
      })
    });

    const data = await response.json();
    return res.status(200).json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ error: 'Error enviando notificación' });
  }
}
