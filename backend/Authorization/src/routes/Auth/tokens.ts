import { Router } from "express";
import { authManager } from "../../";
import { string } from "yup";

const tokenRouter = Router()

tokenRouter.post('/retrieve-access-token', async (req, res) => {
    try {
        console.log('received request to /retrieve-access-token')

        let { refreshToken, username } = req.body

        if (!string().required().max(2000).isValidSync(refreshToken)) {
            res.sendStatus(400)
            return
        }

        if (!string().required().min(1).max(40).isValidSync(username)) {
            res.sendStatus(400)
            return
        }

        let token = await authManager.retrieveAccessToken(username, refreshToken)

        res.sendStatus(201).json({ token })
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

export { tokenRouter }
