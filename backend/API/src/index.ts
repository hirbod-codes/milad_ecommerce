import express from "express";
import dotenv from "dotenv";
import pino from 'pino-http'
import { getBooleanEnv, getIntegerEnv, getStringEnv, tryAndWait } from "./helpers";
import { MongoDB } from "./DB/mongodb";
import { TagRepository } from "./DB/Repositories/TagRepository";
import { ProductReviewsRepository } from "./DB/Repositories/Products/ProductReviewsRepository";
import { ProductRepository } from "./DB/Repositories/Products/ProductRepository";
import { OrderRepository } from "./DB/Repositories/OrderRepository";
import { CategoryRepository } from "./DB/Repositories/CategoryRepository";
import { products } from './routes/products'
import { orders } from './routes/orders'
import { order } from './routes/order'
import { categories } from './routes/categories'
import { tags } from './routes/tags'
import { QueueManagement } from "./QueueManagement";
import { RevokedAccessTokenManager } from "./RevokedAccessTokens/RevokedAccessTokenManager";
import { SessionManager } from "./Session/SessionManager";
import prometheusClient from 'prom-client'
import { runCronJobs } from "./cronJobs";
import { ProductSaleRepository } from "./DB/Repositories/Products/ProductSaleRepository";

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

export const isProduction = getStringEnv('NODE_ENV', 'The Node env environment variable is not provided')! === 'production'

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
const sessionRedisType = getStringEnv('SESSION_REDIS_TYPE', 'The Session redis type environment variable is not provided', s => s.oneOf(['single', 'cluster'])) as 'single' | 'cluster'
const sessionRedisInitialNodeUrl = getStringEnv('SESSION_REDIS_INITIAL_NODE_URL', 'The Session redis initial node url environment variable is not provided')

const revokedTokensRedisType = getStringEnv('REVOKED_TOKENS_REDIS_TYPE', 'The Revoked tokens redis type environment variable is not provided', s => s.oneOf(['single', 'cluster'])) as 'single' | 'cluster'
const revokedTokensRedisInitialNodeUrl = getStringEnv('REVOKED_TOKENS_REDIS_INITIAL_NODE_URL', 'The Revoked tokens redis initial node url environment variable is not provided')

export const dbConfig = {
    databaseName: getStringEnv('DB_DATABASE_NAME', 'The Db database name environment variable is not provided'),
    supportsTransaction: getBooleanEnv('DB_SUPPORTS_TRANSACTION', 'The Db supports transaction environment variable is not provided'),
    url: getStringEnv('DB_URL', 'The Db url environment variable is not provided'),
    auth: {
        username: getStringEnv('MONGODB_USERNAME', 'The Mongodb username environment variable is not provided'),
        password: getStringEnv('MONGODB_PASSWORD', 'The Mongodb password environment variable is not provided'),
    }
}

SessionManager.initialize(sessionRedisType, sessionRedisInitialNodeUrl)
RevokedAccessTokenManager.initialize(revokedTokensRedisType, revokedTokensRedisInitialNodeUrl)

export const queueManagement = new QueueManagement(messageBrokerUrl, messageBrokerUsername, messageBrokerPassword, messageBrokerType as any);

(async () => {
    await tryAndWait(async () => {
        // if (!isProduction)
        //     await MongoDB.getDbInstance().dropAllCollections()

        await MongoDB.getDbInstance().initializeDb();

        if (isProduction !== true) {
            console.time('seed')

            try {
                // await CategoryRepository.seed(50)
                // await TagRepository.seed(150)
                // await ProductRepository.seed(800)
                // await ProductReviewsRepository.seed()
                // await OrderRepository.seed(50)

                // await ProductSaleRepository.seed()

                console.timeEnd('seed')
            } catch (e) {
                console.timeEnd('seed')
                throw e
            }
        }
    })

    await tryAndWait(async () => await queueManagement.subscribeConsumers(messageBrokerUrl))

    const collectDefaultMetrics = prometheusClient.collectDefaultMetrics;
    collectDefaultMetrics();

    const app = express()

    app.disable('x-powered-by')

    app.use(pino())

    if (isProduction !== true)
        app.use((req, res, next) => {
            // To simulate slow connections
            setTimeout(() => {
                next()
            }, 4000 * Math.random())
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

    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', prometheusClient.register.contentType);
        res.end(await prometheusClient.register.metrics());
    });

    app.use('/products', products)
    app.use('/orders', orders)
    app.use('/me/orders', order)
    app.use('/categories', categories)
    app.use('/tags', tags)

    app.get('/languages', (req, res) => {
        res.json(['fa', 'en'])
    })

    app.all('*', (req, res) => {
        res.sendStatus(404)
    })

    app.listen(hostPort, hostName, () => console.log(`listening on ${hostName}:${hostPort}...`))

    runCronJobs()
})()
