import { string } from "yup";
import { Auth } from "./Auth/Auth";

/**
 * if undefined is returned, authentication must have been failed
 * @param input
 * @param init
 * @returns
 */
export async function authFetch(input: string | URL | globalThis.Request, init?: RequestInit): Promise<Response | undefined> {
    console.log('authFetch()')

    const accessToken = await Auth.getAccessToken()
    const refreshToken = await Auth.getRefreshToken()
    if (!refreshToken || !accessToken)
        return undefined
    console.log('\ttoken', accessToken, refreshToken)

    const setAuthHeader = (init: RequestInit, token: string) => {
        if (init.headers)
            init.headers['Authorization'] = `Bearer ${token}`
        else
            init.headers = { Authorization: `Bearer ${token}` }
    }

    setAuthHeader(init ?? {}, accessToken)
    let res = await fetch(input, init)

    if (res.status !== 401)
        return res

    let authRes = await fetch(`${getAuthApiUrl()}/auth/tokens/retrieve-access-token`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
    })
    console.log('\tauthRes', authRes)

    if (!authRes.ok) {
        if (authRes.status === 401)
            await Auth.logout()
        return undefined
    }

    if (authRes.headers.get('content-type')?.includes('application/json')) {
        const data = await authRes.json()
        console.log('\taccessToken', data)
        await Auth.setTokens(refreshToken, data.token)
    } else {
        const accessToken = await authRes.text()
        console.log('\taccessToken', accessToken)
        await Auth.setTokens(refreshToken, accessToken)
    }

    setAuthHeader(init ?? {}, accessToken)
    return await fetch(input, init)
}

export function getAuthApiUrl(): string {
    const authApiUrl = import.meta.env.VITE_AUTH_API_URL;

    if (!string().required().isValidSync(authApiUrl))
        throw new Error('VITE_AUTH_API_URL environment variable is not provided')

    console.log('\tauthApiUrl', authApiUrl)

    return authApiUrl
}
