import { StorageApi } from "../Storage/StorageApi"

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
}
