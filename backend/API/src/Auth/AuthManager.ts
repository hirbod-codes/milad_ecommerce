import { jwtSecret, revokedTokensRedisClient } from "@/src"
import { RevokedTokensRedisInsertionFailure } from "./Exceptions/RevokedTokensRedisInsertionFailure"
import Jwt from 'jsonwebtoken'

export class AuthManager {
    static getInstance() {
        return new AuthManager()
    }

    private jwtSecret: string
    private algorithm: Jwt.Algorithm
    private issuer: string = 'Authorization Server'

    constructor() {
        this.jwtSecret = jwtSecret
        this.algorithm = 'HS512'
    }

    static async isAccessTokenRevoked(accessToken: string): Promise<boolean> {
        try {
            await revokedTokensRedisClient.connect()

            let result = await revokedTokensRedisClient.get(accessToken)

            return result !== null && result !== undefined
        } catch (e) {
            console.error(e)
            throw new RevokedTokensRedisInsertionFailure()
        } finally {
            await revokedTokensRedisClient.quit()
        }
    }

    verify(token: string, tokenMode: 'accessToken' | 'refreshToken'): Promise<Jwt.JwtPayload | undefined> {
        return new Promise<Jwt.JwtPayload | undefined>((resolve, reject) => {
            Jwt.verify(token, this.jwtSecret, { complete: true, issuer: this.issuer, algorithms: [this.algorithm] }, (e, token) => {
                if (e) {
                    console.error(e)
                    resolve(undefined)
                } else if (typeof token!.payload === 'string') {
                    console.error('invalid token payload type was returned: ' + token!.payload)
                    resolve(undefined)
                } else if (token!.payload.tokenMode !== tokenMode)
                    resolve(undefined)
                else
                    resolve(token!.payload)
            })
        })
    }
}
