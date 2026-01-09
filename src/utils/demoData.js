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
    // Repositorio de Imágenes Profesionales (Unsplash)
    const imgWarehouse = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
    const imgTruck = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80';
    const imgWorkshop = 'https://images.unsplash.com/photo-1581092921461-eab62e97a782?auto=format&fit=crop&w=800&q=80';
    const imgOfficeDirty = 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=800&q=80';
    const imgOfficeClean = 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80';
    const imgSafety = 'https://images.unsplash.com/photo-1625246333195-098e987cf23a?auto=format&fit=crop&w=800&q=80';

    const fiveSCards = [
        {
            date: '2025-05-18',
            location: 'Patio de Maniobras',
            article: 'Zona de Carga A',
            reporter: 'Ariel Mella',
            reason: 'Acumulación de pallets rotos y plásticos en vía de tránsito. Riesgo de accidente.',
            proposed_action: 'Segregar residuos y despejar vía inmediatamente.',
            responsible: 'Equipo BeLean',
            target_date: '2025-05-20',
            status: 'Pendiente',
            type: 'Despejar',
            company_id: companyId,
            image_before: imgWarehouse,
            card_number: 101,
            status_color: 'bg-red-100 text-red-800'
        },
        {
            date: '2025-05-15',
            location: 'Taller de Mantenimiento',
            article: 'Banco de Trabajo #2',
            reporter: 'Equipo BeLean',
            reason: 'Herramientas mezcladas y sucias con grasa.',
            proposed_action: 'Implementar panel de sombras y limpieza estándar.',
            responsible: 'Ariel Mella',
            target_date: '2025-05-25',
            solution_date: '2025-05-22',
            status: 'Cerrado',
            type: 'Ordenar',
            company_id: companyId,
            image_before: imgWorkshop,
            image_after: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80', // Clean workshop
            card_number: 102,
            status_color: 'bg-green-100 text-green-800'
        },
        {
            date: '2025-05-14',
            location: 'Oficinas Administrativas',
            article: 'Recepción Central',
            reporter: 'Ariel Mella',
            reason: 'Exceso de documentación antigua sobre escritorios.',
            proposed_action: 'Digitalizar y archivar en bodega.',
            responsible: 'Equipo BeLean',
            target_date: '2025-05-16',
            status: 'En Proceso',
            type: 'Estandarizar',
            company_id: companyId,
            image_before: imgOfficeDirty,
            card_number: 103,
            status_color: 'bg-orange-100 text-orange-800'
        },
        {
            date: '2025-05-10',
            location: 'Bodega de Repuestos',
            article: 'Estantería Neumáticos',
            reporter: 'Equipo BeLean',
            reason: 'Neumáticos nuevos mezclados con dados de baja.',
            proposed_action: 'Etiquetar zonas de "Nuevos" y "Scrap".',
            responsible: 'Ariel Mella',
            target_date: '2025-05-12',
            solution_date: '2025-05-11',
            status: 'Cerrado',
            type: 'Clasificar',
            company_id: companyId,
            image_before: imgWarehouse,
            card_number: 104,
            status_color: 'bg-green-100 text-green-800'
        },
        {
            date: '2025-05-05',
            location: 'Estacionamiento Flota',
            article: 'Camión TC-45',
            reporter: 'Ariel Mella',
            reason: 'Derrame de aceite no contenido.',
            proposed_action: 'Limpieza con aserrín y reparación de fuga.',
            responsible: 'Equipo BeLean',
            solution_date: '2025-05-05',
            target_date: '2025-05-05',
            status: 'Cerrado',
            type: 'Limpieza',
            company_id: companyId,
            image_before: imgTruck,
            image_after: imgTruck, // Assume cleaned
            card_number: 105,
            status_color: 'bg-green-100 text-green-800'
        },
        {
            date: '2025-05-20',
            location: 'Zona de Carga',
            article: 'Extintores',
            reporter: 'Equipo BeLean',
            reason: 'Extintor bloqueado por cajas.',
            proposed_action: 'Demarcar zona amarilla en el piso.',
            responsible: 'Ariel Mella',
            target_date: '2025-05-21',
            status: 'Pendiente',
            type: 'Seguridad',
            company_id: companyId,
            image_before: imgSafety,
            card_number: 106,
            status_color: 'bg-red-100 text-red-800'
        }
    ];

    // --- Quick Wins ---
    const quickWins = [
        {
            title: 'Instalación Espejos Panorámicos',
            description: 'Mejorar visibilidad en salida de camiones para evitar colisiones.',
            status: 'done',
            impact: 'Alto',
            date: '2025-04-10',
            likes: 12,
            responsible: 'Ariel Mella',
            deadline: '2025-04-15',
            completion_comment: 'Instalados 2 espejos cconvexos de 80cm.',
            completion_image_url: imgSafety,
            image_url: null,
            company_id: companyId
        },
        {
            title: 'Digitalización Check-list Pre-uso',
            description: 'Migrar de papel a tablet el control diario de flota.',
            status: 'in_progress',
            impact: 'Alto',
            date: '2025-05-01',
            likes: 8,
            responsible: 'Equipo BeLean',
            deadline: '2025-06-01',
            image_url: null,
            company_id: companyId
        },
        {
            title: 'Rotulación de Basureros',
            description: 'Implementar código de colores para reciclaje.',
            status: 'done',
            impact: 'Medio',
            date: '2025-03-20',
            likes: 5,
            responsible: 'Ariel Mella',
            deadline: '2025-03-25',
            completion_comment: 'Basureros azules, amarillos y negros instalados.',
            image_url: null,
            company_id: companyId
        },
        {
            title: 'Meora Iluminación Taller',
            description: 'Cambio a LED en fosas de mantención.',
            status: 'idea',
            impact: 'Alto',
            date: '2025-05-19',
            likes: 3,
            responsible: 'Equipo BeLean',
            deadline: '2025-06-15',
            image_url: null,
            company_id: companyId
        }
    ];

    // --- VSM ---
    const vsmProjects = [
        {
            name: 'VSM Actual - Mantenimiento Correctivo',
            responsible: 'Ariel Mella',
            date: '2025-04-15',
            status: 'current',
            lead_time: '4.5 Días',
            process_time: '6 Horas',
            efficiency_loop: '5.5%',
            description: 'Análisis del flujo actual desde reporte de falla hasta entrega de equipo. Se detectan cuellos de botella en aprobación de repuestos.',
            image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80', // Technical schematic look
            miro_link: 'https://miro.com/app/board/uXjVO123456=/',
            company_id: companyId
        },
        {
            name: 'VSM Futuro - Flujo Continuo',
            responsible: 'Equipo BeLean',
            date: '2025-06-01',
            status: 'future',
            lead_time: '1 Día',
            process_time: '5 Horas',
            efficiency_loop: '20%',
            description: 'Estado futuro deseado con aprobación automática de repuestos críticos y pre-picking.',
            image_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80', // Blueprint look
            company_id: companyId
        }
    ];

    // --- A3 Projects ---
    const a3Projects = [
        {
            title: 'Optimización de Consumo de Combustible',
            background: 'El gasto en combustible representa el 40% de los costos operativos. Se ha detectado un aumento del 15% en el último Q.',
            current_condition: 'Rendimiento promedio: 2.8 km/lt. Ralentí excesivo: 12%.',
            goal: 'Aumentar rendimiento a 3.2 km/lt y reducir ralentí a 5%.',
            root_cause: '1. Falta de capacitación en conducción eficiente. 2. Uso de aire acondicionado en detenciones prolongadas.',
            countermeasures: '1. Programa de capacitación "Conducción Eeficiente". 2. Bonos por rendimiento. 3. Instalación de climatizadores autónomos.',
            execution_plan: '- Mayo: Curso teórico\n- Junio: Pruebas en ruta\n- Julio: Implementación de bonos',
            action_plan: [
                { id: 1, step: 'Capacitación Choferes', who: 'Ariel Mella', when: '2025-05-30', status: 'Done' },
                { id: 2, step: 'Configurar Telemetría', who: 'Equipo BeLean', when: '2025-06-15', status: 'In Progress' }
            ],
            follow_up: 'Primer grupo capacitado ha mejorado un 5% el rendimiento.',
            responsible: 'Ariel Mella',
            status: 'En Proceso',
            company_id: companyId
        },
        {
            title: 'Reducción de Tiempos de Carga',
            background: 'Los camiones esperan promedio 45 minutos antes de ingresar a rampa.',
            current_condition: 'Tiempo ciclo total: 120 min. Valor Agregado: 35 min.',
            goal: 'Reducir tiempo ciclo a 60 min.',
            root_cause: 'Descoordinación entre llegada de camión y disponibilidad de andén.',
            countermeasures: 'Implementar sistema de agendamiento de horas (Booking).',
            execution_plan: 'Desarrollo de app de citas y marcha blanca en Centro A.',
            responsible: 'Equipo BeLean',
            status: 'Nuevo',
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

        alert(`¡Demo Corporativa "Transportes del Sur" Generada!\n\nDatos creados por: Ariel Mella & Equipo BeLean.\nMódulos cargados: 5S, Quick Wins, VSM, A3.`);
        window.location.reload();

    } catch (error) {
        console.error("Critical error generating demo data:", error);
        alert("Error generando datos: " + error.message);
    }
};
