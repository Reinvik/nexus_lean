/**
 * Gemini AI Service - Consultor de Mejora Continua
 * Genera análisis inteligentes basados en los datos de la empresa
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
Eres un consultor senior especializado en Lean Manufacturing, Mejora Continua y metodologías como A3, 5S, VSM y Kaizen. 
Trabajas para una empresa de consultoría de excelencia operacional.

FECHA DE HOY: ${today}
EMPRESA EN ANÁLISIS: ${companyName || 'Cliente'}

Tu rol es analizar los datos de avance de proyectos de mejora continua y proporcionar insights valiosos.
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

📊 PROYECTOS A3:
- Total proyectos: ${companyData.a3.total}
- Cerrados: ${companyData.a3.closed}
- En Proceso: ${companyData.a3.inProcess}
- Nuevos (sin avance): ${companyData.a3.new}
- Avance en planes de acción: ${companyData.a3.actionPlanRate}%
${companyData.a3.details.length > 0 ? `\nDetalles de proyectos activos:\n${companyData.a3.details.map(d => `  • "${d.title}" - Estado: ${d.status} - Responsable: ${d.responsible || 'Sin asignar'}
    - Tiene objetivo definido: ${d.hasGoal ? 'Sí' : 'NO ⚠️'}
    - Tiene Ishikawa: ${d.hasIshikawa ? 'Sí' : 'NO ⚠️'}
    - Problemática Ishikawa: ${d.ishikawaProblem || 'No definida'}
    - Tiene 5 Porqués: ${d.hasFiveWhys ? 'Sí' : 'NO'}
    - Acciones en plan: ${d.actionCount} (${d.actionsCompleted} completadas)
    - Tiene gráficos de seguimiento: ${d.hasCharts ? 'Sí' : 'NO'}`).join('\n')}` : ''}

🗺️ VSM (Value Stream Mapping):
- Mapas creados: ${companyData.vsm.count}

=== TU ANÁLISIS DEBE INCLUIR ===

1. **RESUMEN EJECUTIVO** (2-3 oraciones máximo)
   Evaluación general del estado de la mejora continua.

2. **EVALUACIÓN DE PROGRESO** 
   - ¿Se están trabajando los pendientes o están estancados?
   - ¿Hay trabajo real o solo registros sin movimiento?
   - Identifica patrones preocupantes (ej: muchos items sin responsable, fechas muy antiguas)

3. **ALERTAS CRÍTICAS** (si las hay)
   - Proyectos A3 sin objetivo medible
   - Ishikawas con problemáticas vagas (ej: "bajo rendimiento", "fallas frecuentes" SIN métrica)
   - Quick Wins de alto impacto abandonados
   - Tarjetas 5S muy antiguas sin cerrar

4. **COACHING EN BUENAS PRÁCTICAS**
   Educa al equipo sobre:
   - Cómo definir problemáticas medibles en Ishikawa (Ej: "OTIF menor al 80%", "Atrasos mayores al 30%", "Rendimiento inferior al 85%")
   - La importancia de objetivos SMART
   - Por qué cerrar el ciclo PDCA
   - Tips prácticos de Lean

5. **TOP 3 ACCIONES RECOMENDADAS**
   Acciones específicas, priorizadas, con responsable sugerido si es posible.

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
        {"tema": "título corto", "consejo": "explicación práctica"}
    ],
    "accionesRecomendadas": [
        {"prioridad": 1, "accion": "texto", "responsableSugerido": "nombre o null", "impacto": "alto|medio|bajo"}
    ],
    "enfoqueDelDia": "texto motivador y específico",
    "metricaDestacada": {"nombre": "ej: Tasa 5S", "valor": "75%", "tendencia": "up|down|stable"}
}

Sé constructivo pero honesto. Si hay problemas, señálalos con tacto pero claridad.
`;
};

/**
 * Prepara los datos de la empresa para el análisis
 */
export const prepareCompanyData = (data, companyName = 'Cliente') => {
    const { fiveS, quickWins, vsms, a3 } = data;

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
    const a3New = a3.filter(p => p.status === 'Nuevo').length;

    let totalActions = 0;
    let completedActions = 0;
    a3.forEach(p => {
        if (Array.isArray(p.actionPlan)) {
            totalActions += p.actionPlan.length;
            completedActions += p.actionPlan.filter(a => a.status === 'done').length;
        }
    });
    const actionPlanRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

    // Detailed A3 info for analysis
    const a3Details = a3.filter(p => p.status !== 'Cerrado').map(p => {
        // Check if Ishikawa has content - either problem text OR causes in categories
        const hasIshikawaContent = !!(p.ishikawas && p.ishikawas.length > 0 && (
            // Check if first ishikawa has problem defined
            (p.ishikawas[0]?.problem && p.ishikawas[0].problem.trim().length > 0) ||
            // OR check if there are any causes in any category
            (p.ishikawas[0]?.categories && Object.values(p.ishikawas[0].categories).some(
                causes => Array.isArray(causes) && causes.length > 0
            ))
        ));

        return {
            title: p.title,
            status: p.status,
            responsible: p.responsible,
            hasGoal: !!(p.goal && p.goal.trim().length > 0),
            hasIshikawa: hasIshikawaContent,
            ishikawaProblem: p.ishikawas?.[0]?.problem || null,
            hasFiveWhys: !!(p.multipleFiveWhys && p.multipleFiveWhys.length > 0),
            actionCount: p.actionPlan?.length || 0,
            actionsCompleted: p.actionPlan?.filter(a => a.status === 'done').length || 0,
            hasCharts: !!(p.followUpData && p.followUpData.length > 0 && p.followUpData[0]?.dataPoints?.length > 0)
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
            details: pendingDates.slice(0, 5) // Top 5 oldest
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
            new: a3New,
            actionPlanRate,
            details: a3Details
        },
        vsm: {
            count: vsms.length
        }
    };
};

/**
 * Llama a la API de Gemini para generar el análisis
 */
export const generateAIInsight = async (companyData, companyName, apiKey) => {
    if (!apiKey) {
        throw new Error('API Key de Gemini no configurada');
    }

    const prompt = getConsultantPrompt(companyData, companyName);

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
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

        if (!textResponse) {
            throw new Error('Respuesta vacía de Gemini');
        }

        // Parse JSON response
        const insight = JSON.parse(textResponse);
        return {
            ...insight,
            generatedAt: new Date().toISOString(),
            companyName
        };

    } catch (error) {
        console.error('Error generating AI insight:', error);
        throw error;
    }
};

/**
 * Verifica si ya hay un análisis reciente (menos de 24 horas)
 */
export const shouldGenerateNewInsight = (lastInsight) => {
    if (!lastInsight || !lastInsight.generatedAt) return true;

    const lastGenerated = new Date(lastInsight.generatedAt);
    const now = new Date();
    const hoursSinceLastGeneration = (now - lastGenerated) / (1000 * 60 * 60);

    return hoursSinceLastGeneration >= 24;
};

export default {
    prepareCompanyData,
    generateAIInsight,
    shouldGenerateNewInsight
};
