module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { image, mediaType } = req.body;
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + process.env.GEMINI_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: mediaType || 'image/jpeg', data: image } },
          { text: 'Analiza esta foto de un perro. Responde SOLO con un objeto JSON puro, sin markdown, sin explicaciones, sin texto adicional. Formato exacto: {"raza":"raza en español o Mestizo","color":"color del pelaje","tamano":"Pequeño o Mediano o Grande","descripcion":"descripcion breve de 1 linea"}' }
        ]}]
      })
    });
    const data = await response.json();
    if (!data.candidates || !data.candidates[0]) {
      return res.status(400).json({ ok: false, raw: data });
    }
    const raw = data.candidates[0].content.parts[0].text;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(400).json({ ok: false, raw });
    const info = JSON.parse(match[0]);
    return res.status(200).json({ ok: true, ...info });
  } catch (e) {
    console.error('Error:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
