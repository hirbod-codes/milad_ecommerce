import { Router } from "express";
import { authManager } from "../../";
import { string } from "yup";
import { ObjectId } from "mongodb";

const tokenRouter = Router()

tokenRouter.post('/retrieve-access-token', async (req, res) => {
    try {
        console.log('received request to /retrieve-access-token')

        let { refreshToken, userId } = req.body

        if (!string().required().max(2000).isValidSync(refreshToken)) {
            res.sendStatus(400)
            return
        }

        if (typeof userId !== 'string' || !ObjectId.isValid(userId)) {
            res.sendStatus(400)
            return
        }

        let token = await authManager.retrieveAccessToken(userId, refreshToken)

        res.sendStatus(201).json({ token })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { tokenRouter }
