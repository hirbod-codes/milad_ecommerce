import { Router } from "express";
import { emailConfig, googleOAuth2Config, hostPort, OtpProviderConfig, transporter, userRepository } from ".";
import { number, string } from "yup";
import { DateTime } from "luxon";
import { SessionManager } from "./Session/SessionManager";
import crypto from "crypto";
import { User } from "./DB/Models/User";
import { httpsRequest } from "./helpers";

const router = Router()

router.post('/send-code-phone-number', async (req, res) => {
    try {
        console.log('received request to /send-code-phone-number')

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
            username: OtpProviderConfig.otpProviderUsername,
            password: OtpProviderConfig.otpProviderPassword,
            from: OtpProviderConfig.otpProviderSenderNumber.toString(),
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

router.post('/auth-phone-number', async (req, res) => {
    try {
        console.log('received request to /auth-phone-number')

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

        let tokens = undefined
        try {
            const authResponse = await fetch('http://authorization:3000/generate-tokens', {
                method: 'post',
                headers: [['Content-Type', 'application/json'], ['Accept', 'application/json']],
                body: JSON.stringify({ username: phoneNumber })
            })
            if (!authResponse.ok)
                throw new Error('authorization service failed to create tokens')

            tokens = await authResponse.json()
        } catch (e) {
            console.error(e)
            throw new Error('authorization service failed to create tokens')
        }

        try {
            if (!await userRepository.phoneNumberExists(phoneNumber)) {
                let dbResponse = await userRepository.createUser({ schemaVersion: 'v0.0.0', username: phoneNumber, phoneNumber, createdAt: DateTime.utc().toUnixInteger(), updatedAt: DateTime.utc().toUnixInteger() })
                if (!dbResponse.acknowledged)
                    throw new Error('system failed to create a user')
            }
        } catch (e) {
            console.error(e)
            throw new Error('system failed to create a user')
        }

        res.status(201).json(tokens)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

router.post('/send-code-email', async (req, res) => {
    try {
        console.log('received request to /send-code-email')

        let { email } = req.body

        if (!string().required().email().isValidSync(email)) {
            res.sendStatus(400)
            return
        }

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

        try { await SessionManager.setSession(email, JSON.stringify({ code, expiresAt }), expiresAt) }
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

router.post('/signup-email', async (req, res) => {
    try {
        console.log('received request to /signup-email')

        const { email, password, code } = req.body

        if (!string().required().email().isValidSync(email)) {
            res.sendStatus(400)
            return
        }

        if (!string().required().min(8).isValidSync(password)) {
            res.sendStatus(400)
            return
        }

        if (!number().required().min(100_000).max(999_999).isValidSync(code)) {
            res.sendStatus(400)
            return
        }

        console.log('from user', { email, password, code })

        let json = undefined
        try { json = await SessionManager.getSession(email) }
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

        let tokens = undefined
        try {
            const authResponse = await fetch('http://authorization:3000/generate-tokens', {
                method: 'post',
                headers: [['Content-Type', 'application/json'], ['Accept', 'application/json']],
                body: JSON.stringify({ username: email })
            })
            if (!authResponse.ok)
                throw new Error('authorization service failed to create tokens')

            tokens = await authResponse.json()
        } catch (e) {
            console.error(e)
            throw new Error('authorization service failed to create tokens')
        }

        if (await userRepository.emailExists(email)) {
            res.sendStatus(500)
            return
        }

        let salt: string | undefined = undefined, iterations: number = 10000
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

        try {
            let dbResponse = await userRepository.createUser({
                schemaVersion: 'v0.0.0',
                username: email,
                email,
                password: hashedPassword,
                passwordSalt: salt,
                passwordIterations: iterations,
                createdAt: DateTime.utc().toUnixInteger(),
                updatedAt: DateTime.utc().toUnixInteger()
            })
            if (!dbResponse.acknowledged)
                throw new Error('system failed to create a user')
        } catch (e) {
            console.error(e)
            throw new Error('system failed to create a user')
        }

        res.status(201).json(tokens)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

router.post('/login-email', async (req, res) => {
    try {
        console.log('received request to /login-email')

        const { email, password } = req.body

        if (!string().required().email().isValidSync(email)) {
            res.sendStatus(400)
            return
        }

        if (!string().required().min(8).isValidSync(password)) {
            res.sendStatus(400)
            return
        }

        console.log('from user', { email, password })

        let user: User | undefined | null = await userRepository.getUserByEmail(email)
        console.log('user', user)
        if (!user) {
            res.sendStatus(400)
            return
        }

        let computedHash = await (async () => {
            return new Promise<string>((resolve, reject) => {
                crypto.pbkdf2(password, user.passwordSalt!, user.passwordIterations!, 64, 'SHA512', (e, k) => {
                    if (e)
                        reject(e)
                    else
                        resolve(k.toString('hex'))
                })
            })
        })()
        console.log('computedHash', computedHash)

        if (user.password !== computedHash) {
            res.sendStatus(400)
            return
        }

        let tokens = undefined
        try {
            const authResponse = await fetch('http://authorization:3000/generate-tokens', {
                method: 'post',
                headers: [['Content-Type', 'application/json'], ['Accept', 'application/json']],
                body: JSON.stringify({ username: email })
            })
            if (!authResponse.ok)
                throw new Error('authorization service failed to create tokens')

            tokens = await authResponse.json()
        } catch (e) {
            console.error(e)
            throw new Error('authorization service failed to create tokens')
        }

        res.status(200).json(tokens)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

router.get('/auth/google2', async (req, res) => {
    try {
        console.log('received request to /auth/google')

        let { redirectUrl: userRedirectUrl } = req.query

        let state = undefined
        await (async () => {
            let key = undefined, safety = 0
            while (safety < 1000) {
                key = crypto.randomBytes(20).toString('hex')
                try {
                    if (await SessionManager.getSession(key) !== undefined)
                        break
                }
                catch (e) { }

                safety++
            }
            if (safety >= 1000)
                console.warn('safety triggered in regards to find a unique key for session')

            if (key === undefined)
                throw new Error('system failed to set session')

            let value = crypto.randomBytes(20).toString('hex')
            state = key + value + userRedirectUrl
            try {
                await SessionManager.setSession(key, value)
            } catch (e) {
                console.error(e)
                throw new Error('system failed to set session')
            }
        })()

        const redirectUrl = 'http://localhost:3000/auth/google/callback'
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?prompt=select_account&client_id=${googleOAuth2Config.clientId}&redirect_uri=${redirectUrl}&response_type=code&state=${state}&scope=profile email`;

        res.redirect(authUrl);
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

router.get('/auth/google/callback', async (req, res) => {
    try {
        console.log('received request to /auth/google/callback')

        if (req.query.error !== undefined) {
            console.log('Authentication failed by google authorization server')
            res.destroy()
            return
        }

        let { code, state } = req.query

        if (!string().required().isValidSync(code)) {
            console.log('Invalid code query variable provided')
            res.destroy()
            return
        }

        if (!string().required().min(80).isValidSync(state)) {
            console.log('Invalid code query variable provided')
            res.destroy()
            return
        }

        let redirectUrl = undefined
        try {
            let key = state.slice(0, 40)
            let value = state.slice(40, 80)
            redirectUrl = state.slice(80)

            let v = await SessionManager.getSession(key)

            if (!v || v !== value) {
                res.sendStatus(400)
                return
            }
        } catch (e) {
            console.error(e)
            res.sendStatus(400)
            return
        }

        if (redirectUrl !== undefined && !string().required().url().isValidSync(redirectUrl)) {
            console.log('Invalid code query variable provided')
            res.sendStatus(400)
            return
        }

        let data = new URLSearchParams()
        data.append('code', code)
        data.append('client_id', googleOAuth2Config.clientId)
        data.append('client_secret', googleOAuth2Config.clientSecret)
        data.append('redirect_uri', 'http://localhost:3000/auth/google/callback')
        data.append('grant_type', 'authorization_code')

        let accessToken = undefined
        try {
            let tokenResponse = await httpsRequest({
                hostname: 'oauth2.googleapis.com',
                path: '/token',
                port: 443,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }, data.toString())

            accessToken = JSON.parse(tokenResponse.data).access_token
        } catch (e) {
            console.error(e)
            throw new Error('system failed to get google\'s access token')
        }

        if (!accessToken)
            throw new Error('system failed to get google\'s access token')

        console.log(accessToken)

        let userInfo = undefined
        try {
            let userInfoResponse = await httpsRequest({
                hostname: 'www.googleapis.com',
                path: '/oauth2/v2/userinfo',
                port: 443,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })

            userInfo = JSON.parse(userInfoResponse.data)
        } catch (e) {
            console.error(e)
            throw new Error('system failed to get google account\'s user info')
        }

        if (!userInfo)
            throw new Error('system failed to get google account\'s user info')

        console.log(userInfo)

        let tokens = undefined
        try {
            const authResponse = await fetch('http://authorization:3000/generate-tokens', {
                method: 'post',
                headers: [['Content-Type', 'application/json'], ['Accept', 'application/json']],
                body: JSON.stringify({ username: userInfo.email })
            })
            if (!authResponse.ok)
                throw new Error('authorization service failed to create tokens')

            tokens = await authResponse.json()
        } catch (e) {
            console.error(e)
            throw new Error('authorization service failed to create tokens')
        }

        console.log(tokens)

        let r = undefined
        try {
            if (!await userRepository.emailExists(userInfo.email)) {
                const now = DateTime.utc().toUnixInteger()
                r = await userRepository.createUser({
                    schemaVersion: 'v0.0.0',
                    username: userInfo.email,
                    email: userInfo.email,
                    firstName: userInfo.given_name,
                    lastName: userInfo.family_name,
                    avatarUrl: userInfo.picture,
                    createdAt: now,
                    updatedAt: now,
                })
            }
        } catch (e) {
            console.error(e)
            throw new Error('system failed to create user')
        }

        if (r !== undefined && r.acknowledged !== true)
            throw new Error('system failed to create user')

        // res.status(r === undefined ? 200 : 201).json(tokens)
        // res.redirect(`http://web:5173/auth/google/callback?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`)
        if (redirectUrl)
            res.redirect(`${decodeURIComponent(redirectUrl)}?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`)
        else
            res.status(r === undefined ? 200 : 201).json(tokens)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

router.get('/auth/google', async (req, res) => {
    try {
        console.log('received request to /auth/google')

        const { code, codeVerifier } = req.body

        if (!string().required().isValidSync(code)) {
            console.log('Invalid code query variable provided')
            res.destroy()
            return
        }

        if (!string().required().isValidSync(codeVerifier)) {
            console.log('Invalid code query variable provided')
            res.destroy()
            return
        }

        console.log('code', code)
        console.log('codeVerifier', codeVerifier)

        let data = new URLSearchParams()
        data.append('code', code)
        data.append('client_id', googleOAuth2Config.clientId)
        data.append('client_secret', googleOAuth2Config.clientSecret)
        data.append('redirect_uri', `http://127.0.0.1:80/`)
        data.append('grant_type', 'authorization_code')
        data.append('codeVerifier', codeVerifier)

        let accessToken = undefined
        try {
            let tokenResponse = await httpsRequest({
                hostname: 'oauth2.googleapis.com',
                path: '/token',
                port: 443,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }, data.toString())

            accessToken = JSON.parse(tokenResponse.data).access_token
        } catch (e) {
            console.error(e)
            throw new Error('system failed to get google\'s access token')
        }

        if (!accessToken)
            throw new Error('system failed to get google\'s access token')

        console.log('accessToken', accessToken)

        let userInfo = undefined
        try {
            let userInfoResponse = await httpsRequest({
                hostname: 'www.googleapis.com',
                path: '/oauth2/v2/userinfo',
                port: 443,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })

            userInfo = JSON.parse(userInfoResponse.data)
        } catch (e) {
            console.error(e)
            throw new Error('system failed to get google account\'s user info')
        }

        if (!userInfo)
            throw new Error('system failed to get google account\'s user info')

        console.log('userInfo', userInfo)

        let tokens = undefined
        try {
            const authResponse = await fetch('http://authorization:3000/generate-tokens', {
                method: 'post',
                headers: [['Content-Type', 'application/json'], ['Accept', 'application/json']],
                body: JSON.stringify({ username: userInfo.email })
            })
            if (!authResponse.ok)
                throw new Error('authorization service failed to create tokens')

            tokens = await authResponse.json()
        } catch (e) {
            console.error(e)
            throw new Error('authorization service failed to create tokens')
        }

        console.log('tokens', tokens)

        let r = undefined
        try {
            if (!await userRepository.emailExists(userInfo.email)) {
                const now = DateTime.utc().toUnixInteger()
                r = await userRepository.createUser({
                    schemaVersion: 'v0.0.0',
                    username: userInfo.email,
                    email: userInfo.email,
                    firstName: userInfo.given_name,
                    lastName: userInfo.family_name,
                    avatarUrl: userInfo.picture,
                    createdAt: now,
                    updatedAt: now,
                })
            }
        } catch (e) {
            console.error(e)
            throw new Error('system failed to create user')
        }

        if (r !== undefined && r.acknowledged !== true)
            throw new Error('system failed to create user')

        res.status(r === undefined ? 200 : 201).json(tokens)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { router }
