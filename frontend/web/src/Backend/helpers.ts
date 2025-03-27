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
export async function authFetch(input: string | URL | globalThis.Request, init?: RequestInit, json: boolean = true): Promise<Response | undefined> {
    console.log('authFetch()')

    const accessToken = Auth.getToken()
    if (!accessToken)
        return undefined

    if (!init)
        init = {}

    if (!init.headers)
        init.headers = {}

    init.headers['Authorization'] = `Bearer ${accessToken}`

    if (json) {
        init.headers['Accept'] = 'application/json'
        init.headers['Content-Type'] = 'application/json'
    }

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
            init.headers['Authorization'] = `Bearer ${accessToken}`
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

    init.headers['Authorization'] = `Bearer ${accessToken}`
    return await fetch(input, init)
}

export async function authFetchData(input: string | URL | globalThis.Request, init?: RequestInit, json: boolean = true): Promise<{ response?: Response, data: any }> {
    console.log('authFetch()')

    const response = await authFetch(input, init, json)
    if (response?.headers?.get('content-type')?.includes('application/json'))
        return { response, data: response && response?.ok ? await response.json() : undefined }
    else
        return { response, data: response && response?.ok ? await response.text() : undefined }
}

export async function fetchData(input: string | URL | globalThis.Request, init?: RequestInit, json: boolean = true): Promise<{ response?: Response, data: any }> {
    console.log('fetchData()')

    if (!init)
        init = {}

    if (!init.headers)
        init.headers = {}

    if (json) {
        init.headers['Accept'] = 'application/json'
        init.headers['Content-Type'] = 'application/json'
    }

    let response = await fetch(input, init)
    if (response?.headers?.get('content-type')?.includes('application/json'))
        return { response, data: response && response?.ok ? await response.json() : undefined }
    else
        return { response, data: response && response?.ok ? await response.text() : undefined }
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
