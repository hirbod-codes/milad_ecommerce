import express from "express";
import dotenv from "dotenv";
import pino from 'pino-http'
import { getBooleanEnv, getIntegerEnv, getStringEnv, httpRequest, httpsRequest, tryAndWait } from "@monorepo/utils";
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
import { ProductSaleRepository } from "./DB/Repositories/Products/ProductSaleRepository";
import { MongoDB } from "@monorepo/mongodb";
import { ProductPictureRepository } from "./DB/Repositories/Products/ProductPictureRepository";
import { ProductStatisticsRepository } from "./DB/Repositories/Products/ProductStatisticsRepository";
import { ProductViewRepository } from "./DB/Repositories/Products/ProductViewRepository";
import { UserRepository } from "./DB/Repositories/UserRepository";
import { RoleRepository } from "./DB/Repositories/RoleRepository";
import { boolean } from "yup";


console.log('running...');

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

export const isProduction = getStringEnv('NODE_ENV', 'The Node env environment variable is not provided')! === 'production'

export const hostName = getStringEnv('HOST', 'The HOST environment variable is not provided')
export const hostPort = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))


// Communications
export const jwtSecret = getStringEnv('JWT_SECRET', 'The Jwt secret environment variable is not provided')
export const allowedOrigins = getStringEnv('ALLOWED_ORIGINS', 'The Allowed origins environment variable is not provided')!

// Message Broker
export const messageBrokerUsername = getStringEnv('MESSAGE_BROKER_USERNAME', 'The Message broker username environment variable is not provided')!
export const messageBrokerPassword = getStringEnv('MESSAGE_BROKER_PASSWORD', 'The Message broker password environment variable is not provided')!
export const messageBrokerType = getStringEnv('MESSAGE_BROKER_TYPE', 'The Message broker type environment variable is not provided', undefined, e => ['single', 'cluster'].includes(e ?? ''))!
export const messageBrokerManagementApiUrl = getStringEnv('MESSAGE_BROKER_MANAGEMENT_API_URL', 'The Message broker management api url environment variable is not provided', s => s.optional())
export const messageBrokerSingleUrl = getStringEnv('MESSAGE_BROKER_SINGLE_URL', 'The Message broker url environment variable is not provided', s => s.optional())

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
    if (!await tryAndWait(async () => {
        const result = await httpRequest({ method: 'get', port: 3000, host: 'localhost', path: '/is_seeding' })
        if (result.response.statusCode === 200 && boolean().isValidSync(result.data) && boolean().cast(result.data) === false)
            return
        else
            throw new Error('Authorization service has not finished seeding.')
    }))
        throw new Error('Failed to communicate to authorization service.')

    if (!await tryAndWait(async () => {
        MongoDB.config = dbConfig

        const db = MongoDB.getDbInstance()

        await db.reset();

        db.addRepository(new CategoryRepository())
        db.addRepository(new TagRepository())
        db.addRepository(new ProductRepository())
        db.addRepository(new OrderRepository())
        db.addRepository(new ProductReviewsRepository())
        db.addRepository(new ProductSaleRepository())
        db.addRepository(new ProductViewRepository())
        db.addRepository(new ProductPictureRepository())
        db.addRepository(new ProductStatisticsRepository())
        db.addRepository(new UserRepository())
        db.addRepository(new RoleRepository())

        if (!isProduction)
            await MongoDB.getDbInstance().dropSeedableCollections()

        await db.createCollections()

        if (!isProduction)
            await db.seedCollections()
    }))
        throw new Error('Failed to prepare database.')

    if (!await tryAndWait(async () => await queueManagement.subscribeConsumers(messageBrokerUrl)))
        throw new Error('Failed to subscribe to message broker.')

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
        res.header('Access-Control-Allow-Origin', allowedOrigins)
        res.header('Access-Control-Allow-Credentials', 'true')
        res.header('Access-Control-Allow-Method', '*')
        res.header('Access-Control-Allow-Headers', '*,authorization,Authorization')

        if (req.method === 'OPTIONS')
            res.sendStatus(204)
        else
            next()
    });

    // To Do: Add rate limiter middleware

    app.use(express.json())

    if (!isProduction)
        app.get('/is_seeding', (req, res) => {
            res.status(200).json(MongoDB.isSeeding())
        })

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
})()
