import { Request, Response, NextFunction } from "express"
import { jwtSecret } from "src"
import { RevokedAccessTokenManager } from "src/RevokedAccessTokens/RevokedAccessTokenManager"
import Jwt from "jsonwebtoken";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
    try {
        const header = req.headers['authorization']
        if (header === undefined) {
            res.status(401)
            return
        }

        const token = header.replace('Bearer ', '')

        if (Jwt.verify(token, jwtSecret) && !await RevokedAccessTokenManager.get(token)) {
            res.status(401)
            return
        }

        next()
    }
    catch (e) { console.error(e); res.sendStatus(401) }
}
