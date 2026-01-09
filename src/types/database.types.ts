export type FiveSCard = {
    id: string;
    company_id: string;
    area: string;
    description: string;
    status: 'Abierto' | 'En Progreso' | 'Cerrado';
    image_url: string | null;
    image_urls: string[] | null;
    priority: 'Baja' | 'Media' | 'Alta' | null;
    category: 'Seiri' | 'Seiton' | 'Seiso' | 'Seiketsu' | 'Shitsuke' | 'Seguridad' | 'Otro' | null;
    due_date: string | null;
    findings: string | null;
    assigned_to: string | null;
    after_image_url: string | null;
    close_date: string | null;
    closure_comment: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
};

export type CreateFiveSCardDTO = Omit<FiveSCard, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'created_by'>;
export type Company = {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
};

export type Profile = {
    id: string;
    email: string | null;
    full_name: string | null;
    company_id: string | null;
    role: 'user' | 'superuser' | 'superadmin';
    created_at: string;
    updated_at: string;
};

export type CreateCompanyDTO = {
    name: string;
};

export type QuickWin = {
    id: string;
    company_id: string | null;
    title: string;
    description: string | null;
    proposed_solution: string | null;
    status: 'idea' | 'done';
    impact: 'Alto' | 'Medio' | 'Bajo';
    responsible: string | null;
    date: string;
    deadline: string | null;
    image_url: string | null;
    completion_image_url: string | null;
    completion_comment: string | null;
    completed_at: string | null;
    likes: number;
    created_at: string;
};

export type CreateQuickWinDTO = Omit<QuickWin, 'id' | 'created_at' | 'company_id'>;

// Types definition for 5S Cards module
export const TYPES_VERSION = '1.0.1';

