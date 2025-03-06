import { redisClient } from "src";
import { SessionInsertionFailure } from "./Exceptions/SessionInsertionFailure";
import { SessionRetrievalFailure } from "./Exceptions/SessionRetrievalFailure";

export class SessionManager {
    static async setSession(key: string, value: string, expiresAt?: number): Promise<void> {
        try {
            await redisClient.connect()

            let result = await redisClient.set(key, value, { EXAT: expiresAt })

            if (result === null || result === undefined)
                throw new SessionInsertionFailure()
        } catch (e) {
            console.error(e)
            throw new SessionInsertionFailure()
        } finally {
            await redisClient.quit()
        }
    }

    static async getSession(key: string): Promise<string | undefined> {
        try {
            await redisClient.connect()

            let v = await redisClient.get(key)

            return v === null ? undefined : v
        } catch (e) {
            console.error(e)
            throw new SessionRetrievalFailure()
        } finally {
            await redisClient.quit()
        }
    }
}
