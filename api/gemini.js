module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, mediaType } = req.body;

  // Función auxiliar: llama a Gemini con reintentos automáticos
  async function llamarGeminiConReintentos(maxIntentos = 3) {
    let ultimoError = null;

    for (let intento = 1; intento <= maxIntentos; intento++) {
      try {
        const response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_KEY,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inline_data: { mime_type: mediaType || 'image/jpeg', data: image } },
                  { text: 'Analiza esta foto de un perro. Responde SOLO en JSON sin markdown: {"raza":"raza en espanol o Mestizo","color":"color del pelaje","tamano":"Pequeno o Mediano o Grande","descripcion":"descripcion breve"}' }
                ]
              }]
            })
          }
        );

        const data = await response.json();
        console.log(`Gemini intento ${intento}:`, JSON.stringify(data).substring(0, 200));

        // Si Gemini está sobrecargado (503) o tuvo error temporal, reintentamos
        if (data.error && (data.error.code === 503 || data.error.code === 429 || data.error.code === 500)) {
          ultimoError = data.error;
          console.log(`Intento ${intento} fallo con codigo ${data.error.code}. Reintentando...`);

          if (intento < maxIntentos) {
            // Espera progresiva: 2s, 4s, 8s (backoff exponencial)
            const esperaMs = Math.pow(2, intento) * 1000;
            await new Promise(resolve => setTimeout(resolve, esperaMs));
            continue;
          }
        }

        // Si llegamos aqui, la respuesta es valida (o un error no recuperable)
        return data;

      } catch (err) {
        ultimoError = err;
        console.error(`Intento ${intento} - error de red:`, err.message);

        if (intento < maxIntentos) {
          const esperaMs = Math.pow(2, intento) * 1000;
          await new Promise(resolve => setTimeout(resolve, esperaMs));
          continue;
        }
      }
    }

    // Si todos los intentos fallaron
    throw new Error('Gemini fallo despues de ' + maxIntentos + ' intentos: ' + JSON.stringify(ultimoError));
  }

  try {
    const data = await llamarGeminiConReintentos(3);

    if (!data.candidates || !data.candidates[0]) {
      return res.status(400).json({ ok: false, raw: data });
    }

    const text = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    const info = JSON.parse(text);

    return res.status(200).json({ ok: true, ...info });

  } catch (e) {
    console.error('Error final:', e.message);
    return res.status(503).json({
      ok: false,
      error: 'El servicio de IA esta temporalmente saturado. Intenta de nuevo en unos segundos.',
      detalle: e.message
    });
  }
};
