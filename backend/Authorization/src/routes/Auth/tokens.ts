import { Router } from "express";
import { refreshTokenInputSchema } from "@/src/DB/Models/RefreshToken";
import { authenticate } from "@/src/middlewares/authenticate";
import { stringObjectId } from "@/src/DB/Models/common_schemas";
import Jwt from "jsonwebtoken";
import { AuthManager } from "@/src/AuthManager";

const tokenRouter = Router()

tokenRouter.get('/logout', (req, res) => {
    res.clearCookie('token').sendStatus(200)
})

tokenRouter.post('/retrieve-access-token', async (req, res) => {
    try {
        console.log('req?.cookies', req?.cookies)
        const refreshToken = req?.cookies?.token

        const badRequestErrors = []

        if (!refreshTokenInputSchema.pick(['refreshToken']).required().isValidSync({ refreshToken }))
            badRequestErrors.push('invalid refresh token')

        let userId = Jwt.decode(refreshToken, { json: true })?.sub ?? ''
        if (!stringObjectId.required().isValidSync(userId))
            badRequestErrors.push('invalid user id')

        if (badRequestErrors.length !== 0) {
            res.status(401).json(badRequestErrors)
            return
        }

        let token
        try { token = await AuthManager.getInstance().retrieveAccessToken(refreshToken) }
        catch (e) { console.error(e); res.sendStatus(401); return }

        res.status(201).json({ token })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

tokenRouter.post('/revoke-tokens', authenticate, async (req, res) => {
    try {
        let userId = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.sub ?? ''
        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(403)
            return
        }

        if ((await AuthManager.getInstance().revokeRefreshTokenByUserId(userId)) === false) {
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
