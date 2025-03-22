import { Router } from "express";
import { authManager } from "@/src/";
import { RevokedAccessTokenManager } from "@/src/RevokedAccessTokens/RevokedAccessTokenManager";
import { refreshTokenInputSchema } from "@/src/DB/Models/RefreshToken";

const tokenRouter = Router()

tokenRouter.post('/retrieve-access-token', async (req, res) => {
    try {

        let { refreshToken, userId } = req.body

        const badRequestErrors = []

        if (!refreshTokenInputSchema.pick(['refreshToken']).required().isValidSync({ refreshToken }))
            badRequestErrors.push('invalid refresh token')

        if (!refreshTokenInputSchema.pick(['userId']).required().isValidSync({ userId }))
            badRequestErrors.push('invalid user id')

        if (badRequestErrors.length !== 0) {
            res.status(400).json(badRequestErrors)
            return
        }

        let token = await authManager.retrieveAccessToken(refreshToken)

        res.status(201).json({ token })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

tokenRouter.post('/revoke-access-token', async (req, res) => {
    try {
        let { accessToken } = req.body

        if (!refreshTokenInputSchema.pick(['accessToken']).required().isValidSync({ accessToken })) {
            res.status(400).json({ message: 'invalid Access token' })
            return
        }

        if ((await authManager.revokeToken(accessToken)) === false) {
            res.sendStatus(400)
            return
        }

        res.sendStatus(204)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { tokenRouter }
