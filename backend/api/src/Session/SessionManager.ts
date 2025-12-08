import { createClient, createCluster, RedisClientType, RedisClusterType, RedisDefaultModules } from "redis";
import { SessionInsertionFailure } from "./Exceptions/SessionInsertionFailure";
import { SessionRetrievalFailure } from "./Exceptions/SessionRetrievalFailure";
import { ConnectionFailure } from "./Exceptions/ConnectionFailure";

export class SessionManager {
    static sessionRedisClient: RedisClusterType<RedisDefaultModules> | RedisClientType<RedisDefaultModules> = undefined!

    static async initialize(sessionRedisType: 'single' | 'cluster', sessionRedisInitialNodeUrl: string) {
        if (sessionRedisType === 'single')
            SessionManager.sessionRedisClient = createClient({ url: sessionRedisInitialNodeUrl })
        else if (sessionRedisType === 'cluster')
            SessionManager.sessionRedisClient = createCluster({
                rootNodes: [{ url: sessionRedisInitialNodeUrl }],
                useReplicas: true
            })
        else
            throw new Error('Invalid configuration provided for redis')

        try {
            await SessionManager.sessionRedisClient.connect()

            process.on('SIGINT', async () => {
                await SessionManager.sessionRedisClient.quit();
                console.log('Sessions Redis connection closed');
                process.exit(0);
            })
        } catch (e) {
            console.error(e)
            throw new ConnectionFailure()
        }
    }

    static async setSession(key: string, value: string, expiresAt?: number, uniquenessKey?: string): Promise<void> {
        try {
            if (uniquenessKey) {
                const redisKey = await SessionManager.sessionRedisClient.incr(uniquenessKey)
                key = redisKey + '_' + key
            }
            let result = await SessionManager.sessionRedisClient.set(key, value, { NX: uniquenessKey ? true : undefined, EXAT: expiresAt })

            if (result === null || result === undefined)
                throw new SessionInsertionFailure()
        } catch (e) {
            console.error(e)
            throw new SessionInsertionFailure()
        }
    }

    static async getSession(key: string): Promise<string | undefined> {
        try {
            let v = await SessionManager.sessionRedisClient.get(key)

            return v === null ? undefined : v
        } catch (e) {
            console.error(e)
            throw new SessionRetrievalFailure()
        }
    }

    static async incrementProductViews(productId: string): Promise<number> {
        try {
            await SessionManager.sessionRedisClient.sAdd(`product:views:set`, productId)
            return await SessionManager.sessionRedisClient.incr(`product:${productId}:views`)
        } catch (e) {
            console.error(e)
            throw new SessionInsertionFailure()
        }
    }

    static async deleteProductViews(productId: string): Promise<number> {
        try {
            return await SessionManager.sessionRedisClient.sRem(`product:views:set`, productId)
        } catch (e) {
            console.error(e)
            throw new SessionInsertionFailure()
        }
    }

    static async getProductViews(productId: string): Promise<string | null> {
        return await SessionManager.sessionRedisClient.get(`product:${productId}:views`);
    }

    static async getProductViewsCursor(offset: number, limit: number): Promise<{ cursor: number, members: string[] }> {
        return await SessionManager.sessionRedisClient.sScan(`product:views:set`, offset, {
            MATCH: '*',
            COUNT: limit,
        })
    }
}
