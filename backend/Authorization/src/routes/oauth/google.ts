import { Router } from "express";
import { googleOAuth2Config } from "@/src/";
import { httpsRequest } from "@/src/helpers";
import { string } from "yup";
import { User } from "@/src/DB/Models/User";
import { UserRepository } from "@/src/DB/Repositories/UserRepository";
import { AuthManager } from "@/src/AuthManager";

const oauthGoogleRouter = Router()

oauthGoogleRouter.get('/client-id', async (req, res) => {
    res.json({ clientId: googleOAuth2Config.clientId })
})

oauthGoogleRouter.post('/token', async (req, res) => {
    try {
        console.log('received request to /auth/google/token')

        const { code, codeVerifier, redirectUri } = req.body

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

        if (!string().required().url().isValidSync(redirectUri)) {
            console.log('Invalid code query variable provided')
            res.destroy()
            return
        }

        console.log('code', code)
        console.log('codeVerifier', codeVerifier)
        console.log('redirectUri', redirectUri)

        let data = new URLSearchParams()
        data.append('code', code)
        data.append('client_id', googleOAuth2Config.clientId)
        data.append('client_secret', googleOAuth2Config.clientSecret)
        data.append('redirect_uri', redirectUri)
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

        let userId: string = undefined!, user: User | undefined | null
        let r = undefined
        try {
            const userRepository = await UserRepository.getInstance()
            let user = await userRepository.getUserByEmail(userInfo.email)
            if (user)
                userId = user._id.toString()
            else {
                r = await userRepository.createUser({
                    username: userInfo.email,
                    role: 'default',
                    email: userInfo.email,
                    firstName: userInfo.given_name,
                    lastName: userInfo.family_name,
                    avatarUrl: userInfo.picture,
                })

                if (r === false || (r !== undefined && r.acknowledged !== true))
                    throw new Error('system failed to create user')

                userId = r.insertedId.toString()
            }
        } catch (e) {
            console.error(e)
            throw new Error('system failed to create user')
        }

        let tokens = undefined
        try { tokens = await AuthManager.getInstance().generateTokens(userId, user?.role ?? 'default') }
        catch (e) {
            console.error(e)
            throw new Error('authorization service failed to create tokens')
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

export { oauthGoogleRouter }
