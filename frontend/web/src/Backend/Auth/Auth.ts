import { array } from "yup";
import { authFetch, getAuthApiUrl } from "../helpers";

export class Auth {
    private static token: string | undefined

    static isAuthenticated() {
        return Auth.token !== undefined
    }

    static login(token: string) { Auth.token = token }

    static async logout() {
        Auth.token = undefined

        const r = await fetch(`${getAuthApiUrl()}/auth/tokens/logout`, {
            method: 'get',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            mode: 'cors',
            cache: 'no-cache'
        })

        if (!r.ok)
            return false

        return true
    }

    static getToken(): string | undefined { return Auth.token }

    static getRole(): string | undefined {
        const token = Auth.getToken()
        if (token === undefined)
            return undefined

        try { return JSON.parse(atob(token.split('.')[1]))?.role }
        catch (e) { console.error(e); return undefined }
    }

    static async getPrivileges(): Promise<string[] | undefined> {
        try {
            console.log('getPrivileges()')

            let r = await authFetch(`${getAuthApiUrl()}/privileges`, {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            })
            console.log('\tr', r)

            if (!r || !r.headers.get('content-type')?.includes('application/json'))
                return undefined

            const data = await r.json()
            console.log('\tdata', data)

            if (!array().required().strict(true).isValidSync(data))
                return undefined

            return data
        }
        catch (e) { console.error(e); return [] }
    }

    static async isPrivilegeExists(privilege: string): Promise<boolean> {
        try {
            return (await Auth.getPrivileges()).find(f => f === privilege) !== undefined
        }
        catch (e) { console.error(e); return false }
    }
}
