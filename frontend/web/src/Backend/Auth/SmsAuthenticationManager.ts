import { Response } from ".."
import { Auth } from "./Auth"

export class SmsAuthenticationManager extends Auth {
    static async sendSms(phoneNumber: string): Promise<Response<string>> {
        return { success: false }
    }

    static async submit(code: number): Promise<Response<string>> {
        return { success: false }
    }
}
