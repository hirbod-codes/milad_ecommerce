import { useState, ReactNode, useEffect, memo } from 'react';
import { AuthContext } from './AuthContext';
import { Auth } from '@/src/Backend/Auth/Auth';
import { useNavigate } from 'react-router';
import { CircularLoadingScreen } from '@/src/Components/Base/CircularLoadingScreen';

export const AuthContextWrapper = memo(function AuthContextWrapper({ children }: { children?: ReactNode; }) {
    const navigate = useNavigate()

    const [privileges, setPrivileges] = useState(undefined)
    const [loading, setLoading] = useState(true)

    console.log('AuthContextWrapper', { privileges, loading })

    const init = async () => {
        try {
            if (!Auth.isAuthenticated() && (await Auth.login()) !== true) {
                navigate('/')
                return
            }

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
            {loading ? <CircularLoadingScreen /> : children}
        </AuthContext.Provider>
    );
})
