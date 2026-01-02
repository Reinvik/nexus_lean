import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const RecoveryRedirect = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Direct access to window.location.hash is sometimes more reliable for fragments
        // than useLocation().hash depending on router version/updates
        const hash = window.location.hash || location.hash;

        if (hash && hash.includes('type=recovery')) {
            console.log("RecoveryRedirect: Recovery hash detected, navigating to /reset-password");
            // use replace: true to avoid back-button loops
            navigate('/reset-password' + hash, { replace: true });
        }
    }, [location]);

    return null;
};

export default RecoveryRedirect;
