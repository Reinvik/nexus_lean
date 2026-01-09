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

// Helper to format Action Plan
const formatActionPlan = (actions) => {
    if (!actions || actions.length === 0) return "No hay acciones definidas.";

    return actions.map((act, idx) => {
        const status = act.status === 'done' ? '(COMPLETADA)' : '(PENDIENTE)';
        return `    * ${act.activity} [Resp: ${act.responsible}] [Vence: ${act.date}] ${status}`;
    }).join('\n');
};

// Helper to format Follow Up Charts
const formatCharts = (charts) => {
    if (!charts || charts.length === 0) return "No hay gráficos de seguimiento.";

    return charts.map((chart, idx) => {
        const kpiType = chart.kpiType === 'oee' ? 'OEE (Eficiencia General)' : 'Simple';
        const goal = chart.goal ? `${chart.goal}${chart.isPercentage ? '%' : ''}` : "N/A";

        let dataSummary = "";
        if (chart.kpiType === 'oee') {
            // Summarize last OEE point
            const last = chart.dataPoints && chart.dataPoints.length > 0 ? chart.dataPoints[chart.dataPoints.length - 1] : null;
            if (last) {
                // Calculate OEE if not pre-calculated (simplified logic for text representation)
                const oeeVal = last.oee || "ND";
                dataSummary = `Último registro (${last.date}): OEE ${oeeVal}% (Disp: ${last.availability || 'ND'}%, Rend: ${last.performance || 'ND'}%, Cal: ${last.quality || 'ND'}%)`;
            } else {
                dataSummary = "Sin datos registrados.";
            }
        } else {
            // Simple Chart
            const points = chart.dataPoints || [];
            if (points.length > 0) {
                // Get last 3 points
                dataSummary = points.slice(-3).map(dp => `${dp.date}: ${dp.value}`).join(', ');
            } else {
                dataSummary = "Sin datos registrados.";
            }
        }

        return `  Gráfico #${idx + 1}: ${chart.kpiName || "Sin nombre"} (${kpiType})\n    Meta: ${goal}\n    Datos: ${dataSummary}`;
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
- Módulo VSM: Mapeo de flujo de valor (Estado Actual -> Estado Futuro).

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
- Total Histórico: ${companyData.fiveS.total}
- Abiertas (Pendiente/Proceso): ${companyData.fiveS.pending + companyData.fiveS.inProcess}
- Cerradas (Finalizadas): ${companyData.fiveS.closed}
- Tasa de cierre: ${companyData.fiveS.rate}% (Promedio cierre: ${companyData.fiveS.avgClosure} días)
${companyData.fiveS.details.map(d => `  • ${d.status ? d.status.toUpperCase() : 'PENDIENTE'}: ${d.reason} (${d.location}) - ${d.responsible}`).join('\n')}
${companyData.auditLogs && companyData.auditLogs.length > 0 ? `👉 ÚLTIMA AUDITORÍA 5S: Puntaje ${companyData.auditLogs[0].score}% (${companyData.auditLogs[0].date})` : ''}

⚡ QUICK WINS:
- Total: ${companyData.quickWins.total} (Implementadas: ${companyData.quickWins.done}, Alto Impacto: ${companyData.quickWins.highImpact})
${companyData.quickWins.details.map(d => `  • IDEA: ${d.title} (Impacto: ${d.impact}, Esfuerzo: ${d.effort}) - Estado: ${d.status}\n    Detalle: "${d.description || 'Sin descripción'}"`).join('\n')}

📊 PROYECTOS A3:
- Total: ${companyData.a3.total}
${companyData.a3.details.length > 0 ? companyData.a3.details.map(d => `
> PROYECTO A3: "${d.title}" (Estado: ${d.status})
  1. DEFINICIÓN:
     - Antecedentes: ${d.background || "No definido"}
     - Condición Actual: ${d.currentCondition || "No definida"}
     - Objetivo: ${d.goal || "No definido"}
     - Responsable: ${d.responsible || "Sin asignar"}

  2. ANÁLISIS DE CAUSA:
     - Causa Raíz Identificada: ${d.rootCause || "No identificada"}
     - Diagramas de Ishikawa:
${formatIshikawa(d.ishikawas)}
     - 5 Porqués:
${formatFiveWhys(d.fiveWhys)}

  3. PLAN Y SEGUIMIENTO:
     - Contramedidas (Estrategia): ${d.countermeasures || "No definidas"}
     - Plan de Acción:
${formatActionPlan(d.actionPlan)}
     - Métricas de Seguimiento (Gráficos):
${formatCharts(d.followUpData)}
`).join('\n\n------------------------------------------------------------\n\n') : 'No hay proyectos activos.'}

🗺️ MAPAS VSM:
- Total: ${companyData.vsm.count}
${companyData.vsm.details && companyData.vsm.details.length > 0 ? companyData.vsm.details.map(v => `  • VSM: "${v.name || 'Sin nombre'}" (${v.status === 'current' ? 'Estado Actual' : (v.status === 'future' ? 'Estado Futuro' : 'Finalizado')})
    - Descripción: ${v.description || "N/A"}
    - Lead Time: ${v.leadTime || 'ND'}
    - Tiempo Proceso: ${v.processTime || 'ND'}
    - Eficiencia: ${v.efficiency || 'ND'}
    - Takt Time: ${v.taktTime || 'ND'}`).join('\n') : 'No hay mapas VSM activos.'}


=== TU ANÁLISIS ===
    1. Resumen Ejecutivo(Estado general).
    2. Evaluación de Progreso(Coherencia metodológica).
    3. Coaching(Errores detectados).
    4. Acciones Recomendadas(Priorizadas).

ANÁLISIS DE TENDENCIAS (NUEVO):
En la sección de progreso, si detectas datos históricos:
- Identifica la VELOCIDAD de mejora (¿se están cerrando más tarjetas que las que se abren?).
- Busca CORRELACIONES: ¿El aumento de Quick Wins coincide con mejoras en KPI OEE?
- Realiza una PREDICCIÓN simple para la próxima semana basada en la velocidad actual.

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

    // Calculate 5S metrics (Case Insensitive to catch 'Cerrado', 'cerrado', 'CLOSED', etc if generic)
    const fiveSClosed = fiveS.filter(i => i.status?.toLowerCase() === 'cerrado').length;
    const fiveSPending = fiveS.filter(i => i.status?.toLowerCase() === 'pendiente').length;
    const fiveSInProcess = fiveS.filter(i => i.status?.toLowerCase() === 'en proceso').length;
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

    // Detailed A3 info for analysis - NOW INCLUDING FULL CONTENT (Expanded to top 50)
    const a3Details = a3.filter(p => p.status !== 'Cerrado').slice(0, 50).map(p => {
        // Sanitize Ishikawa to only text
        const sanitizedIshikawas = (p.ishikawas || []).map(ish => ({
            problem: ish.problem,
            rootCause: ish.rootCause,
            categories: Object.entries(ish.categories || {}).reduce((acc, [cat, causes]) => {
                acc[cat] = (causes || []).map(c => typeof c === 'string' ? c : (c.text || ''));
                return acc;
            }, {})
        }));

        // Sanitize 5 Whys
        const sanitizedFiveWhys = (p.multipleFiveWhys || []).map(fw => ({
            problem: fw.problem,
            rootCause: fw.rootCause,
            whys: fw.whys,
            status: fw.status
        }));

        // Calculate OEE metrics helper (simplified logic mirroring component)
        const calculateMetrics = (point, config) => {
            if (!config) return point;
            const available = parseFloat(point.availableTime) || 0;
            const productive = parseFloat(point.productiveTime) || 0;
            const produced = parseFloat(point.producedPieces) || 0;
            const defects = parseFloat(point.defectPieces) || 0;
            const speed = parseFloat(config.standardSpeed) || 100;

            const av = available > 0 ? (productive / available) * 100 : 0;
            const perf = (productive * speed) > 0 ? (produced / (productive * speed)) * 100 : 0;
            const qual = produced > 0 ? ((produced - defects) / produced) * 100 : 0;
            const oee = (av * perf * qual) / 10000;

            return {
                ...point,
                availability: av.toFixed(1),
                performance: perf.toFixed(1),
                quality: qual.toFixed(1),
                oee: oee.toFixed(1)
            };
        };

        return {
            title: p.title,
            status: p.status,
            responsible: p.responsible,
            background: p.background,
            currentCondition: p.currentCondition,
            goal: p.goal,
            rootCause: p.rootCause,
            countermeasures: p.countermeasures,

            // Pass full action plan
            actionPlan: (p.actionPlan || []).map(a => ({
                activity: a.activity,
                responsible: a.responsible,
                date: a.date,
                status: a.status
            })),

            // Pass sanitized structures
            ishikawas: sanitizedIshikawas,
            fiveWhys: sanitizedFiveWhys,
            followUpData: (p.followUpData || []).map(f => {
                const kpiType = f.kpiType || 'simple';
                const oeeConfig = f.oeeConfig || {};

                // Map and calculate points
                const mappedPoints = (f.dataPoints || []).map(dp => {
                    if (kpiType === 'oee') {
                        return calculateMetrics(dp, oeeConfig);
                    }
                    return { date: dp.date, value: dp.value };
                });

                return {
                    kpiName: f.kpiName,
                    kpiType,
                    goal: f.kpiGoal, // Note: Schema uses kpiGoal in some places, goal in others. Mapping both.
                    isPercentage: f.isPercentage,
                    dataPoints: mappedPoints
                };
            }),

            // Keep generic metrics for summary if needed, but prompted detailed data above is key
            metrics: [],

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
            avgClosure: fiveS.filter(c => c.status === 'Cerrado' && c.date && c.solutionDate).reduce((acc, c, _, arr) => {
                const diffTime = Math.abs(new Date(c.solutionDate) - new Date(c.date));
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return acc + diffDays / arr.length;
            }, 0).toFixed(1),
            oldestPending: pendingDates[0]?.daysSince || null,
            details: pendingDates.slice(0, 50).map(d => ({
                id: d.id,
                status: d.status,
                reason: d.reason || 'Sin descripción',
                location: d.location || 'Sin ubicación',
                responsible: d.responsible || 'Sin responsable',
                date: d.date,
                daysSince: d.daysSince
            }))
        },
        quickWins: {
            total: quickWins.length,
            done: qwDone,
            pending: qwPending,
            highImpact: quickWins.filter(i => i.impact === 'Alto').length,
            highImpactPending: qwHighImpactPending,
            details: quickWins.filter(i => i.status !== 'done').slice(0, 50).map(d => ({
                id: d.id,
                title: d.title,
                impact: d.impact,
                effort: d.effort,
                status: d.status,
                description: d.description
            }))
        },
        auditLogs: auditLogs ? auditLogs.slice(0, 5).map(a => ({
            date: a.date,
            score: a.score,
            auditor: a.auditor
        })) : [],
        a3: {
            total: a3.length,
            closed: a3Closed,
            inProcess: a3InProcess,
            actionPlanRate,
            details: a3Details // Reduced size handled by slice above to avoid huge payloads
        },
        vsm: {
            count: vsms.length,
            details: vsms.map(v => ({
                name: v.name,
                status: v.status,
                description: v.description,
                leadTime: v.lead_time || v.leadTime,
                processTime: v.process_time || v.processTime,
                efficiency: v.efficiency,
                taktTime: v.takt_time || v.taktTime
            }))
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
/**
 * Llama a la API de Gemini para generar el análisis inicial
 */
export const generateAIInsight = async (companyData, companyName, apiKey) => {
    if (!apiKey) throw new Error('API Key de Gemini no configurada');

    let prompt = getConsultantPrompt(companyData, companyName);

    // Append JSON Analysis Instructions
    prompt += `
    
    === TU TAREA: ANÁLISIS INICIAL ===
    Genera un reporte de consultoría en formato JSON estricto.
    
    IMPORTANTE: DEBES RESPONDER SIEMPRE EN FORMATO JSON VÁLIDO CON LA SIGUIENTE ESTRUCTURA Y NADA MÁS:
    {
        "resumenEjecutivo": "Texto del resumen...",
        "metricaDestacada": { "nombre": "Nombre KPI", "valor": "Valor", "tendencia": "up|down|neutral" },
        "evaluacionProgreso": { "estado": "bueno|regular|critico", "observaciones": ["obs1", "obs2"] },
        "alertas": [{ "tipo": "critica|advertencia|info", "mensaje": "Texto alerta", "proyecto": "Opcional" }],
        "proximosPasos": [{ "titulo": "Acción", "descripcion": "Detalle", "prioridad": "alta|media|baja" }],
        "coachingPracticas": [{ "tema": "Titulo", "consejo": "Consejo detallado" }],
        "enfoqueDelDia": "Frase motivadora o foco técnico"
    }
    `;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192,
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

        // Cleanup: Extract JSON object using regex to handle extra text/markdown
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        const cleanedText = jsonMatch ? jsonMatch[0] : textResponse;

        let insight;
        try {
            insight = JSON.parse(cleanedText);
        } catch (e) {
            console.error("JSON Parse Error. Raw text:", textResponse);
            throw new Error("La IA no generó un formato válido. Intenta de nuevo.");
        }

        // Validate content and normalize keys
        // Sometimes Gemini returns "resumen" instead of "resumenEjecutivo"
        // or "analysis" instead of the expected structure. We normalize here.
        if (!insight.resumenEjecutivo && insight.resumen) {
            insight.resumenEjecutivo = insight.resumen;
        }
        if (!insight.resumenEjecutivo && insight.summary) {
            insight.resumenEjecutivo = insight.summary;
        }

        // Ensure critical fields exist
        if (!insight.resumenEjecutivo) {
            // Fallback if structure is deep/wrong
            insight.resumenEjecutivo = "El análisis se generó pero el resumen no tiene el formato esperado. Revisa las secciones detalladas.";
        }

        // Ensure arrays exist
        if (!insight.alertas) insight.alertas = [];
        if (!insight.proximosPasos) insight.proximosPasos = [];
        if (!insight.coachingPracticas) insight.coachingPracticas = [];

        if (!insight.resumenEjecutivo) {
            throw new Error("Análisis incompleto recibido. Reintentando...");
        }

        return {
            ...insight,
            generatedAt: new Date().toISOString(),
            companyName,
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

    // Base Prompt (Context Only)
    const prompt = getConsultantPrompt(companyData, companyName);

    // Simplificamos el history para la API
    // Gemini API v1beta usa 'user' y 'model' roles
    const contents = [
        { role: 'user', parts: [{ text: prompt + "\n\nIMPORTANTE: A partir de ahora, responde como un asistente de chat conversacional. NO USES FORMATO MARKDOWN. NO uses negritas (**texto**), ni cursivas (*texto*), ni listas con asteriscos. Usa solo texto plano y listas con guiones simples (-) o números si es necesario. NO GENERES JSON." }] },
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

/**
 * Genera una solución propuesta para un Quick Win
 */
export const generateQuickWinSolution = async (title, description, apiKey) => {
    if (!apiKey) throw new Error('API Key de Gemini no configurada');

    const prompt = `
        Eres un experto en Lean Manufacturing y mejora continua.
        Problema: "${title}"
        Descripción: "${description}"

        Tu tarea:
        1. Propone una solución técnica técnica breve pero efectiva (máx 50 palabras).
        2. Incluye un beneficio esperado.
        3. Sé directo y práctico.
        
        Responde solo con el texto de la solución.
    `;

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

        if (!textResponse) throw new Error('Respuesta vacía de Gemini');

        return textResponse.trim();

    } catch (error) {
        console.error('Error generating solution:', error);
        throw error;
    }
};

export default {
    prepareCompanyData,
    generateAIInsight,
    sendChatMessage,
    shouldGenerateNewInsight,
    generateQuickWinSolution
};
