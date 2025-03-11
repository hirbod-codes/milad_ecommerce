import { Response } from "..";
import { Auth } from "./Auth";

export class EmailAuthenticationManager extends Auth {
    static async sendCodeToEmail(email: string): Promise<Response<string>> {
        return { success: false }
    }

    static async authenticate(email: string, password: string, code: number): Promise<Response<string>> {
        return { success: false }
    }

    static async register(email: string, password: string, code: number): Promise<Response<string>> {
        return { success: false }
    }
}
