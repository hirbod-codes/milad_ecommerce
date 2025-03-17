import { Router } from "express"
import { emailConfig, otpProviderConfig, transporter, userRepository } from "src"
import { stringObjectId } from "src/DB/Models/common_schemas"
import { authenticate } from "src/middlewares/authenticate"
import { authorize } from "src/middlewares/authorize"
import Jwt from "jsonwebtoken";
import { userSchema, userUpdateSchema } from "src/DB/Models/User"
import { SessionManager } from "src/DB/Session/SessionManager"
import { DateTime } from "luxon"
import crypto from "crypto";
import { string } from "yup"

const users = Router()

users.get('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'get-user-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        if (!stringObjectId.isValidSync(userId)) {
            res.sendStatus(400)
            return
        }

        res.json(await userRepository.get(userId))
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.patch('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const { user } = req.body

        if (!stringObjectId.isValidSync(userId) || !userUpdateSchema.isValidSync(user)) {
            res.sendStatus(400)
            return
        }

        const r = await userRepository.update(userId, userUpdateSchema.cast(user))
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.post('/email-code', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-email') !== true) {
            res.sendStatus(403)
            return
        }

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const user = await userRepository.get(userId)

        if (!user || !user.email) {
            res.sendStatus(400)
            return
        }

        const email = user.email

        const code = Math.round((Math.random() * (999_999 - 100_000)) + 100_000)
        console.log(code)

        const text = `Your verification code is: ${code}

from sender`

        const mailOptions = {
            from: emailConfig.user,
            to: email,
            subject: 'Verification code',
            text,
        }

        try { await transporter.sendMail(mailOptions) }
        catch (e) {
            console.error(e)
            throw new Error('system failed to send email')
        }

        const expiresAt = DateTime.utc().plus({ seconds: 60 }).toUnixInteger()
        const sessionId = 'patch_email_' + crypto.randomBytes(128).toString('base64')
        try { await SessionManager.setSession(sessionId, JSON.stringify({ code, expiresAt }), expiresAt, true) }
        catch (e) {
            console.error(e)
            throw new Error('system failed to set session')
        }

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.patch('/email', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-email') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const { sessionId, email, code } = req.body

        if (!string().strict(true).required().isValidSync(sessionId) || !sessionId.includes('patch_email')) {
            res.sendStatus(400)
            return
        }

        let json = undefined
        try { json = await SessionManager.getSession(sessionId) }
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

        if (!stringObjectId.isValidSync(userId) || !userSchema.pick(['email']).required().isValidSync({ email })) {
            res.sendStatus(400)
            return
        }

        const r = await userRepository.updateEmail(userId, email)
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.post('/phone-number-code', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-phone-number') !== true) {
            res.sendStatus(403)
            return
        }

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const user = await userRepository.get(userId)

        if (!user || !user.phoneNumber) {
            res.sendStatus(400)
            return
        }

        const phoneNumber = user.phoneNumber

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
        const sessionId = 'patch_phone_number_' + crypto.randomBytes(128).toString('base64')
        try { await SessionManager.setSession(sessionId, JSON.stringify({ code, expiresAt }), expiresAt, true) }
        catch (e) {
            console.error(e)
            throw new Error('system failed to set session')
        }

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.patch('/phone-number', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-phone-number') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const { sessionId, phoneNumber, code } = req.body

        if (!string().strict(true).required().isValidSync(sessionId) || !sessionId.includes('patch_phone_number')) {
            res.sendStatus(400)
            return
        }

        let json = undefined
        try { json = await SessionManager.getSession(sessionId) }
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

        if (!stringObjectId.isValidSync(userId) || !userSchema.pick(['phoneNumber']).required().isValidSync({ phoneNumber })) {
            res.sendStatus(400)
            return
        }

        const r = await userRepository.updatePhoneNumber(userId, phoneNumber)
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.post('/username-code', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-username') !== true) {
            res.sendStatus(403)
            return
        }

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const user = await userRepository.get(userId)

        if (!user || (!user.phoneNumber && !user.email)) {
            res.sendStatus(400)
            return
        }

        const code = Math.round((Math.random() * (999_999 - 100_000)) + 100_000)
        console.log(code)

        const text = `Your verification code is: ${code}

from sender`

        if (user.phoneNumber) {
            const phoneNumber = user.phoneNumber

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
        } else {
            const email = user.email

            const mailOptions = {
                from: emailConfig.user,
                to: email,
                subject: 'Verification code',
                text,
            }

            try { await transporter.sendMail(mailOptions) }
            catch (e) {
                console.error(e)
                throw new Error('system failed to send email')
            }
        }

        const expiresAt = DateTime.utc().plus({ seconds: 60 }).toUnixInteger()
        const sessionId = 'patch_username_' + crypto.randomBytes(128).toString('base64')
        try { await SessionManager.setSession(sessionId, JSON.stringify({ code, expiresAt }), expiresAt, true) }
        catch (e) {
            console.error(e)
            throw new Error('system failed to set session')
        }

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.patch('/username', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-username') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const { sessionId, username, code } = req.body

        if (!string().strict(true).required().isValidSync(sessionId) || !sessionId.includes('patch_username')) {
            res.sendStatus(400)
            return
        }

        let json = undefined
        try { json = await SessionManager.getSession(sessionId) }
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

        if (!stringObjectId.isValidSync(userId) || !userSchema.pick(['username']).required().isValidSync({ username })) {
            res.sendStatus(400)
            return
        }

        const r = await userRepository.updateUsername(userId, username)
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.post('/password-code', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-password') !== true) {
            res.sendStatus(403)
            return
        }

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const user = await userRepository.get(userId)

        if (!user || (!user.phoneNumber && !user.email)) {
            res.sendStatus(400)
            return
        }

        const code = Math.round((Math.random() * (999_999 - 100_000)) + 100_000)
        console.log(code)

        const text = `Your verification code is: ${code}

from sender`

        if (user.phoneNumber) {
            const phoneNumber = user.phoneNumber

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
        } else {
            const email = user.email

            const mailOptions = {
                from: emailConfig.user,
                to: email,
                subject: 'Verification code',
                text,
            }

            try { await transporter.sendMail(mailOptions) }
            catch (e) {
                console.error(e)
                throw new Error('system failed to send email')
            }
        }

        const expiresAt = DateTime.utc().plus({ seconds: 60 }).toUnixInteger()
        const sessionId = 'patch_password_' + crypto.randomBytes(128).toString('base64')
        try { await SessionManager.setSession(sessionId, JSON.stringify({ code, expiresAt }), expiresAt, true) }
        catch (e) {
            console.error(e)
            throw new Error('system failed to set session')
        }

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.patch('/password', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'update-user-self-password') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const { sessionId, password, code } = req.body

        if (!string().strict(true).required().isValidSync(sessionId) || !sessionId.includes('patch_password')) {
            res.sendStatus(400)
            return
        }

        let json = undefined
        try { json = await SessionManager.getSession(sessionId) }
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

        if (!stringObjectId.isValidSync(userId) || !userSchema.pick(['password']).required().isValidSync({ password })) {
            res.sendStatus(400)
            return
        }

        let salt: string = undefined!, iterations: number = 10000
        const hashedPassword: string = await (async () => {
            return new Promise((resolve, reject) => {
                salt = crypto.randomBytes(128).toString('base64')
                crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (err, derivedKey) => {
                    if (err)
                        reject(err)
                    else
                        resolve(derivedKey.toString('hex'))
                })
            })
        })()

        const r = await userRepository.updatePassword(userId, hashedPassword, salt, iterations)
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.post('/delete-code', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'delete-user-self') !== true) {
            res.sendStatus(403)
            return
        }

        const userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const user = await userRepository.get(userId)

        if (!user || (!user.phoneNumber && !user.email)) {
            res.sendStatus(400)
            return
        }

        const code = Math.round((Math.random() * (999_999 - 100_000)) + 100_000)
        console.log(code)

        const text = `Your verification code is: ${code}

from sender`

        if (user.phoneNumber) {
            const phoneNumber = user.phoneNumber

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
        } else {
            const email = user.email

            const mailOptions = {
                from: emailConfig.user,
                to: email,
                subject: 'Verification code',
                text,
            }

            try { await transporter.sendMail(mailOptions) }
            catch (e) {
                console.error(e)
                throw new Error('system failed to send email')
            }
        }

        const expiresAt = DateTime.utc().plus({ seconds: 60 }).toUnixInteger()
        const sessionId = 'delete_user_' + crypto.randomBytes(128).toString('base64')
        try { await SessionManager.setSession(sessionId, JSON.stringify({ code, expiresAt }), expiresAt, true) }
        catch (e) {
            console.error(e)
            throw new Error('system failed to set session')
        }

        res.sendStatus(200)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

users.delete('/', authenticate, async (req, res) => {
    try {
        if (await authorize(req, 'delete-user-self') !== true) {
            res.sendStatus(403)
            return
        }

        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''

        const { sessionId, code } = req.body

        if (!string().strict(true).required().isValidSync(sessionId) || !sessionId.includes('delete_user')) {
            res.sendStatus(400)
            return
        }

        let json = undefined
        try { json = await SessionManager.getSession(sessionId) }
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

        const r = await userRepository.delete(userId)
        if (r === false || !r.acknowledged) {
            res.sendStatus(500)
            return
        }

        res.json(r)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { users }
