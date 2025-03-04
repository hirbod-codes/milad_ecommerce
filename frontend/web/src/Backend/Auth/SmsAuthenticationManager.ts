import { Response } from ".."
import { AuthManager } from "./AuthManager"

export class SmsAuthenticationManager extends AuthManager {
    static async sendSms(phoneNumber: string): Promise<Response<string>> {
        return { success: false }
    }

    static async submit(code: number): Promise<Response<string>> {
        return { success: false }
    }
}
