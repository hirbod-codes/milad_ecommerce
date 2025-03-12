import dotenv from "dotenv";
import express from "express";
import { createClient, createCluster, RedisClientType, RedisClusterType, RedisDefaultModules } from "redis";
import { MongoDB } from "./DB/mongodb";
import { router } from "./router";
import { getBooleanEnv, getIntegerEnv, getStringEnv } from "./helpers";
import { UserRepository } from "./DB/Repositories/UserRepository";
import cors from "cors";

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

export const hostName = getStringEnv('HOST', 'The HOST environment variable is not provided')
export const hostPort = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))

// Communications
export const jwtSecret = getStringEnv('JWT_SECRET', 'The Jwt secret environment variable is not provided')

// Stores
const redisType = getStringEnv('REDIS_TYPE', 'The Redis type environment variable is not provided')
const redisInitialNodeUrl = getStringEnv('REDIS_INITIAL_NODE_URL', 'The Redis initial node url environment variable is not provided')

let sessionRedisClient: RedisClusterType<RedisDefaultModules> | RedisClientType<RedisDefaultModules> = undefined!
if (redisType === 'single')
    sessionRedisClient = createClient({ url: redisInitialNodeUrl })
else if (redisType === 'cluster')
    sessionRedisClient = createCluster({
        rootNodes: [{ url: redisInitialNodeUrl }],
        useReplicas: true
    });

export { redisClient }

export { sessionRedisClient }

export const dbConfig = {
    databaseName: getStringEnv('DB_DATABASE_NAME', 'The Db database name environment variable is not provided'),
    supportsTransaction: getBooleanEnv('DB_SUPPORTS_TRANSACTION', 'The Db supports transaction environment variable is not provided'),
    url: getStringEnv('DB_URL', 'The Db url environment variable is not provided'),
    auth: {
        username: getStringEnv('MONGODB_USERNAME', 'The Mongodb username environment variable is not provided'),
        password: getStringEnv('MONGODB_PASSWORD', 'The Mongodb password environment variable is not provided'),
    }
}

export const db = new MongoDB(dbConfig);

export let userRepository: UserRepository = undefined!;

(async () => {
    while (true) {
        try {
            await db.initializeDb();
            userRepository = new UserRepository(await db.getUserCollection())
            break;
        }
        catch (e) { console.error(e) }
    }
})()

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

app.use(router)

app.all('*', (req, res) => {
    res.sendStatus(404)
})

app.listen(hostPort, hostName, () => console.log(`listening on ${hostName}:${hostPort}...`))
