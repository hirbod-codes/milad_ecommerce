import { string } from "yup";
import { Response } from "..";
import { Auth } from "./Auth";

export class EmailAuthenticationManager extends Auth {
    static async sendCodeToEmail(email: string): Promise<Response<void>> {
        let data = { email }

        const authApiUrl = import.meta.env.VITE_AUTH_API_URL;
        if (!string().required().isValidSync(authApiUrl))
            throw new Error('VITE_AUTH_API_URL environment variable is not provided')

        try {
            let r = await fetch(`${authApiUrl}/auth/email/send-code`, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })

            if (r.ok && r.status === 200)
                return { success: true }
            else
                return { success: false }
        } catch (e) {
            return { success: false }
        }
    }

    static async authenticate(email: string, password: string): Promise<Response<void>> {
        let data = { email, password }

        const authApiUrl = import.meta.env.VITE_AUTH_API_URL;
        if (!string().required().isValidSync(authApiUrl))
            throw new Error('VITE_AUTH_API_URL environment variable is not provided')

        try {
            let r = await fetch(`${authApiUrl}/auth/email/login`, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })

            if (r.ok && r.status === 201) {
                let tokens = await r.json()
                await this.login(tokens.accessToken!, tokens.refreshToken!)
                return { success: true }
            }
            else
                return { success: false }
        } catch (e) {
            return { success: false }
        }
    }

    static async register(email: string, password: string, code: number): Promise<Response<void>> {
        let data = { email, password, code }

        const authApiUrl = import.meta.env.VITE_AUTH_API_URL;
        if (!string().required().isValidSync(authApiUrl))
            throw new Error('VITE_AUTH_API_URL environment variable is not provided')

        try {
            let r = await fetch(`${authApiUrl}/auth/email/signup`, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })

            if (r.ok && r.status === 201) {
                let tokens = await r.json()
                await this.login(tokens.accessToken!, tokens.refreshToken!)
                return { success: true }
            }
            else
                return { success: false }
        } catch (e) {
            return { success: false }
        }
    }
}
