// /api/notificar-match.js — Push OneSignal cuando hay un match IA
// Envía a TODOS los suscriptores (no podemos identificar al dueño específico
// a menos que guardes onesignal_id en cada reporte). Si quieres targeting
// real, agrega columna `onesignal_external_id` a la tabla `reportes` y
// llamas a OneSignal.login(reporte.id) cuando alguien publica.
//
// Variables de entorno requeridas en Vercel:
//   ONESIGNAL_APP_ID       -> 9a21a76b-dcd3-471e-9e57-fa0804ace887
//   ONESIGNAL_REST_API_KEY -> tu REST API key (no la de cliente)

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const APP_ID = process.env.ONESIGNAL_APP_ID;
  const REST_KEY = process.env.ONESIGNAL_REST_API_KEY;
  if (!APP_ID || !REST_KEY) return res.status(500).json({ error: 'OneSignal no configurado' });

  try {
    const { perdido_id, encontrado_id, score, nombre_perro } = req.body || {};
    if (!perdido_id || !encontrado_id) return res.status(400).json({ error: 'Faltan ids' });

    const titulo = `🎯 Posible coincidencia (${score}%)`;
    const mensaje = `Encontraron un perro parecido a ${nombre_perro}. Toca para comparar las fotos.`;
    const url = 'https://huellavivaapp.com/?match=' + encontrado_id;

    // Si tienes external_user_id por reporte, descomenta esto y úsalo:
    // const include_aliases = { external_id: [String(perdido_id)] };
    // y agrega: target_channel: 'push', include_aliases

    const payload = {
      app_id: APP_ID,
      headings: { en: titulo, es: titulo },
      contents: { en: mensaje, es: mensaje },
      url,
      included_segments: ['Subscribed Users'], // TODO: segmentar al dueño cuando tengas external_id
      data: { tipo: 'match_ia', perdido_id, encontrado_id, score },
      // priorizar visualmente
      android_accent_color: 'FF7C3AED',
      chrome_web_icon: 'https://huellavivaapp.com/icon-192.png'
    };

    const resp = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + REST_KEY
      },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('OneSignal error', data);
      return res.status(502).json({ error: 'OneSignal fallo', detalle: data });
    }
    return res.status(200).json({ ok: true, onesignal: data });
  } catch (e) {
    console.error('notificar-match err:', e);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
