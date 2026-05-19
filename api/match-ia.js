// /api/match-ia.js — Compara perro encontrado vs lista de perdidos usando Gemini Vision
// VERSION CON RETRY AUTOMATICO PARA ERRORES 503

export const config = { runtime: 'nodejs', maxDuration: 60 };

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ACEPTA AMBOS NOMBRES DE VARIABLE PARA EVITAR PROBLEMAS DE CONFIG
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
  if (!apiKey) {
    console.error('Falta GEMINI_API_KEY o GEMINI_KEY en variables de entorno');
    return res.status(500).json({ error: 'GEMINI_API_KEY no configurada' });
  }

  try {
    const { encontrado, perdidos } = req.body || {};
    if (!encontrado || !encontrado.foto_url) {
      return res.status(400).json({ error: 'Falta encontrado.foto_url' });
    }
    if (!Array.isArray(perdidos) || !perdidos.length) {
      console.log('match-ia: lista de perdidos vacia');
      return res.status(200).json({ matches: [] });
    }

    console.log(`match-ia: comparando 1 encontrado vs ${perdidos.length} perdidos`);

    const candidatos = perdidos.slice(0, 12);

    // Descargar imagenes
    const imgEncontrado = await fetchImageBase64(encontrado.foto_url);
    const imgsPerdidos = await Promise.all(
      candidatos.map(p => fetchImageBase64(p.foto_url).catch(err => {
        console.error('Error descargando imagen perdido:', p.id, err.message);
        return null;
      }))
    );

    // Construir prompt
    const parts = [
      { text: buildPrompt(encontrado, candidatos) },
      { text: '\n\n=== FOTO DEL PERRO ENCONTRADO ===' },
      { inline_data: { mime_type: imgEncontrado.mime, data: imgEncontrado.b64 } }
    ];
    candidatos.forEach((p, i) => {
      if (!imgsPerdidos[i]) return;
      parts.push({ text: `\n\n=== PERDIDO #${i + 1} (id: ${p.id}) — ${[p.nombre, p.raza, p.color].filter(Boolean).join(' · ') || 'sin datos'} ===` });
      parts.push({ inline_data: { mime_type: imgsPerdidos[i].mime, data: imgsPerdidos[i].b64 } });
    });

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            matches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  perdido_id: { type: 'string' },
                  score: { type: 'integer' },
                  razones: { type: 'string' }
                },
                required: ['perdido_id', 'score', 'razones']
              }
            }
          },
          required: ['matches']
        }
      }
    };

    // LLAMADA A GEMINI CON RETRY AUTOMATICO
    const data = await llamarGeminiConReintentos(apiKey, body, 3);

    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    console.log('match-ia respuesta cruda de Gemini:', txt.substring(0, 300));

    let parsed;
    try { parsed = JSON.parse(txt); } catch (e) {
      console.error('match-ia: error parseando JSON:', e.message);
      parsed = { matches: [] };
    }

    const idsValidos = new Set(candidatos.map(c => String(c.id)));
    const matches = (parsed.matches || [])
      .filter(m => idsValidos.has(String(m.perdido_id)))
      .map(m => ({
        perdido_id: m.perdido_id,
        score: Math.max(0, Math.min(100, parseInt(m.score, 10) || 0)),
        razones: (m.razones || '').slice(0, 280)
      }));

    console.log(`match-ia: ${matches.length} matches encontrados (de ${candidatos.length} comparados)`);

    return res.status(200).json({
      matches,
      modelo: GEMINI_MODEL,
      comparados: candidatos.length
    });
  } catch (e) {
    console.error('match-ia handler error:', e);
    return res.status(500).json({ error: 'Error interno', detalle: String(e.message || e) });
  }
}

// FUNCION CON RETRY PARA LIDIAR CON ERRORES 503/429/500 DE GEMINI
async function llamarGeminiConReintentos(apiKey, body, maxIntentos = 3) {
  let ultimoError = null;

  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      // Si responde 503 (sobrecargado), 429 (rate limit) o 500, reintentar
      if (resp.status === 503 || resp.status === 429 || resp.status === 500) {
        const errTxt = await resp.text();
        ultimoError = `${resp.status}: ${errTxt.slice(0, 200)}`;
        console.log(`Intento ${intento} fallo con status ${resp.status}. Reintentando...`);

        if (intento < maxIntentos) {
          const esperaMs = Math.pow(2, intento) * 1000; // 2s, 4s, 8s
          await new Promise(r => setTimeout(r, esperaMs));
          continue;
        }
        throw new Error(`Gemini sigue saturado despues de ${maxIntentos} intentos: ${ultimoError}`);
      }

      if (!resp.ok) {
        const errTxt = await resp.text();
        console.error('Gemini error no recuperable:', resp.status, errTxt);
        throw new Error(`Gemini fallo: ${resp.status} - ${errTxt.slice(0, 200)}`);
      }

      // Respuesta OK
      const data = await resp.json();
      console.log(`Gemini OK en intento ${intento}`);
      return data;

    } catch (err) {
      ultimoError = err.message;
      console.error(`Intento ${intento} - error:`, err.message);

      if (intento < maxIntentos) {
        const esperaMs = Math.pow(2, intento) * 1000;
        await new Promise(r => setTimeout(r, esperaMs));
        continue;
      }
      throw err;
    }
  }
}

function buildPrompt(enc, perdidos) {
  return `Eres un experto en identificación visual de perros. Tu tarea: comparar un perro ENCONTRADO contra una lista de perros PERDIDOS y determinar la probabilidad de que sean el mismo animal.

DATOS DEL PERRO ENCONTRADO:
- Raza: ${enc.raza || 'no indicada'}
- Color: ${enc.color || 'no indicado'}
- Tamaño: ${enc.tamano || 'no indicado'}
- Género: ${enc.genero || 'no indicado'}
- Ubicación del hallazgo: ${enc.ubicacion || 'no indicada'}
- Descripción: ${enc.descripcion || '(sin descripción)'}

PERROS PERDIDOS A COMPARAR (${perdidos.length}):
${perdidos.map((p, i) => `${i + 1}. id=${p.id} | ${[p.nombre, p.raza, p.color, p.tamano, p.genero].filter(Boolean).join(' · ') || 'sin datos'} | zona: ${p.ubicacion || '?'} | desc: ${p.descripcion || '(vacía)'}`).join('\n')}

INSTRUCCIONES:
1. Para CADA perro perdido, observa su foto y compárala visualmente con la del encontrado.
2. Evalúa: raza/morfología, patrón de color y manchas, tamaño aparente, oreja (paradas/caídas), pelaje (largo/textura), señas particulares.
3. Considera también los datos textuales (color, tamaño, género), pero el peso principal es VISUAL.
4. Asigna un score 0-100:
   - 90-100: casi certeza visual de que es el mismo perro
   - 75-89: muy probable, varias características clave coinciden
   - 60-74: posible coincidencia, algunas señales similares
   - 40-59: poco probable, pero no se descarta
   - 0-39: claramente perros distintos
5. En "razones" da una explicación BREVE (máx 25 palabras) y CONCRETA en español de Colombia, mencionando lo que viste (ej. "Mismo patrón blanco en pecho, orejas caídas, color marrón idéntico"). NO uses comillas dobles dentro del texto.
6. Devuelve SOLO los perros con score >= 50. No inventes coincidencias.
7. Si ningún perdido se parece, devuelve un array vacío.

Responde con JSON exclusivamente, según el schema. El campo perdido_id debe ser EXACTAMENTE el id que te pasé.`;
}

async function fetchImageBase64(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('No se pudo descargar imagen: ' + url);
  const mime = resp.headers.get('content-type') || 'image/jpeg';
  const buf = Buffer.from(await resp.arrayBuffer());
  return { mime: mime.split(';')[0], b64: buf.toString('base64') };
}
