import { Request, Response, NextFunction } from "express"
import { RevokedAccessTokenManager } from "@/RevokedAccessTokens/RevokedAccessTokenManager"
import { AuthManager } from "../Auth/AuthManager"

export async function authenticate(req: Request, res: Response, next: NextFunction) {
    try {
        const header = req.headers['authorization']
        if (header === undefined) {
            res.sendStatus(401)
            return
        }

        const token = header.replace('Bearer ', '')

        if ((await AuthManager.getInstance().verify(token, 'accessToken')) === undefined || await RevokedAccessTokenManager.get(token) !== undefined) {
            res.sendStatus(401)
            return
        }

        next()
    }
    catch (e) { console.error(e); res.sendStatus(401) }
}
