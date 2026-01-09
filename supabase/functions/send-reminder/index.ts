// Setup instructions:
// 1. Install Supabase CLI: npm install -g supabase
// 2. Login: supabase login
// 3. Link project: supabase link --project-ref csjqoyxlneyfvmcrwfro
// 4. Set secrets: supabase secrets set RESEND_API_KEY=re_YOUR_API_KEY
// 5. Deploy: supabase functions deploy send-reminder

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderPayload {
  name: string;
  email: string;
  pendingTasks: number;
  details: {
    fiveS: number;
    quickWins: number;
    a3?: number;
    vsm?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, email, pendingTasks, details }: ReminderPayload = await req.json()

    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY. Set it with: supabase secrets set RESEND_API_KEY=re_...");
    }

    if (!email) {
      throw new Error("Email is required");
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Nexus Be Lean <onboarding@resend.dev>', // Update with your verified domain
        to: [email],
        subject: `📋 Recordatorio: ${pendingTasks} tareas pendientes en Nexus`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9;">
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Nexus Be Lean</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Sistema de Mejora Continua</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <h2 style="color: #1e293b; margin: 0 0 15px 0;">Hola ${name} 👋</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Este es un recordatorio amigable sobre tus tareas pendientes en la plataforma.
            </p>
            
            <!-- Total Counter -->
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
                <p style="font-size: 14px; color: #64748b; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Total de Tareas Pendientes</p>
                <h1 style="color: #3b82f6; font-size: 56px; margin: 0; font-weight: 700;">${pendingTasks}</h1>
            </div>

            <!-- Module Grid -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                    <td width="50%" style="padding: 5px;">
                        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 15px; text-align: center;">
                            <p style="font-size: 11px; color: #3b82f6; text-transform: uppercase; font-weight: 700; margin: 0 0 5px 0; letter-spacing: 0.5px;">Tarjetas 5S</p>
                            <p style="font-size: 28px; font-weight: 700; color: #1d4ed8; margin: 0;">${details.fiveS || 0}</p>
                        </div>
                    </td>
                    <td width="50%" style="padding: 5px;">
                        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 15px; text-align: center;">
                            <p style="font-size: 11px; color: #059669; text-transform: uppercase; font-weight: 700; margin: 0 0 5px 0; letter-spacing: 0.5px;">Quick Wins</p>
                            <p style="font-size: 28px; font-weight: 700; color: #047857; margin: 0;">${details.quickWins || 0}</p>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td width="50%" style="padding: 5px;">
                        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 15px; text-align: center;">
                            <p style="font-size: 11px; color: #d97706; text-transform: uppercase; font-weight: 700; margin: 0 0 5px 0; letter-spacing: 0.5px;">Proyectos A3</p>
                            <p style="font-size: 28px; font-weight: 700; color: #b45309; margin: 0;">${details.a3 || 0}</p>
                        </div>
                    </td>
                    <td width="50%" style="padding: 5px;">
                        <div style="background: #f5f3ff; border: 1px solid #c4b5fd; border-radius: 10px; padding: 15px; text-align: center;">
                            <p style="font-size: 11px; color: #7c3aed; text-transform: uppercase; font-weight: 700; margin: 0 0 5px 0; letter-spacing: 0.5px;">VSM</p>
                            <p style="font-size: 28px; font-weight: 700; color: #6d28d9; margin: 0;">${details.vsm || 0}</p>
                        </div>
                    </td>
                </tr>
            </table>

            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin: 30px 0 0 0; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                Este es un mensaje automático de Nexus Be Lean.<br>
                Por favor no respondas a este correo.
            </p>
        </div>
    </div>
</body>
</html>
                `,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Error sending email');
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in send-reminder:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
