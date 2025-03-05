import { Auth } from "./Auth";

export class GoogleAuthManager extends Auth {
    static async goToConcentPage() {
        const codeVerifier = this.generateRandomString(128);
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);

        localStorage.setItem('code_verifier', codeVerifier);

        const clientId = '380103624736-onrv4mne42t89atn4gpougk9ocqln5pl.apps.googleusercontent.com'
        const redirectUri = 'http://127.0.0.1:80/'

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid profile email&code_challenge=${codeChallenge}&code_challenge_method=S256`;

        console.log(codeVerifier, codeChallenge, clientId, redirectUri)

        window.location.href = authUrl;
    }

    static async authenticate(code: string) {
        const codeVerifier = localStorage.getItem('code_verifier');
        if (!codeVerifier) {
            console.error('no codeVerifier')
            return false
        }

        const response = await fetch('http://api:3000/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, codeVerifier }),
        });

        const { accessToken, refreshToken } = await response.json();
        console.log('accessToken', accessToken)
        console.log('refreshToken', refreshToken)

        if (!accessToken) {
            console.error('no accessToken')
            return false
        }

        if (!refreshToken) {
            console.error('no refreshToken')
            return false
        }

        this.login(accessToken, refreshToken)

        return true
    }

    private static generateRandomString(length) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    private static async generateCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
}
