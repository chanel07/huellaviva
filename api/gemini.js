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
              { text: 'Analiza esta foto de un perro. Responde SOLO en JSON sin markdown, con estos campos: {"raza":"nombre de la raza en español o Mestizo si es criollo","color":"color principal del pelaje","tamano":"Pequeño o Mediano o Grande","descripcion":"descripcion breve de 1 linea del perro"}' }
            ]
          }]
        })
      }
    );
