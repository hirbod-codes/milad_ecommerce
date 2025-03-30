import { string } from "yup";
import { Response } from ".."
import { Auth } from "./Auth"

export class SmsAuthenticationManager extends Auth {
    static async sendSms(phoneNumber: string): Promise<Response<void>> {
        try {
            let data = { phoneNumber }

            const authApiUrl = import.meta.env.VITE_AUTH_API_URL;
            if (!string().required().isValidSync(authApiUrl))
                throw new Error('VITE_AUTH_API_URL environment variable is not provided')

            let r = await fetch(`${authApiUrl}/auth/phone-number/send-code`, { method: 'post', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })

            if (r.ok && r.status === 200)
                return { success: true }
            else
                return { success: false }
        } catch (e) {
            console.error(e)
            return { success: false }
        }
    }

    static async submit(code: number, phoneNumber: string): Promise<Response<void>> {
        try {
            let data = { phoneNumber, code }

            const authApiUrl = import.meta.env.VITE_AUTH_API_URL;
            if (!string().required().isValidSync(authApiUrl))
                throw new Error('VITE_AUTH_API_URL environment variable is not provided')

            let r = await fetch(`${authApiUrl}/auth/phone-number/authenticate`, {
                credentials: 'include',
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            })

            if (r.ok && r.status === 201) {
                let { token } = await r.json()
                this.setToken(token!)
                return { success: true }
            } else
                return { success: false }
        } catch (e) {
            console.error(e)
            return { success: false }
        }
    }
}
