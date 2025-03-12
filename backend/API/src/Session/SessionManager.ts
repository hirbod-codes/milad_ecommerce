import { sessionRedisClient } from "..";
import { SessionInsertionFailure } from "./Exceptions/SessionInsertionFailure";
import { SessionRetrievalFailure } from "./Exceptions/SessionRetrievalFailure";

export class SessionManager {
    static async setSession(key: string, value: string, expiresAt?: number): Promise<void> {
        try {
            await sessionRedisClient.connect()

            let result = await sessionRedisClient.set(key, value, { EXAT: expiresAt })

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
