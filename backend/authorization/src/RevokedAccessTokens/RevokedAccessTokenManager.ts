import { createClient, createCluster, RedisClientType, RedisClusterType, RedisDefaultModules } from "redis";
import { InsertionFailure } from "./Exceptions/InsertionFailure";
import { RetrievalFailure } from "./Exceptions/RetrievalFailure";
import { ConnectionFailure } from "./Exceptions/ConnectionFailure";

export class RevokedAccessTokenManager {
    private static revokedTokensRedisClient: RedisClusterType<RedisDefaultModules> | RedisClientType<RedisDefaultModules> = undefined!

    static async initialize(revokedTokensRedisType: 'single' | 'cluster', revokedTokensRedisInitialNodeUrl: string) {
        if (revokedTokensRedisType === 'single')
            RevokedAccessTokenManager.revokedTokensRedisClient = createClient({ url: revokedTokensRedisInitialNodeUrl })
        else if (revokedTokensRedisType === 'cluster')
            RevokedAccessTokenManager.revokedTokensRedisClient = createCluster({
                rootNodes: [{ url: revokedTokensRedisInitialNodeUrl }],
                useReplicas: true
            })
        else
            throw new Error('Invalid configuration provided for revoked access tokens redis connection')

        try {
            await RevokedAccessTokenManager.revokedTokensRedisClient.connect()

            process.on('SIGINT', async () => {
                await RevokedAccessTokenManager.revokedTokensRedisClient.quit();
                console.log('Revoked access tokens Redis connection closed');
                process.exit(0);
            })
        } catch (e) {
            console.error(e)
            throw new ConnectionFailure()
        }
    }

    static async set(key: string, value: string, expiresAt?: number): Promise<void> {
        try {
            let result = await RevokedAccessTokenManager.revokedTokensRedisClient.set(key, value, { EXAT: expiresAt })

            if (result === null || result === undefined)
                throw new InsertionFailure()
        } catch (e) {
            console.error(e)
            throw new InsertionFailure()
        }
    }

    static async get(key: string): Promise<string | undefined> {
        try {
            let v = await RevokedAccessTokenManager.revokedTokensRedisClient.get(key)

            return v === null ? undefined : v
        } catch (e) {
            console.error(e)
            throw new RetrievalFailure()
        }
    }
}
