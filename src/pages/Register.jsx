import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const RegisterPage = () => {
    const { register, companies } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        // Auto-assign company based on email domain
        const lowerEmail = formData.email.toLowerCase().trim();
        const emailDomain = lowerEmail.split('@')[1];

        // Wait for companies to load
        if (!companies || companies.length === 0) {
            setError('Cargando empresas... Por favor intenta de nuevo en un momento.');
            return;
        }

        // Find company by domain (flexible matching - trim and lowercase both sides)
        let assignedCompany = companies.find(c => {
            const companyDomain = (c.domain || '').toLowerCase().trim();
            return companyDomain === emailDomain;
        });
        let companyId = assignedCompany ? assignedCompany.id : null;

        // Debug log for troubleshooting
        console.log('Registration attempt:', { emailDomain, companies: companies.map(c => c.domain), foundCompany: assignedCompany?.name });

        // Allow specific admin email to bypass domain check
        if (!assignedCompany && lowerEmail !== 'ariel.mellag@gmail.com') {
            setError(`El dominio "${emailDomain}" no pertenece a una empresa registrada. Contacta al administrador.`);
            return;
        }

        const result = await register({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            companyId: companyId
        });

        if (result.success) {
            setSuccess(result.message);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } else {
            setError(result.message);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: 'white'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '2.5rem',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#60a5fa', marginBottom: '0.5rem' }}>Registro de Usuario</h1>
                    <p style={{ color: '#94a3b8' }}>Únete a Nexus BE LEAN</p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        color: '#4ade80',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem'
                    }}>
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#e2e8f0' }}>Nombre Completo</label>
                        <input
                            type="text"
                            name="name"
                            className="input-field"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #334155',
                                background: '#1e293b',
                                color: 'white',
                                outline: 'none'
                            }}
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#e2e8f0' }}>Correo de Empresa</label>
                        <input
                            type="email"
                            name="email"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #334155',
                                background: '#1e293b',
                                color: 'white',
                                outline: 'none'
                            }}
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="nombre@empresa.cl"
                            required
                        />
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Solo correos corporativos autorizados.</p>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#e2e8f0' }}>Contraseña</label>
                        <input
                            type="password"
                            name="password"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #334155',
                                background: '#1e293b',
                                color: 'white',
                                outline: 'none'
                            }}
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#e2e8f0' }}>Confirmar Contraseña</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #334155',
                                background: '#1e293b',
                                color: 'white',
                                outline: 'none'
                            }}
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '0.875rem',
                            background: 'linear-gradient(to right, #3b82f6, #2563eb)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        Registrarse
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    <p>¿Ya tienes una cuenta? <Link to="/login" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: '500' }}>Inicia sesión</Link></p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
