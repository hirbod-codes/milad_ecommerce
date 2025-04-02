import { string } from "yup";
import { Auth } from "./Auth/Auth";
import JSZip from 'jszip';
import { Filters } from "../Components/SearchFilter/index.d";
import { Filter } from "../Components/SearchFilter/index.d";
import { Config } from "../Contexts/Configuration";

export function formatNumber(configuration: Config, number: number) {
    return new Intl.NumberFormat(configuration.local.language, { useGrouping: true, signDisplay: 'never', maximumFractionDigits: 0 }).format(number)
}

export function formatCurrency(configuration: Config, number: number) {
    return new Intl.NumberFormat(configuration.local.language, { useGrouping: true, currency: 'IRR', style: 'currency', signDisplay: 'never', maximumFractionDigits: 0 }).format(number)
}

export function formatFilters(filters: Filters) {
    let key = undefined
    let refObject: any = {}

    if (Object.keys(filters).includes('$and'))
        key = '$and'
    else
        key = '$or'

    refObject = { [key]: [] }

    console.log('filters', filters)

    for (const filter of filters[key])
        if (Object.keys(filter).includes('$and') || Object.keys(filter).includes('$or'))
            refObject[key].push(formatFilters(filter))
        else
            refObject[key].push(formatFilter(filter))

    console.log('refObject', refObject)
    return refObject
}

export function formatFilter(filter: Filter) {
    return { [filter.field]: { [filter.operator]: filter.value } }
}

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
    try {
        let authRes: Response = await fetch(`${getAuthApiUrl()}/auth/tokens/retrieve-access-token`, {
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
            Auth.setToken(data.token)
        } else {
            const accessToken = await authRes.text()
            console.log('\taccessToken', accessToken)
            Auth.setToken(accessToken)
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

const fetchZipFile = async () => {
    try {
        const response = await fetch('https://example.com/path-to-your-zipfile.zip');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error('Error fetching the ZIP file:', error);
    }
};


export const extractImagesFromZip = async (zipBlob: Blob): Promise<string[]> => {
    const zip = new JSZip();
    const zipContents = await zip.loadAsync(zipBlob);
    const imageFiles = Object.keys(zipContents.files).filter((filename) => /\.(jpe?g|png|gif)$/i.test(filename));

    const images = await Promise.all(
        imageFiles.map(async (filename) => {
            const fileData = await zipContents.files[filename].async('blob');
            return URL.createObjectURL(fileData);
        })
    );

    return images;
};
