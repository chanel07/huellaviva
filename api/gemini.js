module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, mediaType } = req.body;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mediaType || 'image/jpeg', data: image } },
              { text: 'Analiza esta foto de un perro. Responde SOLO en JSON sin markdown, con estos campos: {"raza":"nombre de la raza en español o Mestizo si es criollo","color":"color principal del pelaje","tamano":"Pequeño o Mediano o Grande","descripcion":"descripción breve de 1 línea del perro"}' }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    const info = JSON.parse(text);
    return res.status(200).json({ ok: true, ...info });
  } catch (e) {
    console.error('Gemini error:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
