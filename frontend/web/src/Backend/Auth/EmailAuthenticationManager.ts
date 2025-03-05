import { Response } from "..";
import { AuthManager } from "./AuthManager";

export class EmailAuthenticationManager extends AuthManager {
    static async sendCodeToEmail(email: string): Promise<Response<string>> {
        return { success: false }
    }

    static async login(email: string, password: string, code: number): Promise<Response<string>> {
        return { success: false }
    }

    static async register(email: string, password: string, code: number): Promise<Response<string>> {
        return { success: false }
    }

    static async googleOAuth2() {
        const codeVerifier = this.getRandomString(40)
        const codeChallenge = this.base64URLencode(await this.hash(codeVerifier));
        console.log(codeVerifier, codeChallenge, encodeURIComponent('http://0.0.0.0:80'))
        // redirect_uri=${window.location.origin}/auth/google/callback&
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?
        response_type=code&
        client_id=380103624736-onrv4mne42t89atn4gpougk9ocqln5pl.apps.googleusercontent.com&
        redirect_uri=${encodeURIComponent('http://127.0.0.1:80/auth/google/callback')}&
        scope=openid profile email&
        code_challenge=${codeChallenge}&
        code_challenge_method=S256`;
        let response = await fetch(authUrl, { mode: 'cors', redirect: 'follow', method: 'get' })
        console.log(response, await response.text())
        // await fetch(`http://api:3000/auth/google/?redirectUrl=${encodeURIComponent(window.location.origin)}/auth/google/callback`, { method: 'get', redirect: 'follow', headers: [['Accept', 'application/json']] })
    }

    private static base64URLencode(str) {
        const base64Encoded = btoa(str);
        return base64Encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    private static async hash(message: string): Promise<string> {
        const data = new TextEncoder().encode(message);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0")) // convert bytes to hex string
            .join("")
    }

    private static getRandomString(length = 40, characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
        const bytes = new Uint8Array(length);
        window.crypto.getRandomValues(bytes);

        let str = ''
        for (const b of bytes)
            str += characters[Math.floor(characters.length * b / 255)]

        return str
    }
}
