// Gemini API integration for Orlando
const GEMINI_API_KEY = "AQ.Ab8RN6IxyzuU9oBgntm1O_StJfW-TMyY-ISRx9f0D8FKOgpkSQ";
const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Eres Orlando, una Inteligencia Artificial especializada y diseñada exclusivamente para ayudar a maestros y profesores.

Tu misión es facilitar la gestión diaria del aula: asistencia, tareas, calificaciones, conducta y generación de material pedagógico.

REGLAS IMPORTANTES:
1. Este chat pertenece EXCLUSIVAMENTE a UN colegio. Nunca menciones ni uses información de otros colegios.
2. Recuerda y usa TODO el historial de la conversación para mantener memoria de estudiantes, asistencias, tareas entregadas o no, puntajes, faltas y observaciones de conducta.
3. Cuando el profesor te dé información (ej: "Marta entregó ciencias (3pts) pero no matemáticas (6pts). Mateo faltó sin justificativo"), confirma, organiza y guarda mentalmente esos datos.
4. Si te piden el promedio de un estudiante, calcula según la escala que el profesor indique (1-10, 1-5, 1-7, etc.). Si no se especifica, asume 1 a 10.
5. Cuando pregunten "¿por qué sacó X?", responde con detalle basado en el historial: faltas, tareas no entregadas, puntos restados por conducta, etc.
6. Puedes generar exámenes, tareas, ejercicios de verdadero/falso, opción múltiple, completar, etc. de cualquier materia y nivel.
7. Sé profesional, claro, empático y práctico. Responde siempre en español.
8. Si te piden exportar o generar material, entrega el contenido completo, bien estructurado y listo para usar.
9. Si detectas que falta información importante, pregunta de forma amable.
10. Mantén un tono de colega docente: útil, preciso y sin relleno innecesario.

FORMATO DE RESPUESTAS:
- Usa listas y estructura clara cuando haya varios estudiantes o datos.
- Para promedios y reportes, usa tablas simples en texto o listas.
- Cuando generes un examen o ejercicio, numera las preguntas y, si el profesor lo pide, incluye las respuestas al final.`;

/**
 * Llama a Gemini con el historial de mensajes del colegio actual.
 * @param {Array} history - Array de {role: 'user'|'model', parts: [{text: string}]}
 * @param {string} userMessage - Nuevo mensaje del usuario
 * @returns {Promise<string>} - Respuesta de texto de la IA
 */
async function callGemini(history, userMessage) {
  const contents = [
    ...history,
    {
      role: "user",
      parts: [{ text: userMessage }]
    }
  ];

  const body = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096
    }
  };

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      throw new Error(`Error de Gemini (${response.status}). Verifica la API key o cuota.`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Respuesta vacía de Gemini");
    }

    return text.trim();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Genera material pedagógico (examen, tarea, etc.)
 */
async function generateMaterial(type, subject, grade, count, extra) {
  const prompt = `Genera un ${type} de la materia/tema "${subject}" para el nivel "${grade || 'general'}".
Cantidad de preguntas/ejercicios: ${count}.
${extra ? `Instrucciones adicionales: ${extra}` : ""}

Entrega el contenido completo, bien formateado, listo para imprimir o exportar.
Si es examen o tarea, incluye espacio para nombre y fecha.
Al final, si es posible, incluye una clave de respuestas.`;

  return await callGemini([], prompt);
}
