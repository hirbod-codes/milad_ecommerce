import { Request, Response, NextFunction } from "express"
import { authManager } from "@/src"
import { RevokedAccessTokenManager } from "@/src/RevokedAccessTokens/RevokedAccessTokenManager"

export async function authenticate(req: Request, res: Response, next: NextFunction) {
    try {
        const header = req.headers['authorization']
        if (header === undefined) {
            res.sendStatus(401)
            return
        }

        const token = header.replace('Bearer ', '')

        if ((await authManager.verify(token)) === undefined || await RevokedAccessTokenManager.get(token) !== undefined) {
            res.sendStatus(401)
            return
        }

        next()
    }
    catch (e) { console.error(e); res.sendStatus(401) }
}
