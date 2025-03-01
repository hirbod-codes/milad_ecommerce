import { Response } from "..";

export class EmailAuthenticationManager {
    static async sendCodeToEmail(email: string): Promise<Response<string>> {
        return { success: false }
    }

    static async login(email: string, password: string, code: number): Promise<Response<string>> {
        return { success: false }
    }

    static async register(email: string, password: string, code: number): Promise<Response<string>> {
        return { success: false }
    }
}
