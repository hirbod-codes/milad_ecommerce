import { string } from "yup";
import { Auth } from "./Auth/Auth";

export function getAuthApiUrl(): string {
    const authApiUrl = import.meta.env.VITE_AUTH_API_URL;

    if (!string().required().isValidSync(authApiUrl))
        throw new Error('VITE_AUTH_API_URL environment variable is not provided')

    console.log('\tauthApiUrl', authApiUrl)

    return authApiUrl
}

export function getApiUrl(): string {
    const apiUrl = import.meta.env.VITE_API_URL;

    if (!string().required().isValidSync(apiUrl))
        throw new Error('VITE_API_URL environment variable is not provided')

    console.log('\tapiUrl', apiUrl)

    return apiUrl
}

class AuthState {
    static Authenticating: boolean
    static AuthFailed: boolean
    static AuthSucceeded: boolean
}

/**
 * if undefined is returned, authentication must have been failed
 * @param input
 * @param init
 * @returns
 */
export async function authFetch(input: string | URL | globalThis.Request, init?: RequestInit): Promise<Response | undefined> {
    console.log('authFetch()')

    const accessToken = await Auth.getToken()
    if (!accessToken)
        return undefined
    console.log('\ttokens', accessToken)

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

    if (AuthState.Authenticating) {
        await tryAndWait(() => {
            if (AuthState.Authenticating === false)
                return
            else
                throw new Error('still waiting')
        }, 1000)

        if (AuthState.AuthFailed === true) {
            return undefined
        }

        if (AuthState.AuthSucceeded === true) {
            const accessToken = await Auth.getToken()
            setAuthHeader(init ?? {}, accessToken)
            return await fetch(input, init)
        }
    }

    AuthState.Authenticating = true
    AuthState.AuthFailed = false
    AuthState.AuthSucceeded = false
    let authRes: Response
    try {
        authRes = await fetch(`${getAuthApiUrl()}/auth/tokens/retrieve-access-token`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
        console.log('\tauthRes', authRes)

        if (authRes.status === 401) {
            AuthState.AuthFailed = true
            await Auth.logout()
            return undefined
        }

        if (!authRes.ok)
            return res

        if (authRes.headers.get('content-type')?.includes('application/json')) {
            const data = await authRes.json()
            console.log('\taccessToken', data)
            Auth.login(data.token)
        } else {
            const accessToken = await authRes.text()
            console.log('\taccessToken', accessToken)
            Auth.login(accessToken)
        }

        AuthState.AuthSucceeded = true
    } finally { AuthState.Authenticating = false }

    setAuthHeader(init ?? {}, accessToken)
    return await fetch(input, init)
}


/**
 * if undefined is returned, authentication must have been failed.
 * if null is returned, request has not been successful.
 * @param input
 * @param init
 * @returns
 */
export async function authFetchData(input: string | URL | globalThis.Request, init?: RequestInit): Promise<any | null | undefined> {
    const res = await authFetch(input, init)
    if (res === undefined)
        return undefined

    if (!res.ok)
        return null

    if (res.headers.get('content-type')?.includes('application/json'))
        return await res.json()
    else
        return await res.text()
}

export async function tryAndWait(callback: CallableFunction, secondsToWaitForEachTry: number = 5): Promise<boolean> {
    let safety = 0
    while (safety <= 100) {
        safety++
        try {
            await callback()
            return true
        }
        catch (e) { console.error(e) }
        finally {
            await (() => new Promise<void>((res, rej) => {
                console.log('waiting for 5 seconds...')
                setTimeout(() => { res() }, secondsToWaitForEachTry * 1000)
            }))()
        }
    }

    if (safety > 100) {
        console.log('safety reached!!')
        return false
    }

    return true
}
