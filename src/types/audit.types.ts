
export interface Audit5S {
    id: string;
    company_id: string;
    title: string | null;
    area: string;
    auditor: string;
    audit_date: string;
    total_score: number;
    created_at: string;
    audit_5s_entries?: Audit5SEntry[]; // Optional for when we fetch with join
}

export interface Audit5SEntry {
    id: string;
    audit_id: string;
    section: string;
    question: string;
    score: number;
    comment: string | null;
}

export const AUDIT_SECTIONS = {
    'S1': [
        '¿Se han eliminado los elementos innecesarios del área?',
        '¿Las herramientas y materiales están clasificados correctamente?',
        '¿Los pasillos y zonas de paso están libres de obstáculos?'
    ],
    'S2': [
        '¿Cada cosa tiene un lugar asignado y está en su lugar?',
        '¿Las ubicaciones están claramente etiquetadas?',
        '¿Es fácil encontrar y devolver las herramientas?'
    ],
    'S3': [
        '¿El área de trabajo está limpia y libre de polvo/aceite?',
        '¿Existen programas de limpieza visibles y se siguen?',
        '¿Los equipos de limpieza están disponibles y en buen estado?'
    ],
    'S4': [
        '¿Existen estándares visuales claros para el estado "normal"?',
        '¿Se utiliza código de colores para identificar anomalías?',
        '¿Todos conocen los procedimientos estándar?'
    ],
    'S5': [
        '¿Se realizan auditorías periódicas?',
        '¿Se respetan las normas establecidas consistentemente?',
        '¿Existe un plan de mejora continua activo?'
    ]
};
