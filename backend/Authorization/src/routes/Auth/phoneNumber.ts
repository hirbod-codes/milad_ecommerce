import { Router } from "express";
import { DateTime } from "luxon";
import { authManager, otpProviderConfig, userRepository } from "../../";
import { SessionManager } from "../../DB/Session/SessionManager";
import { number, string } from "yup";

const phoneNumberRouter = Router()

phoneNumberRouter.post('/send-code', async (req, res) => {
    try {
        console.log('received request to /send-code')

        let { phoneNumber } = req.body

        if (!string().required().matches(/^09[0-9]{9}$/).isValidSync(phoneNumber)) {
            res.sendStatus(400)
            return
        }

        const code = Math.round((Math.random() * (999_999 - 100_000)) + 100_000)
        console.log(code)

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

            let responseStatus = Number((await otpResponse.json()).value)
            if (responseStatus <= 35)
                throw new Error('system failed to send an otp message')
        } catch (e) {
            console.error(e)
            throw new Error('system failed to send an otp message')
        }

        const expiresAt = DateTime.utc().plus({ seconds: 60 }).toUnixInteger()

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

        let { phoneNumber, code } = req.body

        if (!string().required().matches(/^09[0-9]{9}$/).isValidSync(phoneNumber)) {
            res.sendStatus(400)
            return
        }

        if (!number().required().min(100_000).max(999_999).isValidSync(code)) {
            res.sendStatus(400)
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
            res.sendStatus(400)
            return
        }

        let userId: string = undefined!
        try {
            let user = await userRepository.getUserByPhoneNumber(phoneNumber)
            if (user)
                userId = user._id.toString()
            else {
                let dbResponse = await userRepository.createUser({ username: phoneNumber, phoneNumber})
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
        try { tokens = await authManager.generateTokens(userId, 'default') }
        catch (e) {
            console.error(e)
            throw new Error('system failed to create tokens')
        }
        console.log('tokens', tokens)

        res.status(201).json(tokens)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { phoneNumberRouter }
