import { string } from "yup";
import { Auth } from "./Auth";
import { lib, SHA256 } from "crypto-js";

export class GoogleAuthManager extends Auth {
    static async goToConcentPage() {
        const codeVerifier = this.generateRandomString(128);
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);

        console.log('codeVerifier', codeVerifier)
        console.log('codeChallenge', codeChallenge)

        const authApiUrl = import.meta.env.VITE_AUTH_API_URL;
        if (!string().required().isValidSync(authApiUrl))
            throw new Error('VITE_AUTH_API_URL environment variable is not provided')

        let redirectUri = import.meta.env.VITE_REDIRECT_URI
        if (!string().required().isValidSync(redirectUri))
            throw new Error('VITE_REDIRECT_URI environment variable is not provided')

        let clientId = undefined
        try {
            let r = await fetch(`${authApiUrl}/oauth/google/client-id`, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } })
            clientId = (await r.json())!.clientId!
        } catch (e) { }

        if (clientId === undefined)
            throw new Error('system failed to get client id')

        localStorage.setItem('code_verifier', codeVerifier);

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

        const authApiUrl = import.meta.env.VITE_AUTH_API_URL;
        if (!string().required().isValidSync(authApiUrl))
            throw new Error('VITE_AUTH_API_URL environment variable is not provided')

        let redirectUri = import.meta.env.VITE_REDIRECT_URI
        if (!string().required().isValidSync(redirectUri))
            throw new Error('VITE_REDIRECT_URI environment variable is not provided')

        const response = await fetch(`${authApiUrl}/oauth/google/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ code, codeVerifier, redirectUri: redirectUri }),
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

    private static generateRandomString(length: number) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    private static async generateCodeChallenge(codeVerifier: string) {
        if (window.crypto.subtle === undefined) {
            const encoder = new TextEncoder();
            const data = encoder.encode(codeVerifier)
            const hashBuffer32Bit = SHA256(lib.WordArray.create(data)).words
            const hashBuffer8Bit = this.convert32BitTo8BitArray(hashBuffer32Bit)
            return this.toBase64(hashBuffer8Bit)
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        return this.toBase64(new Uint8Array(hashBuffer))
    }

    private static toBase64(hashBuffer: number[] | Uint8Array) {
        return btoa(String.fromCharCode(...hashBuffer))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
    }

    // source: Deep seek AI
    private static convert32BitTo8BitArray(inputArray) {
        const outputArray = new Uint8Array(inputArray.length * 4); // Each 32-bit value becomes 4 bytes

        for (let i = 0; i < inputArray.length; i++) {
            const value = inputArray[i];

            // Extract each byte from the 32-bit value
            outputArray[i * 4] = (value >> 24) & 0xff; // Most significant byte
            outputArray[i * 4 + 1] = (value >> 16) & 0xff;
            outputArray[i * 4 + 2] = (value >> 8) & 0xff;
            outputArray[i * 4 + 3] = value & 0xff; // Least significant byte
        }

        return outputArray;
    }
}
