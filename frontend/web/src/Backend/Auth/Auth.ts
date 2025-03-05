export class Auth {
    private static _isAuthenticated: boolean = false

    static isAuthenticated() {
        return this._isAuthenticated
    }

    protected static login(accessToken: string, refreshToken: string) {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)

        this._isAuthenticated = true
    }

    protected static logout(accessToken: string, refreshToken: string) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')

        this._isAuthenticated = false
    }
}
