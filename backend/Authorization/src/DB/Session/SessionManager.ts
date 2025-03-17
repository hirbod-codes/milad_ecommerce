import { sessionRedisClient } from "../../";
import { SessionInsertionFailure } from "./Exceptions/SessionInsertionFailure";
import { SessionRetrievalFailure } from "./Exceptions/SessionRetrievalFailure";

export class SessionManager {
    static async setSession(key: string, value: string, expiresAt?: number, ensureUniqueness = false): Promise<void> {
        try {
            await sessionRedisClient.connect()

            if (ensureUniqueness) {
                const redisKey = await sessionRedisClient.incr('uniqueKeyCounter')
                key = redisKey + '_' + key
            }
            let result = await sessionRedisClient.set(key, value, { NX: ensureUniqueness ? ensureUniqueness : undefined, EXAT: expiresAt })

            if (result === null || result === undefined)
                throw new SessionInsertionFailure()
        } catch (e) {
            console.error(e)
            throw new SessionInsertionFailure()
        } finally {
            await sessionRedisClient.quit()
        }
    }

    static async getSession(key: string): Promise<string | undefined> {
        try {
            await sessionRedisClient.connect()

            let v = await sessionRedisClient.get(key)

            return v === null ? undefined : v
        } catch (e) {
            console.error(e)
            throw new SessionRetrievalFailure()
        } finally {
            await sessionRedisClient.quit()
        }
    }
}
