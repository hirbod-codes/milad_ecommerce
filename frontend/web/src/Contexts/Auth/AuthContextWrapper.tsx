import { useState, ReactNode, useEffect, memo } from 'react';
import { AuthContext } from './AuthContext';
import { Auth } from '@/src/Backend/Auth/Auth';
import { useNavigate } from 'react-router';

export const AuthContextWrapper = memo(function AuthContextWrapper({ children }: { children?: ReactNode; }) {
    const [privileges, setPrivileges] = useState(undefined)
    const [loading, setLoading] = useState(true)

    const navigate = useNavigate()

    console.log('AuthContextWrapper', { privileges, loading })

    const init = async () => {
        try {
            const ps = await Auth.getPrivileges()
            if (ps !== undefined)
                setPrivileges(ps)
            else
                navigate('/')
        } finally { setLoading(false) }
    }

    useEffect(() => {
        init()
    }, [])

    return (
        <AuthContext.Provider value={{ privileges, isAuthLoading: loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
})
