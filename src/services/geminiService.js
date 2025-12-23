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
Eres el consultor experto de IA integrado en "Nexus Be Lean", un software avanzado de gestión de mejora continua.
Trabajas para una empresa de consultoría de excelencia operacional.

CONTEXTO DEL SOFTWARE "NEXUS BE LEAN":
Este software permite a las empresas gestionar digitalmente sus iniciativas Lean:
- Módulo 5S: Digitalización de auditorías 5S, seguimiento de hallazgos con fotos antes/después y gestión de acciones correctivas.
- Módulo Quick Wins: Captura y gestión ágil de ideas de mejora rápida y bajo costo.
- Módulo A3: Gestión estructurada de resolución de problemas complejos (Ishikawa, 5 Porqués, Plan de Acción).
- Módulo VSM (Value Stream Mapping): Mapeo de flujo de valor para identificar desperdicios.

FECHA DE HOY: ${today}
EMPRESA EN ANÁLISIS: ${companyName || 'Cliente'}

Tu rol es analizar los datos de avance de proyectos de mejora continua y proporcionar insights valiosos.
Puedes responder preguntas sobre qué es el software, qué módulos tiene y cómo usar las herramientas Lean disponibles.
Debes ser directo, práctico y enfocado en agregar valor.

=== DATOS ACTUALES DE LA EMPRESA ===

📋 TARJETAS 5S:
- Total: ${companyData.fiveS.total}
- Cerradas: ${companyData.fiveS.closed}
- Pendientes: ${companyData.fiveS.pending}
- En Proceso: ${companyData.fiveS.inProcess}
- Tasa de cierre: ${companyData.fiveS.rate}%
${companyData.fiveS.oldestPending ? `- Hallazgo más antiguo pendiente: ${companyData.fiveS.oldestPending} días` : ''}
${companyData.fiveS.details.length > 0 ? `\nDetalles de pendientes:\n${companyData.fiveS.details.map(d => `  • ${d.reason || 'Sin razón'} - Ubicación: ${d.location || 'N/A'} - Responsable: ${d.responsible || 'Sin asignar'} - Fecha: ${d.date || 'N/A'}`).join('\n')}` : ''}

⚡ QUICK WINS:
- Total ideas: ${companyData.quickWins.total}
- Implementadas: ${companyData.quickWins.done}
- Pendientes: ${companyData.quickWins.pending}
- Alto Impacto sin implementar: ${companyData.quickWins.highImpactPending}
${companyData.quickWins.details.length > 0 ? `\nDetalles de pendientes:\n${companyData.quickWins.details.map(d => `  • "${d.title}" - Impacto: ${d.impact || 'N/A'} - Responsable: ${d.responsible || 'Sin asignar'}`).join('\n')}` : ''}

📊 PROYECTOS A3 (DETALLADO):
- Total proyectos: ${companyData.a3.total}
- Cerrados: ${companyData.a3.closed}
- En Proceso: ${companyData.a3.inProcess}
- Avance en planes de acción: ${companyData.a3.actionPlanRate}%

DETALLE DE PROYECTOS ACTIVOS:
${companyData.a3.details.length > 0 ? companyData.a3.details.map(d => `
> PROYECTO: "${d.title}" (Estado: ${d.status}, Responsable: ${d.responsible || 'Sin asignar'})
  - Antecedentes: ${d.background || "No definido"}
  - Condición Actual: ${d.currentCondition || "No definida"}
  - Objetivo: ${d.goal || "No definido"}
  - Resumen Análisis Causa Raíz: ${d.rootCause || "No definido"}
  - Análisis Ishikawa:
${formatIshikawa(d.ishikawas)}
  - Análisis 5 Porqués:
${formatFiveWhys(d.fiveWhys)}
  - Contramedidas: ${d.countermeasures || "No definidas"}
  - Seguimiento (KPIs):
${formatCharts(d.followUpData)}
`).join('\n--------------------------------------------------\n') : 'No hay proyectos activos con detalle.'}

🗺️ VSM (Value Stream Mapping):
- Mapas creados: ${companyData.vsm.count}

🗑️ HISTORIAL DE ELIMINACIONES RECIENTES:
${companyData.auditHistory && companyData.auditHistory.deletedItems.length > 0
            ? companyData.auditHistory.deletedItems.map(d => `  • [${d.date ? new Date(d.date).toLocaleDateString() : 'N/A'}] ${d.type}: ${d.details.location || ''} - ${d.details.reason || ''} (Por: ${d.user || 'Desconocido'})`).join('\n')
            : 'No hay registros recientes de eliminación.'}

=== TU ANÁLISIS DEBE INCLUIR ===

1. **RESUMEN EJECUTIVO** (2-3 oraciones máximo)
   Evaluación general del estado de la mejora continua.

2. **EVALUACIÓN DE PROGRESO** 
   - Analiza si los proyectos A3 tienen coherencia lógica (Causa raíz -> Contramedida).
   - Verifica si los Ishikawas tienen causas profundas o superficiales.
   - Revisa si los 5 Porqués realmente llegan a la causa raíz.
   - ¿Se están trabajando los pendientes o están estancados?

3. **ALERTAS CRÍTICAS** (si las hay)
   - Proyectos A3 con "saltos de lógica" (ej: solución no relacionada a la causa).
   - Objetivos vagos no medibles.
   - Ishikawas vacíos o incompletos en proyectos "En Proceso".
   - Tarjetas 5S muy antiguas sin cerrar.

4. **COACHING EN BUENAS PRÁCTICAS**
   Educa al equipo sobre errores específicos detectados en los datos provistos.
   Ej: "En el proyecto X, el 5to Porqué parece ser una justificación, no una causa raíz."

5. **TOP 3 ACCIONES RECOMENDADAS**
   Acciones específicas, priorizadas, con responsable sugerido.

6. **ENFOQUE DEL DÍA**
   Una única prioridad clara para hoy.

=== FORMATO DE RESPUESTA ===
Responde en JSON con esta estructura exacta:
{
    "resumenEjecutivo": "texto",
    "evaluacionProgreso": {
        "estado": "bueno|regular|critico",
        "observaciones": ["observación 1", "observación 2"]
    },
    "alertas": [
        {"tipo": "critica|advertencia|info", "mensaje": "texto", "proyecto": "nombre si aplica"}
    ],
    "coachingPracticas": [
        {"tema": "título corto", "consejo": "explicación práctica y específica al contexto"}
    ],
    "accionesRecomendadas": [
        {"prioridad": 1, "accion": "texto", "responsableSugerido": "nombre o null", "impacto": "alto|medio|bajo"}
    ],
    "enfoqueDelDia": "texto motivador y específico",
    "metricaDestacada": {"nombre": "ej: Tasa 5S", "valor": "75%", "tendencia": "up|down|stable"}
}

Sé constructivo pero honesto. Si hay problemas metodológicos en los A3, señálalos.
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
