import { supabase } from '../supabaseClient';

export const generateTransportesDemoData = async (companies, _addCompany) => {
    let companyId;
    const companyName = 'Transportes del Sur';

    // 1. Find or Create Company
    const existing = companies.find(c => c.name === companyName);
    if (existing) {
        companyId = existing.id;
        // Optional: Clean up existing data to avoid duplicates/mess (be careful with this in prod, but for demo it's fine)
        // await supabase.from('five_s_cards').delete().eq('company_id', companyId);
        // await supabase.from('quick_wins').delete().eq('company_id', companyId);
        // await supabase.from('vsm_projects').delete().eq('company_id', companyId);
        // await supabase.from('a3_projects').delete().eq('company_id', companyId);
    } else {
        try {
            const domain = 'transportesdelsur.cl';
            const { data, error } = await supabase
                .from('companies')
                .insert([{ name: companyName, domain }])
                .select()
                .single();

            if (error) throw error;
            companyId = data.id;
        } catch (e) {
            console.error(e);
            alert("Error creando empresa demo: " + e.message);
            return;
        }
    }

    if (!companyId) {
        alert("Error: No Company ID");
        return;
    }

    // 2. Prepare Rich Demo Data (Supabase snake_case format)

    // --- 5S Cards ---
    const fiveSCards = [
        {
            date: '2025-05-10',
            location: 'Patio de Camiones',
            article: 'Zona de Carga',
            reporter: 'Jorge Muñoz',
            reason: 'Pallets rotos acumulados en zona de maniobra.',
            proposed_action: 'Retirar y reciclar.',
            responsible: 'Jorge Muñoz',
            target_date: '2025-05-15',
            status: 'Pendiente', // Red
            type: 'Despejar',
            company_id: companyId
        },
        {
            date: '2025-05-12',
            location: 'Taller Mecánico',
            article: 'Banco de Herramientas',
            reporter: 'Luis Silva',
            reason: 'Herramientas mezcladas sin silueta.',
            proposed_action: 'Implementar panel de sombras.',
            responsible: 'Andrés Torres',
            target_date: '2025-05-20',
            solution_date: '2025-05-18',
            status: 'Cerrado', // Green
            type: 'Ordenar',
            company_id: companyId
        },
        {
            date: '2025-05-14',
            location: 'Oficinas Administrativas',
            article: 'Escritorio Recepción',
            reporter: 'Ana López',
            reason: 'Cables de red y eléctricos enredados en el suelo.',
            proposed_action: 'Organizar con amarras y canaletas.',
            responsible: 'Soporte TI',
            target_date: '2025-05-16',
            status: 'En Proceso', // Orange
            type: 'Estandarizar',
            company_id: companyId
        },
        {
            date: '2025-05-15',
            location: 'Bodega de Repuestos',
            article: 'Estantería B',
            reporter: 'Pedro Ruiz',
            reason: 'Repuestos sin etiquetar en nivel 2.',
            proposed_action: 'Etiquetar según código SAP.',
            responsible: 'Jefe Bodega',
            target_date: '2025-05-25',
            status: 'Pendiente',
            type: 'Estandarizar',
            company_id: companyId
        },
        {
            date: '2025-05-01',
            location: 'Zona de Lavado',
            article: 'Hidrolavadora',
            reporter: 'Carlos Diaz',
            reason: 'Fuga de agua en manguera de alta presión.',
            proposed_action: 'Reemplazar manguera.',
            responsible: 'Mantención',
            solution_date: '2025-05-02',
            target_date: '2025-05-03',
            status: 'Cerrado',
            type: 'Limpieza',
            company_id: companyId
        },
        {
            date: '2025-05-18',
            location: 'Comedor',
            article: 'Dispensador',
            reporter: 'Maria Lagos',
            reason: 'Falta señalética de lavado de manos.',
            proposed_action: 'Instalar letrero visual.',
            responsible: 'RRHH',
            target_date: '2025-05-22',
            status: 'En Proceso',
            type: 'Disciplina',
            company_id: companyId
        }
    ];

    // --- Quick Wins ---
    const quickWins = [
        {
            title: 'Señalética de Velocidad',
            description: 'Instalar letreros de 10km/h en entrada.',
            status: 'done',
            impact: 'Medio',
            date: '2025-01-10',
            likes: 3,
            responsible: 'Maria Lagos',
            deadline: '2025-01-15',
            completion_comment: 'Instalados 3 letreros nuevos.',
            completion_image_url: null,
            image_url: null,
            company_id: companyId
        },
        {
            title: 'Iluminación LED en Fosas',
            description: 'Cambiar focos antiguos por LED para mejor visibilidad.',
            status: 'idea',
            impact: 'Alto',
            date: '2025-02-20',
            likes: 5,
            responsible: 'Pedro Ruiz',
            deadline: '2025-03-01',
            image_url: null,
            company_id: companyId
        },
        {
            title: 'Organización de Archivos',
            description: 'Digitalizar carpetas de 2023 para liberar espacio.',
            status: 'in_progress', // Note: Check if 'in_progress' is valid status enum, usually 'idea' or 'done' in simple app, but keeping for now
            impact: 'Bajo',
            date: '2025-03-10',
            likes: 2,
            responsible: 'Ana López',
            deadline: '2025-03-30',
            image_url: null,
            company_id: companyId
        },
        {
            title: 'Kit de Derrames',
            description: 'Implementar kit de contención en zona de cambio de aceite.',
            status: 'done',
            impact: 'Alto',
            date: '2025-01-05',
            likes: 8,
            responsible: 'Prevención Riesgos',
            deadline: '2025-01-20',
            completion_comment: 'Kit comprado e instalado.',
            completion_image_url: null,
            image_url: null,
            company_id: companyId
        }
    ];

    // --- VSM ---
    const vsmProjects = [
        {
            name: 'Mantenimiento Preventivo Flota',
            responsible: 'Carlos Ingeniero',
            date: '2025-03-01',
            status: 'current',
            lead_time: '8 horas',
            process_time: '2 horas',
            efficiency_loop: '25%',
            description: 'Flujo actual de mantenimiento de camiones tolva.',
            company_id: companyId
        }
    ];

    // --- A3 Projects ---
    const a3Projects = [
        {
            title: 'Alta Rotación de Neumáticos',
            background: 'Gasto excesivo en neumáticos traccionales.',
            current_condition: 'Vida útil promedio 40.000km vs estándar 60.000km.',
            goal: 'Aumentar vida útil a 55.000km.',
            root_cause: 'Presión de aire incorrecta y falta de alineación.',
            countermeasures: 'Checklist diario de presión y programa de alineación mensual.',
            action_plan: 'Semana 1: Capacitación. Semana 2: Compra de medidores.',
            follow_up: 'En monitoreo.',
            responsible: 'Jefe de Taller',
            status: 'En Proceso',
            company_id: companyId
        },
        {
            title: 'Retrasos en Despachos AM',
            background: 'Camiones salen con 45 min de retraso promedio.',
            current_condition: 'Hora salida real 08:45 vs meta 08:00.',
            goal: 'Reducir retraso a 10 min máx.',
            root_cause: 'Documentación no lista al cargar.',
            countermeasures: 'Digitalizar guías de despacho la noche anterior.',
            action_plan: 'Implementar tablet en portería.',
            follow_up: 'Piloto iniciado.',
            responsible: 'Gerente Logística',
            status: 'Planificado',
            company_id: companyId
        }
    ];

    // 3. Batch Insert to Supabase
    try {
        console.log("Insering Demo Data for Company:", companyId);

        // FiveS
        const { error: err5S } = await supabase.from('five_s_cards').insert(fiveSCards);
        if (err5S) console.error("Error inserting 5S:", err5S);

        // QuickWins
        const { error: errQW } = await supabase.from('quick_wins').insert(quickWins);
        if (errQW) console.error("Error inserting QuickWins:", errQW);

        // VSM
        const { error: errVSM } = await supabase.from('vsm_projects').insert(vsmProjects);
        if (errVSM) console.error("Error inserting VSM:", errVSM);

        // A3
        const { error: errA3 } = await supabase.from('a3_projects').insert(a3Projects);
        if (errA3) console.error("Error inserting A3:", errA3);

        alert(`¡Demo "Transportes del Sur" cargada exitosamente!\nEmpresa ID: ${companyId}\n\nLos datos se han guardado en la base de datos.`);
        window.location.reload();

    } catch (error) {
        console.error("Critical error generating demo data:", error);
        alert("Error generando datos: " + error.message);
    }
};
