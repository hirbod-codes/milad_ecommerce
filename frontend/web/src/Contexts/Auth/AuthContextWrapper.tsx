import { useState, ReactNode, useEffect, memo } from 'react';
import { AuthContext } from './AuthContext';
import { Auth } from '@/src/Backend/Auth/Auth';
import { getAuthApiUrl } from '@/src/Backend/helpers';
import { dispatch } from '@/src/Lib/Events';
import { LAYOUT_RERENDER } from '@/src/Pages/Layout';
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
            else {
                if (!Auth.isAuthenticated())
                    fetch(`${getAuthApiUrl()}/auth/tokens/retrieve-access-token`, {
                        method: 'post',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    })
                        .then(async r => {
                            if (r.ok && r.headers.get('content-type')?.includes('application/json')) {
                                const { token } = await r.json()
                                Auth.login(token)
                                dispatch(LAYOUT_RERENDER, token)
                            } else {
                                Auth.logout()
                                navigate('/')
                            }
                        })
            }
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
