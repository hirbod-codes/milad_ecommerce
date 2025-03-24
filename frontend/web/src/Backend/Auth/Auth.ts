import { array } from "yup";
import { StorageApi } from "../Storage/StorageApi"
import { authFetch, getAuthApiUrl } from "../helpers";

export class Auth {
    private static token: string | undefined

    static isAuthenticated() {
        return localStorage.getItem('accessToken') !== null
    }

    static login(token: string) { this.token = token }

    static logout() { this.token = undefined }

    static getToken(): string | undefined { return this.token }

    static getRole(): string | undefined {
        const token = this.getToken()
        if (token === undefined)
            return undefined

        try { return JSON.parse(atob(token.split('.')[1]))?.role }
        catch (e) { console.error(e); return undefined }
    }

    static async getPrivileges(): Promise<string[]> {
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
                throw new Error('invalid respond from auth server from /privileges endpoint')

            const data = await r.json()
            console.log('\tdata', data)

            if (!array().required().strict(true).isValidSync(data))
                throw new Error('invalid respond from auth server from /privileges endpoint')

            return data
        }
        catch (e) { console.error(e); return [] }
    }

    static async isPrivilegeExists(privilege: string): Promise<boolean> {
        try {
            return (await this.getPrivileges()).find(f => f === privilege) !== undefined
        }
        catch (e) { console.error(e); return false }
    }
}
