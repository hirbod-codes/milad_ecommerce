import { Router } from "express";
import { DateTime } from "luxon";
import { emailConfig, transporter } from "@/index";
import { SessionManager } from "@/DB/Session/SessionManager";
import { number, string } from "yup";
import crypto from "crypto";
import { User, userInputSchema } from "@/DB/Models/User";
import { UserRepository } from "@/DB/Repositories/UserRepository";
import { AuthManager } from "@/AuthManager";

const emailRouter = Router()

emailRouter.post('/send-code', async (req, res) => {
    try {
        console.log('received request to /send-code')

        let { email } = req.body

        if (!string().required().email().isValidSync(email)) {
            res.status(400).json({ message: '' })
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

        const badRequestErrors: string[] = []

        if (!userInputSchema.pick(['email']).required().isValidSync({ email }))
            badRequestErrors.push('invalid email')

        if (!userInputSchema.pick(['password']).required().isValidSync({ password }))
            badRequestErrors.push('invalid password')

        if (!number().strict(true).required().min(100_000).max(999_999).isValidSync(code))
            badRequestErrors.push('invalid code')

        if (badRequestErrors.length !== 0) {
            res.status(400).json({ errors: badRequestErrors })
            return
        }

        console.log('from user', { email, password, code })

        let json: string | undefined = undefined
        try { json = await SessionManager.getSession(email) }
        catch (e) {
            console.error(e)
            res.status(400).json({ message: 'invalid or expired code' })
            return
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

        const userRepository = await UserRepository.getInstance()

        if (await userRepository.emailExists(email)) {
            console.log('email already exists!')
            res.sendStatus(500)
            return
        }

        let salt: string | undefined = undefined, iterations: number = 1000
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

        let userId: string = undefined!
        try {
            let dbResponse = await userRepository.createUser({
                username: email,
                role: 'default',
                email,
                password: hashedPassword,
                passwordSalt: salt,
                passwordIterations: iterations,
            })
            if (dbResponse === false || dbResponse.acknowledged !== true)
                throw new Error('system failed to create a user')

            userId = dbResponse.insertedId.toString()
        } catch (e) {
            console.error(e)
            throw new Error('system failed to create a user')
        }

        let tokens: {
            accessToken: string;
            refreshToken: string;
        } | undefined = undefined
        try { tokens = await AuthManager.getInstance().generateTokens(userId, 'default') }
        catch (e) {
            console.error(e)
            throw new Error('system failed to create tokens')
        }

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

emailRouter.post('/login', async (req, res) => {
    try {
        console.log('received request to /login')

        const { email, password } = req.body

        const badRequestErrors: string[] = []

        if (!userInputSchema.pick(['email']).required().isValidSync({ email }))
            badRequestErrors.push('invalid email')

        if (!userInputSchema.pick(['password']).required().isValidSync({ password }))
            badRequestErrors.push('invalid password')

        if (badRequestErrors.length !== 0) {
            res.status(400).json({ errors: ['invalid credentials'] })
            return
        }

        console.log('from user', { email, password })

        const userRepository = await UserRepository.getInstance()
        let user: User | undefined | null = await userRepository.getUserByEmail(email)
        console.log('user', user)
        if (!user) {
            res.status(400).json({ errors: ['invalid credentials '] })
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
            res.status(400).json({ errors: ['invalid credentials'] })
            return
        }

        let tokens: {
            accessToken: string;
            refreshToken: string;
        } | undefined = undefined
        try { tokens = await AuthManager.getInstance().generateTokens(user._id.toString(), user.role) }
        catch (e) {
            console.error(e)
            throw new Error('system failed to create tokens')
        }

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

export { emailRouter }
