import { Router } from "express";
import { authManager } from "../../";
import { string } from "yup";
import { RevokedAccessTokenManager } from "src/RevokedAccessTokens/RevokedAccessTokenManager";
import { stringObjectId } from "src/DB/Models/common_schemas";

const tokenRouter = Router()

tokenRouter.post('/retrieve-access-token', async (req, res) => {
    try {
        console.log('received request to /retrieve-access-token')

        let { refreshToken, userId } = req.body

        if (!string().required().max(350).isValidSync(refreshToken)) {
            res.sendStatus(400)
            return
        }

        if (!stringObjectId.required().isValidSync(userId)) {
            res.sendStatus(400)
            return
        }

        let token = await authManager.retrieveAccessToken(refreshToken)

        res.sendStatus(201).json({ token })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

tokenRouter.post('/revoke-access-token', async (req, res) => {
    try {
        console.log('received request to /retrieve-access-token')

        let { accessToken } = req.body

        if (!string().required().max(350).isValidSync(accessToken)) {
            res.sendStatus(400)
            return
        }

        let payload = undefined
        try { payload = authManager.verify(accessToken) }
        catch (e) { console.error(e) }

        if (payload === undefined || payload === false) {
            res.sendStatus(400)
            return
        }

        const expirationTS = payload.exp
        if (expirationTS === undefined) {
            res.sendStatus(400)
            return
        }

        await RevokedAccessTokenManager.set(accessToken, 'true', expirationTS)

        res.sendStatus(204)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { tokenRouter }
