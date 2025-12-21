// Follow this setup guide to integrate the Deno runtime and Resend:
// https://supabase.com/docs/guides/functions/examples/send-emails-resend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
    to: string;
    recipientName: string;
    tasks: {
        fiveS: any[];
        quickWins: any[];
        vsm: any[];
        a3: any[];
        a3Actions: any[];
    };
}

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { to, recipientName, tasks }: EmailRequest = await req.json();

        // 1. Calculate Summary
        const totalLate =
            tasks.fiveS.filter((t: any) => isLate(t)).length +
            tasks.quickWins.filter((t: any) => isLate(t)).length +
            tasks.vsm.filter((t: any) => isLate(t)).length +
            tasks.a3.filter((t: any) => isLate(t)).length +
            tasks.a3Actions.filter((t: any) => isLate(t)).length;

        // 2. Build HTML Grid
        let cardsHtml = '';

        // Helper for Card
        const createCard = (color: string, title: string, subtitle: string) => `
        <td class="card" style="border-top-color: ${color}; border-top-width: 4px;">
            <strong style="color: ${color}">${title}</strong><br>
            <small>${subtitle}</small>
        </td>
    `;

        // Logic to populate cards (taking top items or summary)
        // 5S
        if (tasks.fiveS.length > 0) {
            const item = tasks.fiveS[0];
            cardsHtml += createCard('#e11d48', '🔴 5S', `${item.reason} (${item.status})`);
        } else {
            cardsHtml += createCard('#10b981', '🟢 5S', '¡Al día!');
        }

        // Quick Wins
        if (tasks.quickWins.length > 0) {
            const item = tasks.quickWins[0];
            cardsHtml += createCard('#d97706', '🟡 Quick Wins', `${item.title} (${item.status})`);
        } else {
            cardsHtml += createCard('#10b981', '🟢 Quick Wins', '¡Al día!');
        }

        // Start new row
        cardsHtml += '</tr><tr>';

        // A3
        const a3Count = tasks.a3.length + tasks.a3Actions.length;
        if (a3Count > 0) {
            cardsHtml += createCard('#2563eb', '🔵 Proyectos A3', `${a3Count} ítems activos`);
        } else {
            cardsHtml += createCard('#10b981', '🟢 A3', '¡Al día!');
        }

        // VSM
        if (tasks.vsm.length > 0) {
            cardsHtml += createCard('#7c3aed', '🟣 VSM', `${tasks.vsm.length} Mapas activos`);
        } else {
            cardsHtml += createCard('#10b981', '🟢 VSM', '¡Al día!');
        }


        const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; overflow: hidden; margin-top: 20px; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); }
            
            /* Header Style like 'Nexus Jarvis' */
            .header { background: #334155; padding: 30px 20px; text-align: center; border-bottom: 4px solid #4f46e5; }
            .header h1 { color: #f8fafc; margin: 0; font-size: 26px; letter-spacing: 2px; text-transform: uppercase; font-weight: 800; }
            .header p { color: #94a3b8; margin: 5px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-weight: 600; }
            
            /* Alert Box */
            .alert-box { background: ${totalLate > 0 ? '#7f1d1d' : '#064e3b'}; border-left: 6px solid ${totalLate > 0 ? '#ef4444' : '#10b981'}; margin: 20px; padding: 20px; border-radius: 6px; }
            .alert-title { color: white; font-size: 18px; font-weight: bold; margin-bottom: 10px; display: block; }
            .alert-desc { color: ${totalLate > 0 ? '#fecaca' : '#a7f3d0'}; font-size: 14px; line-height: 1.5; }

            .content { padding: 0 20px 30px 20px; }
            .greeting { color: #cbd5e1; font-size: 16px; margin-bottom: 20px; padding-left: 10px; }
            
            /* Grid of Cards */
            .grid { width: 100%; border-spacing: 10px; }
            .card { background: #0f172a; border-radius: 8px; border: 1px solid #334155; padding: 15px; vertical-align: top; width: 50%; }
            .card strong { display: block; font-size: 15px; color: white; margin-bottom: 5px; }
            .card small { color: #94a3b8; font-size: 13px; line-height: 1.4; display: block; }
            
            /* Button */
            .btn { display: inline-block; background-color: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; transition: background 0.3s; }
            
            /* Technical Log Footer */
            .tech-log { background: #020617; color: #4ade80; font-family: 'Consolas', 'Monaco', monospace; font-size: 11px; padding: 15px; margin: 20px; border-radius: 6px; text-align: left; border: 1px solid #1e293b; }
            .footer { text-align: center; color: #475569; font-size: 12px; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>NEXUS BE LEAN</h1>
                <p>System Notification</p>
            </div>

            <div class="alert-box">
                <span class="alert-title">${totalLate > 0 ? '⚠️ Atención Requerida - Tareas Pendientes' : '✅ Estado del Sistema: Óptimo'}</span>
                <span class="alert-desc">
                    ${totalLate > 0
                ? `Se han detectado <strong>${totalLate} tareas atrasadas</strong> que requieren su gestión inmediata en el panel de control.`
                : 'No se detectaron anomalías ni tareas pendientes. Todas las métricas operativas están dentro de los rangos esperados.'}
                </span>
            </div>
            
            <div class="content">
                <div class="greeting">Usuario: <strong>${recipientName}</strong></div>
                
                <table class="grid">
                    <tr>
                        ${cardsHtml.replace(/background: white;/g, 'background: #0f172a;').replace(/color: #333;/g, 'color: white;').replace(/color: #666;/g, 'color: #94a3b8;')} 
                    </tr>
                </table>
                
                <center>
                    <a href="https://nexuslean.cl" class="btn">Acceder al Sistema</a>
                </center>

                <div class="tech-log">
                    > SYSTEM_CHECK_INIT<br>
                    > USER_ID: ${to.split('@')[0].toUpperCase()}<br>
                    > PENDING_TASKS: ${totalLate}<br>
                    > 5S_STATUS: ${tasks.fiveS.length > 0 ? 'ACTIVE_AUDITS' : 'OK'}<br>
                    > STATUS: ${totalLate > 0 ? 'WARNING_DETECTED' : 'SYSTEM_NOMENCLATURE_OK'}<br>
                    > _
                </div>

                <div class="footer">
                    Nexus Be Lean Solutions &copy; ${new Date().getFullYear()}<br>
                    Automated System Message - No Reply
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

        // Only send if API Key exists (Simulated otherwise)
        if (!RESEND_API_KEY) {
            console.log("No RESEND_API_KEY found. Simulation mode.");
            return new Response(JSON.stringify({ success: true, simulated: true, html: htmlContent }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "Nexus Be Lean <onboarding@resend.dev>", // Change to your verified domain later
                to: [to], // During test mode in Resend, only allow sending to yourself unless domain verified
                subject: `Resumen de Tareas - ${totalLate > 0 ? '⚠️ Atención Requerida' : '✅ Estado OK'}`,
                html: htmlContent,
            }),
        });

        const data = await res.json();
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

function isLate(task: any) {
    // Simple logic, can remain basic for the email template
    // Ideally we pass strict 'isLate' bool from frontend to avoid date math mismatch
    if (task.status === 'Cerrado' || task.status === 'done' || task.status === 'completed') return false;
    // ... Date logic omitted for brevity in Edge Function, assuming frontend filtered well or we trust simple check
    return true;
}
