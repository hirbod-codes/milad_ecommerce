import { DateTime } from "luxon"
import { emailConfig, otpProviderConfig, transporter } from "."
import { SessionManager } from "./DB/Session/SessionManager"
import crypto from "crypto";

export class CommunicationManagement {
    static async sendEmail(content: string, subject: string, to: string) {
        const mailOptions = {
            from: emailConfig.user,
            to,
            subject,
            text: content,
        }

        await transporter.sendMail(mailOptions)
    }

    static async sendSms(to: string, content: string) {
        const data = {
            username: otpProviderConfig.otpProviderUsername,
            password: otpProviderConfig.otpProviderPassword,
            from: otpProviderConfig.otpProviderSenderNumber.toString(),
            to,
            text: content
        }
        const json = JSON.stringify(data)

        let otpResponse = (await fetch(`https://rest.payamak-panel.com/api/SendSMS/SendSMS`, {
            method: 'post',
            body: json,
            headers: [['Content-Type', 'application/json'], ['Accept', 'application/json']]
        }))
        console.log(otpResponse.status)

        if (!otpResponse.ok)
            throw new Error('system failed to send an otp message')

        let responseStatus = Number((await otpResponse.json()).value)
        if (responseStatus <= 35)
            throw new Error('system failed to send an otp message')
    }

    static async notifyAndRemember(mode: 'email', notificationOptions: { content: string, to: string, subject: string }, sessionOptions: { content: string | object, identifier: string, expiresAfterSeconds: number }): Promise<void>
    static async notifyAndRemember(mode: 'sms', notificationOptions: { content: string, to: string }, sessionOptions: { content: string | object, identifier: string, expiresAfterSeconds: number }): Promise<void>
    static async notifyAndRemember(mode: 'email' | 'sms', notificationOptions: { content: string, to: string, subject?: string }, sessionOptions: { content: string | object, identifier: string, expiresAfterSeconds: number }): Promise<void> {
        try {
            if (mode === 'email' && notificationOptions.subject)
                await this.sendEmail(notificationOptions.content, notificationOptions.subject!, notificationOptions.to)
            if (mode === 'sms')
                await this.sendSms(notificationOptions.content, notificationOptions.to)
            else
                throw new Error('Unsupported communication mode requested')
        } catch (e) {
            console.error(e)
            throw new Error('system failed to notify user')
        }

        const expiresAt = DateTime.utc().plus({ seconds: sessionOptions.expiresAfterSeconds }).toUnixInteger()
        const sessionId = sessionOptions.identifier + crypto.randomBytes(128).toString('base64')
        try {
            if (typeof sessionOptions.content === 'string')
                await SessionManager.setSession(sessionId, JSON.stringify({ sessionOptions: sessionOptions.content, expiresAt }), expiresAt, sessionOptions.identifier)
            else
                await SessionManager.setSession(sessionId, JSON.stringify({ ...sessionOptions.content, expiresAt }), expiresAt, sessionOptions.identifier)
        } catch (e) {
            console.error(e)
            throw new Error('system failed to set session')
        }
    }

    static async notifyAndRememberForVerificationCode(mode: 'email' | 'sms', to: string, sessionIdentifier: string, expiresAfterSeconds: number = 60): Promise<void> {
        const code = Math.round((Math.random() * (999_999 - 100_000)) + 100_000)
        console.log(code)

        const content = `Your verification code is: ${code}\n\nfrom sender`

        if (mode === 'email')
            await CommunicationManagement.notifyAndRemember('email', { content, to, subject: 'Verification Code' }, { content: { code }, identifier: sessionIdentifier, expiresAfterSeconds })
        else
            await CommunicationManagement.notifyAndRemember('sms', { content, to }, { content: { code }, identifier: sessionIdentifier, expiresAfterSeconds })
    }
}
