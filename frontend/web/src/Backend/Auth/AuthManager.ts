export class AuthManager {
    static accessToken: string
    static refreshToken: string

    static storeTokens(accessToken: string, refreshToken: string) {
        this.accessToken = accessToken
        this.refreshToken = refreshToken
    }
}
