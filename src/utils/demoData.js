import { supabase } from '../supabaseClient';

export const generateTransportesDemoData = async (companies, addCompany) => {
    let companyId;
    const companyName = 'Transportes del Sur';

    // 1. Find or Create Company
    const existing = companies.find(c => c.name === companyName);
    if (existing) {
        companyId = existing.id;
    } else {
        // Create it directly via Supabase to get the ID immediately
        try {
            const domain = 'transportesdelsur.cl';
            const { data, error } = await supabase
                .from('companies')
                .insert([{ name: companyName, domain }])
                .select()
                .single();

            if (error) {
                console.error("Error creating demo company:", error);
                alert("Error creando empresa demo: " + error.message);
                return;
            }
            companyId = data.id;
            // Optionally trigger a refresh in the context via the addCompany prop if it supported reloading, 
            // but for now we have the ID which is what matters for data generation.
            // We call addCompany just to trigger the context update if possible, 
            // but since we inserted manually, context won't know unless we reload or it polls. 
            // A reload at the end will fix this.
        } catch (e) {
            console.error(e);
            alert("Error al intentar crear la empresa.");
            return;
        }
    }

    if (!companyId) {
        alert("No se pudo obtener el ID de la empresa.");
        return;
    }

    // 2. Generate Data for Modules
    // We will update localStorage directly.

    // 5S Data
    const demo5S = [
        {
            id: 101,
            date: '2025-05-10',
            location: 'Patio de Camiones',
            article: 'Zona de Carga',
            reporter: 'Jorge Munoz',
            reason: 'Pallets rotos acumulados en zona de maniobra.',
            proposedAction: 'Retirar y reciclar.',
            responsible: 'Jorge Munoz',
            targetDate: '2025-05-15',
            solutionDate: '',
            status: 'Pendiente',
            statusColor: '#ef4444',
            type: 'Despejar',
            imageBefore: null,
            imageAfter: null,
            companyId: companyId
        },
        {
            id: 102,
            date: '2025-05-12',
            location: 'Taller Mecánico',
            article: 'Banco de Herramientas',
            reporter: 'Luis Silva',
            reason: 'Herramientas mezcladas sin silueta.',
            proposedAction: 'Implementar panel de sombras.',
            responsible: 'Andres Torres',
            targetDate: '2025-05-20',
            solutionDate: '2025-05-18',
            status: 'Cerrado',
            statusColor: '#10b981',
            type: 'Ordenar',
            imageBefore: null,
            imageAfter: null,
            companyId: companyId
        }
    ];

    // Quick Wins
    const demoQuickWins = [
        {
            id: 201,
            title: 'Señalética de Velocidad',
            description: 'Instalar letreros de 10km/h en entrada.',
            status: 'done',
            impact: 'Medio',
            date: '2025-01-10',
            likes: 3,
            comments: 1,
            responsible: 'Maria Lagos',
            deadline: '2025-01-15',
            companyId: companyId,
            completionComment: 'Instalados 3 letreros.',
            completionImage: null
        },
        {
            id: 202,
            title: 'Iluminación LED en Fosas',
            description: 'Cambiar focos antiguos por LED para mejor visibilidad.',
            status: 'idea',
            impact: 'Alto',
            date: '2025-02-20',
            likes: 5,
            comments: 2,
            responsible: 'Pedro Ruiz',
            deadline: '2025-03-01',
            companyId: companyId,
            image: null
        }
    ];

    // VSM
    const demoVSM = [
        {
            id: 301,
            name: 'Mantenimiento Preventivo Flota',
            responsible: 'Carlos Ingeniero',
            date: '2025-03-01',
            status: 'current',
            leadTime: '8 horas',
            processTime: '2 horas',
            efficiency: '25%',
            image: null,
            miroLink: '',
            description: 'Flujo actual de mantenimiento de camiones tolva.',
            companyId: companyId
        }
    ];

    // A3
    const demoA3 = [
        {
            id: 401,
            title: 'Alta Rotación de Neumáticos',
            background: 'Gasto excesivo en neumáticos traccionales.',
            currentCondition: 'Vida útil promedio 40.000km vs estándar 60.000km.',
            goal: 'Aumentar vida útil a 55.000km.',
            rootCause: 'Presión de aire incorrecta y falta de alineación.',
            countermeasures: 'Checklist diario de presión y programa de alineación mensual.',
            plan: 'Semana 1: Capacitación. Semana 2: Compra de medidores.',
            followUp: 'En monitoreo.',
            responsible: 'Jefe de Taller',
            status: 'En Proceso',
            date: '2025-04-01',
            companyId: companyId
        }
    ];

    // Update LocalStorage Helper
    const updateStorage = (key, newData) => {
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        // Filter out existing demo items to avoid duplicates if run multiple times
        const demoIds = newData.map(d => d.id);
        const kept = existing.filter(i => !demoIds.includes(i.id));
        localStorage.setItem(key, JSON.stringify([...kept, ...newData]));
    };

    updateStorage('fiveSData', demo5S);
    updateStorage('quickWinsData', demoQuickWins);
    updateStorage('vsmData', demoVSM);
    updateStorage('a3ProjectsData', demoA3);

    alert(`Datos de demostración para "Transportes del Sur" (ID: ${companyId}) generados exitosamente.`);
    window.location.reload();
};
