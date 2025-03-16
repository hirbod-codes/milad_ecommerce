import express, { Response, Request, NextFunction } from "express";
import dotenv from "dotenv";
import { getBooleanEnv, getIntegerEnv, getStringEnv } from "./helpers";
import cors from "cors";
import { createClient, createCluster, RedisClientType, RedisClusterType, RedisDefaultModules } from "redis";
import { MongoDB } from "./DB/mongodb";
import { UserRepository } from "./DB/Repositories/UserRepository";
import { RoleRepository } from "./DB/Repositories/RoleRepository";
import { TagRepository } from "./DB/Repositories/TagRepository";
import { ProductReviewsRepository } from "./DB/Repositories/ProductReviewsRepository";
import { ProductRepository } from "./DB/Repositories/ProductRepository";
import { OrderRepository } from "./DB/Repositories/OrderRepository";
import { CategoryRepository } from "./DB/Repositories/CategoryRepository";
import { PrivilegeRepository } from "./DB/Repositories/PrivilegeRepository";
import { products } from './routes/products'
import { orders } from './routes/orders'
import { categories } from './routes/categories'
import { tags } from './routes/tags'
import { RevokedAccessTokenManager } from "./RevokedAccessTokens/RevokedAccessTokenManager";
import Jwt from 'jsonwebtoken'
import { QueueManagement } from "./QueueManagement";

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

export const hostName = getStringEnv('HOST', 'The HOST environment variable is not provided')
export const hostPort = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))

// Communications
export const jwtSecret = getStringEnv('JWT_SECRET', 'The Jwt secret environment variable is not provided')

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

export const db = new MongoDB(dbConfig)

export let userRepository: UserRepository = undefined!
export let categoryRepository: CategoryRepository = undefined!
export let orderRepository: OrderRepository = undefined!
export let privilegeRepository: PrivilegeRepository = undefined!
export let productRepository: ProductRepository = undefined!
export let productReviewsRepository: ProductReviewsRepository = undefined!
export let roleRepository: RoleRepository = undefined!
export let tagRepository: TagRepository = undefined!;

(async () => {
    while (true) {
        try {
            await db.initializeDb();
            userRepository = new UserRepository(await db.getUserCollection())
            categoryRepository = new CategoryRepository(await db.getCategoryCollection())
            orderRepository = new OrderRepository(await db.getOrderCollection())
            privilegeRepository = new PrivilegeRepository(await db.getPrivilegeCollection())
            productRepository = new ProductRepository(await db.getProductCollection())
            productReviewsRepository = new ProductReviewsRepository(await db.getProductReviewsCollection())
            roleRepository = new RoleRepository(await db.getRoleCollection())
            tagRepository = new TagRepository(await db.getTagCollection())
            break;
        }
        catch (e) { console.error(e) }
        finally {
            await (() => new Promise<void>((res, rej) => {
                console.log('waiting for 5 seconds...')
                setTimeout(() => { res() }, 5000)
            }))()
        }
    }

    await QueueManagement.subscribeConsumers()

    const app = express()

    app.disable('x-powered-by')

    app.use((req, res, next) => {
        console.log('hit!')
        next()
    })

    app.use(cors({
        origin: '*',
        methods: ['*'],
        allowedHeaders: ['*'],
        credentials: true,
    }));

    // To Do: Add rate limiter middleware

    app.use(express.json())

    app.use('/products', products)
    app.use('/orders', orders)
    app.use('/categories', categories)
    app.use('/tags', tags)

    app.all('*', (req, res) => {
        res.sendStatus(404)
    })

    app.listen(hostPort, hostName, () => console.log(`listening on ${hostName}:${hostPort}...`))
})()
