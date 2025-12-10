import { Router } from "express";
import { DateTime } from "luxon";
import { otpProviderConfig } from "@/index";
import { SessionManager } from "@/DB/Session/SessionManager";
import { number } from "yup";
import { User, userInputSchema } from "@/DB/Models/User";
import { UserRepository } from "@/DB/Repositories/UserRepository";
import { AuthManager } from "@/AuthManager";

const phoneNumberRouter = Router()

phoneNumberRouter.post('/send-code', async (req, res) => {
    try {
        console.log('received request to /send-code')

        let { phoneNumber }: { phoneNumber: string } = req.body

        if (!userInputSchema.pick(['phoneNumber']).strict(true).required().isValidSync({ phoneNumber })) {
            res.status(400).json({ message: 'invalid Phone number' })
            return
        }

        const code = Math.round((Math.random() * (999_999 - 100_000)) + 100_000)
        console.log('code', code)

        const text = `Your verification code is: ${code}

from sender`

        const data = {
            username: otpProviderConfig.otpProviderUsername,
            password: otpProviderConfig.otpProviderPassword,
            from: otpProviderConfig.otpProviderSenderNumber.toString(),
            to: phoneNumber,
            text
        }
        const json = JSON.stringify(data)

        try {
            let otpResponse = (await fetch(`https://rest.payamak-panel.com/api/SendSMS/SendSMS`, {
                method: 'post',
                body: json,
                headers: [['Content-Type', 'application/json'], ['Accept', 'application/json']]
            }))
            console.log(otpResponse.status)

            if (!otpResponse.ok)
                throw new Error('system failed to send an otp message')

            let responseStatus = Number((await otpResponse.json() as any)?.value ?? 0)
            if (responseStatus <= 35)
                throw new Error('system failed to send an otp message')
        } catch (e) {
            console.error(e)
            throw new Error('system failed to send an otp message')
        }

        const expiresAt = DateTime.utc().plus({ seconds: 60 }).toUnixInteger()
        console.log('expiresAt', DateTime.utc(), DateTime.fromSeconds(expiresAt).toString())

        try {
            await SessionManager.setSession(phoneNumber, JSON.stringify({ code, expiresAt }), expiresAt)
        } catch (e) {
            console.error(e)
            throw new Error('system failed to set session')
        }

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

phoneNumberRouter.post('/authenticate', async (req, res) => {
    try {
        console.log('received request to /authenticate')

        let { phoneNumber, code }: { phoneNumber: string, code: number } = req.body

        const badRequestErrors = []

        if (!userInputSchema.pick(['phoneNumber']).strict(true).required().isValidSync({ phoneNumber }))
            badRequestErrors.push('invalid Phone number')

        if (!number().strict(true).required().min(100_000).max(999_999).isValidSync(code))
            badRequestErrors.push('invalid email')

        if (badRequestErrors.length !== 0) {
            res.status(400).json(badRequestErrors)
            return
        }

        console.log('from user', { phoneNumber, code })

        let json = undefined
        try { json = await SessionManager.getSession(phoneNumber) }
        catch (e) {
            console.error(e)
            throw new Error('session not found')
        }

        if (!json)
            throw new Error('session not found')

        let { code: inSessionCode, expiresAt: inSessionExpiresAt } = JSON.parse(json)
        inSessionCode = Number(inSessionCode)
        inSessionExpiresAt = Number(inSessionExpiresAt)

        console.log('from redis', { inSessionCode, inSessionExpiresAt })

        if (inSessionCode !== code || inSessionExpiresAt <= DateTime.utc().toUnixInteger()) {
            res.status(400).json({ message: 'invalid or expired code' })
            return
        }

        let userId: string = undefined!, user: User | undefined | null
        try {
            const userRepository = await UserRepository.getInstance()
            user = await userRepository.getUserByPhoneNumber(phoneNumber)
            if (user)
                userId = user._id.toString()
            else {
                let dbResponse = await userRepository.createUser({ username: phoneNumber, phoneNumber, role: 'default' })
                console.log('dbResponse', dbResponse)
                if (dbResponse === false || dbResponse.acknowledged !== true)
                    throw new Error('system failed to create a user')

                userId = dbResponse.insertedId.toString()
            }
        } catch (e) {
            console.error(e)
            throw new Error('system failed to create a user')
        }

        let tokens = undefined
        try { tokens = await AuthManager.getInstance().generateTokens(userId, user?.role ?? 'default') }
        catch (e) {
            console.error(e)
            throw new Error('system failed to create tokens')
        }
        console.log('tokens', tokens)

        res
            .cookie('token', tokens.refreshToken, {
                httpOnly: true,
                secure: true,
                maxAge: 604800000, // One Week
                sameSite: 'strict',
            })
            .status(200)
            .json({ token: tokens.accessToken })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { phoneNumberRouter }
