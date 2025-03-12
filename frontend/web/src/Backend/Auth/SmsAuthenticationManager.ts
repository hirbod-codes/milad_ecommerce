import { string } from "yup";
import { Response } from ".."
import { Auth } from "./Auth"

export class SmsAuthenticationManager extends Auth {
    static async sendSms(phoneNumber: string): Promise<Response<void>> {
        let data = { phoneNumber }

        const authApiUrl = import.meta.env.VITE_AUTH_API_URL;
        if (!string().required().isValidSync(authApiUrl))
            throw new Error('VITE_AUTH_API_URL environment variable is not provided')

        try {
            let r = await fetch(`${authApiUrl}/auth/phone-number/send-code`, { method: 'post', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })

            if (r.ok && r.status === 200)
                return { success: true }
            else
                return { success: false }
        } catch (e) {
            return { success: false }
        }
    }

    static async submit(code: number, phoneNumber: string): Promise<Response<void>> {
        let data = { phoneNumber, code }

        const authApiUrl = import.meta.env.VITE_AUTH_API_URL;
        if (!string().required().isValidSync(authApiUrl))
            throw new Error('VITE_AUTH_API_URL environment variable is not provided')

        try {
            let r = await fetch(`${authApiUrl}/auth/phone-number/authenticate`, { method: 'post', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })

            if (r.ok && r.status === 201) {
                let tokens = await r.json()
                await this.login(tokens.accessToken!, tokens.refreshToken!)
                return { success: true }
            } else
                return { success: false }
        } catch (e) {
            return { success: false }
        }
    }
}
