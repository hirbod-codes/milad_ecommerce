import { jwtSecret, revokedTokensRedisClient } from "src"
import { RevokedTokensRedisInsertionFailure } from "./Exceptions/RevokedTokensRedisInsertionFailure"
import Jwt from 'jsonwebtoken'
import { InvalidToken } from "./Exceptions/InvalidToken"
import { DateTime } from "luxon"

export class AuthManager {
    static async isAccessTokenValid(accessToken: string): Promise<boolean> {
        try {
            Jwt.verify(accessToken, jwtSecret)
            return true
        } catch (e) {
            console.error(e)
            return false
        }
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

    static async revokeAccessToken(accessToken: string): Promise<void> {
        try {
            await revokedTokensRedisClient.connect()

            let jwt = Jwt.decode(accessToken) as Jwt.Jwt

            let ts: number | undefined
            if (typeof jwt.payload === 'string')
                ts = JSON.parse(jwt.payload)?.exp
            else
                ts = jwt.payload?.exp
            if (!ts)
                throw new InvalidToken('No Expiration timestamp')

            if (ts <= DateTime.utc().toUnixInteger())
                return

            let result = await revokedTokensRedisClient.set(accessToken, '', { EXAT: DateTime.fromSeconds(ts).toUnixInteger() })

            if (result === null || result === undefined)
                throw new RevokedTokensRedisInsertionFailure()
        } catch (e) {
            console.error(e)
            throw new RevokedTokensRedisInsertionFailure()
        } finally {
            await revokedTokensRedisClient.quit()
        }
    }
}
