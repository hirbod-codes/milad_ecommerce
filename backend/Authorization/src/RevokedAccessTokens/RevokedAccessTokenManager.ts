import { revokedTokensRedisClient } from "@/src";
import { InsertionFailure } from "./Exceptions/InsertionFailure";
import { RetrievalFailure } from "./Exceptions/RetrievalFailure";

export class RevokedAccessTokenManager {
    static async set(key: string, value: string, expiresAt?: number): Promise<void> {
        try {
            await revokedTokensRedisClient.connect()

            let result = await revokedTokensRedisClient.set(key, value, { EXAT: expiresAt })

            if (result === null || result === undefined)
                throw new InsertionFailure()
        } catch (e) {
            console.error(e)
            throw new InsertionFailure()
        } finally {
            await revokedTokensRedisClient.quit()
        }
    }

    static async get(key: string): Promise<string | undefined> {
        try {
            await revokedTokensRedisClient.connect()

            let v = await revokedTokensRedisClient.get(key)

            return v === null ? undefined : v
        } catch (e) {
            console.error(e)
            throw new RetrievalFailure()
        } finally {
            await revokedTokensRedisClient.quit()
        }
    }
}
