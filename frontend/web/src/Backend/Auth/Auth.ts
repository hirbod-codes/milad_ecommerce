import { array } from "yup";
import { StorageApi } from "../Storage/StorageApi"
import { authFetch, getAuthApiUrl } from "../helpers";

export class Auth {
    static isAuthenticated() {
        return localStorage.getItem('accessToken') !== null
    }

    protected static async login(accessToken: string, refreshToken: string) {
        (await StorageApi.getInstance()).setTokens({ accessToken, refreshToken })
    }

    static async logout() {
        (await StorageApi.getInstance()).unsetTokens()
    }

    static async getAccessToken(): Promise<string | undefined> { return (await (await StorageApi.getInstance()).getTokens())?.accessToken }
    static async getRefreshToken(): Promise<string | undefined> { return (await (await StorageApi.getInstance()).getTokens())?.refreshToken }

    static async setTokens(refreshToken: string, accessToken: string): Promise<void> { await (await StorageApi.getInstance()).setTokens({ refreshToken, accessToken }) }

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
