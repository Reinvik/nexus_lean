/**
 * Gemini AI Service for Quick Wins
 * Generates AI-powered solutions using Gemini 2.0 Flash API
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Generates a solution proposal for a Quick Win
 * @param title - The Quick Win title/problem
 * @param description - Detailed description of the problem
 * @param apiKey - Gemini API key
 * @returns Promise<string> - Generated solution text
 */
export const generateQuickWinSolution = async (
    title: string,
    description: string,
    apiKey: string
): Promise<string> => {
    if (!apiKey) {
        throw new Error('API Key de Gemini no configurada');
    }

    const prompt = `
Eres un experto en Lean Manufacturing y mejora continua.
Problema: "${title}"
Descripción: "${description}"

Tu tarea:
1. Propone una solución técnica breve pero efectiva (máx 50 palabras).
2. Incluye un beneficio esperado.
3. Sé directo y práctico.

Responde solo con el texto de la solución.
    `.trim();

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 256
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error en la API de Gemini');
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error('Respuesta vacía de Gemini');
        }

        return textResponse.trim();

    } catch (error) {
        console.error('Error generating solution:', error);
        throw error;
    }
};

/**
 * Consults the AI using company data context
 * @param query - User query
 * @param context - JSON stringified data context
 * @param apiKey - Gemini API key
 * @returns Promise<string> - AI response
 */
export const consultWithCompanyData = async (
    query: string,
    context: string,
    apiKey: string
): Promise<string> => {
    if (!apiKey) {
        throw new Error('API Key de Gemini no configurada');
    }

    const systemPrompt = `
Eres el "Consultor IA Nexus Be Lean 2026", un asistente de inteligencia artificial avanzado y experto en Lean Manufacturing.
Tu objetivo es analizar la información de la empresa y proporcionar respuestas estratégicas, prácticas y basadas en datos.

CONTEXTO DE DATOS (JSON):
${context}

INSTRUCCIONES:
1. Analiza el contexto proporcionado (Quick Wins, Tarjetas 5S, Proyectos A3, etc.) para responder la consulta del usuario.
2. Si la consulta es sobre estado general, resume los hallazgos clave.
3. Sugiere mejoras basadas en metodologías Lean (5S, Kaizen, A3).
4. Mantén un tono profesional, analítico y motivador ("Nexus Be Lean 2026 style").
5. Si no hay datos relevantes en el contexto, indícalo claramente pero ofrece consejos generales de Lean.
6. NO inventes datos que no estén en el contexto.

CONSULTA DEL USUARIO:
"${query}"

Responde en formato Markdown, usando listas y negritas para resaltar puntos clave.
    `.trim();

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.4, // Lower temperature for more analytical/factual responses
                    maxOutputTokens: 2048 // Allow longer responses for analysis
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error en la API de Gemini');
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error('Respuesta vacía de Gemini');
        }

        return textResponse.trim();

    } catch (error) {
        console.error('Error consulting AI:', error);
        throw error;
    }
};

/**
 * Generates a structured plant analysis report in JSON format
 * @param context - JSON stringified data context
 * @param apiKey - Gemini API key
 * @returns Promise<any> - Parsed JSON analysis
 */
export const generatePlantAnalysis = async (
    context: string,
    apiKey: string
): Promise<any> => {
    if (!apiKey) throw new Error('API Key de Gemini no configurada');

    const systemPrompt = `
Eres el "Consultor IA Nexus Be Lean 2026", auditor experto en Lean Manufacturing.
Analiza los datos de la planta y genera un reporte estructurado en formato JSON.

CONTEXTO DE DATOS:
${context}

DAME UN JSON CON ESTA ESTRUCTURA EXACTA (sin markdown, solo JSON raw):
{
  "executive_summary": "Resumen narrativo de 1 párrafo (max 60 palabras) sobre el estado actual, mencionando adopción de herramientas y áreas críticas.",
  "kpis": [
    { "label": "Nombre del KPI (ej: Tasa Cierre 5S)", "value": "Valor (ej: 15%)", "trend": "up" | "down" | "neutral" }
  ],
  "progress_evaluation": {
    "status": "BUENO" | "REGULAR" | "CRITICO",
    "points": ["Observación 1", "Observación 2", "Observación 3"]
  },
  "alerts": [
    { "level": "critical" | "warning" | "info", "message": "Mensaje de la alerta", "context": "Proyecto/Área relacionada" }
  ],
  "next_steps": [
    { "title": "Acción sugerida", "description": "Breve descripción", "priority": "ALTA" | "MEDIA" | "BAJA" }
  ]
}

REGLAS:
- Sé estricto y crítico.
- Si no hay datos (arrays vacíos), reporta estado CRITICO o REGULAR y sugiere empezar a usar las herramientas.
- Calcula KPIs reales basados en los datos (ej: % de Tarjetas 5S con status 'Cerrado').
- Responde SOLO con el JSON.
    `.trim();

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 4096,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error en Gemini API');
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) throw new Error('Respuesta vacía de Gemini');

        return JSON.parse(textResponse);

    } catch (error) {
        console.error('Error in plant analysis:', error);
        throw error;
    }
};

export default {
    generateQuickWinSolution,
    consultWithCompanyData,
    generatePlantAnalysis
};
