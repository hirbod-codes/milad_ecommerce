import express from "express";
import dotenv from "dotenv";
import { getBooleanEnv, getIntegerEnv, getStringEnv } from "./helpers";
import { createClient, createCluster, RedisClientType, RedisClusterType, RedisDefaultModules } from "redis";
import { MongoDB } from "./DB/mongodb";
import { UserRepository } from "./DB/Repositories/UserRepository";
import { RoleRepository } from "./DB/Repositories/RoleRepository";
import { TagRepository } from "./DB/Repositories/TagRepository";
import { ProductReviewsRepository } from "./DB/Repositories/ProductReviewsRepository";
import { ProductRepository } from "./DB/Repositories/ProductRepository";
import { OrderRepository } from "./DB/Repositories/OrderRepository";
import { CategoryRepository } from "./DB/Repositories/CategoryRepository";
import { products } from './routes/products'
import { orders } from './routes/orders'
import { order } from './routes/order'
import { categories } from './routes/categories'
import { tags } from './routes/tags'
import { QueueManagement } from "./QueueManagement";
import { exit } from "process";
import { ProductPictureRepository } from "./DB/Repositories/ProductPictureRepository";
import { AuthManager } from "./Auth/AuthManager";

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

export const hostName = getStringEnv('HOST', 'The HOST environment variable is not provided')
export const hostPort = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))

// Communications
export const jwtSecret = getStringEnv('JWT_SECRET', 'The Jwt secret environment variable is not provided')

// Message Broker
export const messageBrokerUsername = getStringEnv('MESSAGE_BROKER_USERNAME', 'The Message broker username environment variable is not provided')!
export const messageBrokerPassword = getStringEnv('MESSAGE_BROKER_PASSWORD', 'The Message broker password environment variable is not provided')!
export const messageBrokerType = getStringEnv('MESSAGE_BROKER_TYPE', 'The Message broker type environment variable is not provided', undefined, e => ['single', 'cluster'].includes(e ?? ''))!
export const messageBrokerManagementApiUrl = getStringEnv('MESSAGE_BROKER_MANAGEMENT_API_URL', 'The Message broker management api url environment variable is not provided', s => s.optional())
export const messageBrokerSingleUrl = getStringEnv('MESSAGE_BROKER_URL', 'The Message broker url environment variable is not provided', s => s.optional())

if ((messageBrokerType === 'single' && messageBrokerSingleUrl === undefined) || (messageBrokerType === 'cluster' && messageBrokerManagementApiUrl === undefined))
    throw new Error('Invalid environment variables is not provided for rabbitMQ cluster')

let messageBrokerUrl: string = undefined!
if (messageBrokerType === 'single')
    messageBrokerUrl = `amqp://${messageBrokerUsername}:${messageBrokerPassword}@${messageBrokerSingleUrl}`
else
    messageBrokerUrl = messageBrokerManagementApiUrl

// Stores
const sessionRedisType = getStringEnv('SESSION_REDIS_TYPE', 'The Session redis type environment variable is not provided')
const sessionRedisInitialNodeUrl = getStringEnv('SESSION_REDIS_INITIAL_NODE_URL', 'The Session redis initial node url environment variable is not provided')
const revokedTokensRedisType = getStringEnv('REVOKED_TOKENS_REDIS_TYPE', 'The Revoked tokens redis type environment variable is not provided')
const revokedTokensRedisInitialNodeUrl = getStringEnv('REVOKED_TOKENS_REDIS_INITIAL_NODE_URL', 'The Revoked tokens redis initial node url environment variable is not provided')

let sessionRedisClient: RedisClusterType<RedisDefaultModules> | RedisClientType<RedisDefaultModules> = undefined!
if (sessionRedisType === 'single')
    sessionRedisClient = createClient({ url: sessionRedisInitialNodeUrl })
else if (sessionRedisType === 'cluster')
    sessionRedisClient = createCluster({
        rootNodes: [{ url: sessionRedisInitialNodeUrl }],
        useReplicas: true
    });

let revokedTokensRedisClient: RedisClusterType<RedisDefaultModules> | RedisClientType<RedisDefaultModules> = undefined!
if (revokedTokensRedisType === 'single')
    revokedTokensRedisClient = createClient({ url: revokedTokensRedisInitialNodeUrl })
else if (revokedTokensRedisType === 'cluster')
    revokedTokensRedisClient = createCluster({
        rootNodes: [{ url: revokedTokensRedisInitialNodeUrl }],
        useReplicas: true
    });

export { sessionRedisClient, revokedTokensRedisClient }

export const dbConfig = {
    databaseName: getStringEnv('DB_DATABASE_NAME', 'The Db database name environment variable is not provided'),
    supportsTransaction: getBooleanEnv('DB_SUPPORTS_TRANSACTION', 'The Db supports transaction environment variable is not provided'),
    url: getStringEnv('DB_URL', 'The Db url environment variable is not provided'),
    auth: {
        username: getStringEnv('MONGODB_USERNAME', 'The Mongodb username environment variable is not provided'),
        password: getStringEnv('MONGODB_PASSWORD', 'The Mongodb password environment variable is not provided'),
    }
}

export const queueManagement = new QueueManagement(messageBrokerUrl, messageBrokerUsername, messageBrokerPassword, messageBrokerType as any)

async function tryAndWait(callback: CallableFunction, secondsToWaitForEachTry: number = 5) {
    let safety = 0
    while (safety <= 100) {
        safety++
        try {
            await callback()
            break;
        }
        catch (e) { console.error(e) }
        finally {
            await (() => new Promise<void>((res, rej) => {
                console.log('waiting for 5 seconds...')
                setTimeout(() => { res() }, secondsToWaitForEachTry * 1000)
            }))()
        }
    }

    if (safety > 100) {
        console.log('safety reached!!')
        exit(1)
    }
}

(async () => {
    await tryAndWait(async () => {
        await MongoDB.getDbInstance().initializeDb();
    })

    await tryAndWait(async () => await queueManagement.subscribeConsumers(messageBrokerUrl))

    const app = express()

    app.disable('x-powered-by')

    app.use((req, res, next) => {
        console.log('hit: ' + req.originalUrl + req.path)
        next()
    })

    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Method', '*')
        res.header('Access-Control-Allow-Headers', '*,authorization,Authorization')

        if (req.method === 'OPTIONS')
            res.sendStatus(204)
        else
            next()
    });

    // To Do: Add rate limiter middleware

    app.use(express.json())

    app.use('/products', products)
    app.use('/orders', orders)
    app.use('/order', order)
    app.use('/categories', categories)
    app.use('/tags', tags)

    app.all('*', (req, res) => {
        res.sendStatus(404)
    })

    app.listen(hostPort, hostName, () => console.log(`listening on ${hostName}:${hostPort}...`))
})()
