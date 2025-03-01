import { Response } from ".."

export class SmsAuthenticationManager {
    static async sendSms(phoneNumber: string): Promise<Response<string>> {
        return { success: false }
    }

    static async submit(code: number): Promise<Response<string>> {
        return { success: false }
    }
}
