/**
 * Gemini AI Service - Consultor de Mejora Continua
 * Genera análisis inteligentes basados en los datos de la empresa
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Helper to format Ishikawa data
const formatIshikawa = (ishikawas) => {
    if (!ishikawas || ishikawas.length === 0) return "No hay diagramas de Ishikawa.";

    return ishikawas.map((ish, idx) => {
        const problem = ish.problem || "Problema no definido";
        const categories = Object.entries(ish.categories || {}).map(([cat, causes]) => {
            if (!causes || causes.length === 0) return null;
            const causeList = causes.map(c => {
                const text = typeof c === 'string' ? c : c.text;
                const priority = c.color === 'green' ? '(SI OCURRE)' : (c.color === 'red' ? '(NO OCURRE)' : '');
                return `      - ${text} ${priority}`;
            }).join('\n');
            return `    * ${cat}:\n${causeList}`;
        }).filter(Boolean).join('\n');

        return `  Diagrama #${idx + 1}: Problema: "${problem}"\n    Causa Raíz Seleccionada: ${ish.rootCause || "Ninguna"}\n${categories}`;
    }).join('\n\n');
};

// Helper to format 5 Whys
const formatFiveWhys = (fiveWhys) => {
    if (!fiveWhys || fiveWhys.length === 0) return "No hay análisis de 5 Porqués.";

    return fiveWhys.map((item, idx) => {
        const whys = (item.whys || []).filter(w => w.trim().length > 0).join(' -> ');
        const status = item.status === 'root' ? '(CAUSA RAÍZ)' : (item.status === 'discarded' ? '(DESCARTADO)' : '');
        return `  Análisis #${idx + 1}: ${item.problem}\n    Cadena: ${whys} ${status}`;
    }).join('\n');
};

// Helper to format Follow Up Charts
const formatCharts = (charts) => {
    if (!charts || charts.length === 0) return "No hay gráficos de seguimiento.";

    return charts.map((chart, idx) => {
        const dataPoints = chart.dataPoints || [];
        const lastPoints = dataPoints.slice(-3).map(dp => `${dp.label}: ${dp.value}`).join(', ');
        return `  Gráfico #${idx + 1}: ${chart.kpiName || "Sin nombre"}\n    Meta: ${chart.goal || "N/A"}\n    Últimos datos: ${lastPoints}`;
    }).join('\n');
};

/**
 * Prompt base del consultor de mejora continua
 */
const getConsultantPrompt = (companyData, companyName) => {
    const today = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
Ejes del Software "NEXUS BE LEAN":
    - Módulo 5S: Auditorías, hallazgos, acciones correctivas.
- Módulo Quick Wins: Mejoras rápidas de bajo costo.
- Módulo A3: Resolución de problemas(Ishikawa, 5 Porqués).
- Módulo VSM: Mapeo de flujo de valor.

        FECHA: ${today}
    EMPRESA: ${companyName || 'Cliente'}

TU ROL Y PODERES:
    1. Eres un mentor experto en Lean Manufacturing.
2. Tienes acceso SOLO a los datos de texto provistos aquí.NO tienes acceso a base de datos, no puedes borrar, editar ni ver otras empresas.
3. Todas las ideas o proyectos que sugieras deben ser atribuidos al usuario que pregunta.
4. NO puedes acceder al panel de administración ni cambiar configuraciones.

CAPACIDAD DE GENERACIÓN DE EJEMPLOS:
Si el usuario te pide un ejemplo(ej: "Dáme un ejemplo de A3 para seguridad"), debes generar una respuesta estructurada en Markdown que el usuario pueda copiar y usar.

FORMATO PARA EJEMPLOS DE PROYECTOS(A3):
Si te piden un ejemplo de A3, usa este formato:
## Ejemplo de Proyecto A3: [Título]
        ** Antecedentes **: [Descripción breve]
            ** Condición Actual **: [Datos cuantitativos del problema]
                ** Objetivo **: [Meta SMART]
                    ** Análisis Causa Raíz(Ishikawa sugerido) **:
    - Material: [Causa]
        - Método: [Causa]
            * (Incluye 5 Porqués simples)*
** Plan de Acción **:
    1.[Acción 1](Responsable: Usuario actual)
2.[Acción 2]

FORMATO PARA EJEMPLOS DE 5S:
## Ejemplo de Tarjeta 5S(Rojo)
        ** Hallazgo **: [Descripción]
            ** Ubicación **: [Lugar sugerido]
                ** Acción Correctiva **: [Acción]

                    === DATOS DE LA EMPRESA PARA ANÁLISIS ===

📋 TARJETAS 5S:
- Total: ${companyData.fiveS.total}
- Tasa de cierre: ${companyData.fiveS.rate}%
    ${companyData.fiveS.details.map(d => `  • PENDIENTE: ${d.reason} (${d.location}) - ${d.responsible}`).join('\n')}

⚡ QUICK WINS:
- Total: ${companyData.quickWins.total}
${companyData.quickWins.details.map(d => `  • IDEA: ${d.title} (Impacto: ${d.impact})`).join('\n')}

📊 PROYECTOS A3:
- Total: ${companyData.a3.total}
${companyData.a3.details.length > 0 ? companyData.a3.details.map(d => `
> PROYECTO: "${d.title}" (${d.status})
  - Objetivo: ${d.goal || "N/A"}
  - Causa Raíz: ${d.rootCause || "N/A"}
`).join('\n') : 'No hay proyectos activos.'
        }

=== TU ANÁLISIS ===
    1. Resumen Ejecutivo(Estado general).
2. Evaluación de Progreso(Coherencia metodológica).
3. Coaching(Errores detectados).
4. Acciones Recomendadas(Priorizadas).

REGLAS DE RESPUESTA:
- Si te piden ejemplos, usa la estructura de "CAPACIDAD DE GENERACIÓN DE EJEMPLOS".
- Si te preguntan por datos de otras empresas, aclara firmemente que no tienes acceso por seguridad.
- Mantén un tono profesional, motivador y educativo.
    `;
};

/**
 * Prepara los datos de la empresa para el análisis
 */
export const prepareCompanyData = (data, companyName = 'Cliente') => {
    const { fiveS, quickWins, vsms, a3, auditLogs } = data;

    // Calculate 5S metrics
    const fiveSClosed = fiveS.filter(i => i.status === 'Cerrado').length;
    const fiveSPending = fiveS.filter(i => i.status === 'Pendiente').length;
    const fiveSInProcess = fiveS.filter(i => i.status === 'En Proceso').length;
    const fiveSRate = fiveS.length > 0 ? Math.round((fiveSClosed / fiveS.length) * 100) : 0;

    // Find oldest pending 5S
    const pendingDates = fiveS
        .filter(i => i.status !== 'Cerrado' && i.date)
        .map(i => ({ ...i, daysSince: Math.floor((new Date() - new Date(i.date)) / (1000 * 60 * 60 * 24)) }))
        .sort((a, b) => b.daysSince - a.daysSince);

    // Quick Wins metrics
    const qwDone = quickWins.filter(i => i.status === 'done').length;
    const qwPending = quickWins.filter(i => i.status !== 'done').length;
    const qwHighImpactPending = quickWins.filter(i => i.status !== 'done' && i.impact === 'Alto').length;

    // A3 metrics
    const a3Closed = a3.filter(p => p.status === 'Cerrado').length;
    const a3InProcess = a3.filter(p => p.status === 'En Proceso').length;

    let totalActions = 0;
    let completedActions = 0;
    a3.forEach(p => {
        if (Array.isArray(p.actionPlan)) {
            totalActions += p.actionPlan.length;
            completedActions += p.actionPlan.filter(a => a.status === 'done').length;
        }
    });
    const actionPlanRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

    // Detailed A3 info for analysis - NOW INCLUDING FULL CONTENT
    const a3Details = a3.filter(p => p.status !== 'Cerrado').slice(0, 5).map(p => {
        return {
            title: p.title,
            status: p.status,
            responsible: p.responsible,
            background: p.background,
            currentCondition: p.currentCondition,
            goal: p.goal,
            rootCause: p.rootCause,
            countermeasures: p.countermeasures,

            // Pass full structures
            ishikawas: p.ishikawas,
            fiveWhys: p.multipleFiveWhys, // Note name mapping from A3.jsx
            followUpData: p.followUpData,

            hasGoal: !!(p.goal && p.goal.trim().length > 0),
            actionCount: p.actionPlan?.length || 0,
            actionsCompleted: p.actionPlan?.filter(a => a.status === 'done').length || 0,
        };
    });

    return {
        companyName,
        fiveS: {
            total: fiveS.length,
            closed: fiveSClosed,
            pending: fiveSPending,
            inProcess: fiveSInProcess,
            rate: fiveSRate,
            oldestPending: pendingDates[0]?.daysSince || null,
            details: pendingDates.slice(0, 5)
        },
        quickWins: {
            total: quickWins.length,
            done: qwDone,
            pending: qwPending,
            highImpactPending: qwHighImpactPending,
            details: quickWins.filter(i => i.status !== 'done').slice(0, 5)
        },
        a3: {
            total: a3.length,
            closed: a3Closed,
            inProcess: a3InProcess,
            actionPlanRate,
            details: a3Details // Reduced size handled by slice above to avoid huge payloads
        },
        vsm: {
            count: vsms.length
        },
        auditHistory: {
            deletedItems: auditLogs
                ? auditLogs.filter(log => log.action === 'DELETE').map(log => ({
                    type: log.entity_type,
                    date: log.created_at,
                    details: log.details?.deletedData || {},
                    user: log.user_email
                })).slice(0, 15)
                : []
        }
    };
};

/**
 * Llama a la API de Gemini para generar el análisis inicial
 */
export const generateAIInsight = async (companyData, companyName, apiKey) => {
    if (!apiKey) throw new Error('API Key de Gemini no configurada');

    const prompt = getConsultantPrompt(companyData, companyName);

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error en la API de Gemini');
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) throw new Error('Respuesta vacía de Gemini');

        const insight = JSON.parse(textResponse);
        return {
            ...insight,
            generatedAt: new Date().toISOString(),
            companyName,
            // Store context for chat
            contextData: companyData,
            basePrompt: prompt
        };

    } catch (error) {
        console.error('Error generating AI insight:', error);
        throw error;
    }
};

/**
 * Envía un mensaje de chat a Gemini manteniendo el contexto
 */
export const sendChatMessage = async (history, newMessage, companyData, companyName, apiKey) => {
    if (!apiKey) throw new Error('API Key de Gemini no configurada');

    // Construir historial para Gemini
    // El primer mensaje debe ser el system prompt con los datos context
    const prompt = getConsultantPrompt(companyData, companyName);

    // Simplificamos el history para la API
    // Gemini API v1beta usa 'user' y 'model' roles
    const contents = [
        { role: 'user', parts: [{ text: prompt + "\n\nIMPORTANTE: A partir de ahora, responde como un asistente de chat conversacional, respondiendo a las preguntas específicas del usuario sobre estos datos. No generes JSON, responde en Markdown." }] },
        { role: 'model', parts: [{ text: "Entendido. Estoy listo para responder preguntas sobre los datos de mejora continua de la empresa." }] },
        ...history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        })),
        { role: 'user', parts: [{ text: newMessage }] }
    ];

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error en el chat con Gemini');
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) throw new Error('Respuesta vacía del chat');

        return textResponse;

    } catch (error) {
        console.error('Error in chat:', error);
        throw error;
    }
};

/**
 * Verifica si ya hay un análisis reciente (menos de 24 horas)
 */
export const shouldGenerateNewInsight = (lastInsight) => {
    if (!lastInsight || !lastInsight.generatedAt) return true;
    const hoursSince = (new Date() - new Date(lastInsight.generatedAt)) / (1000 * 60 * 60);
    return hoursSince >= 24;
};

export default {
    prepareCompanyData,
    generateAIInsight,
    sendChatMessage,
    shouldGenerateNewInsight
};
