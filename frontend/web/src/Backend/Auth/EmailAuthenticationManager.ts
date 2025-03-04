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
        await fetch(`http://api:3000/auth/google/?redirectUrl=${window.location.origin}/auth/google/callback`, { method: 'get', redirect: 'follow' })
    }
}
