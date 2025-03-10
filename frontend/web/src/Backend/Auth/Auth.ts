export class Auth {
    static isAuthenticated() {
        return localStorage.getItem('accessToken') !== null
    }

    protected static login(accessToken: string, refreshToken: string) {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
    }

    static logout() {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
    }
}
