import { Router } from "express";
import { DateTime } from "luxon";
import { emailConfig, transporter, userRepository } from "../../";
import { SessionManager } from "../../DB/Session/SessionManager";
import { number, string } from "yup";
import crypto from "crypto";
import { User } from "src/DB/Models/User";

const emailRouter = Router()

emailRouter.post('/send-code', async (req, res) => {
    try {
        console.log('received request to /send-code')

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

emailRouter.post('/signup', async (req, res) => {
    try {
        console.log('received request to /signup')

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

emailRouter.post('/login', async (req, res) => {
    try {
        console.log('received request to /login')

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

export { emailRouter }
