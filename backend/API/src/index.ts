import dotenv from "dotenv";
import express from "express";
import { createClient, createCluster, RedisClientType, RedisClusterType, RedisDefaultModules } from "redis";
import { MongoDB } from "./DB/mongodb";
import { router } from "./router";
import { getBooleanEnv, getIntegerEnv, getStringEnv, httpRequest } from "./helpers";
import { UserRepository } from "./DB/Repositories/UserRepository";
import nodemailer from "nodemailer";
import cors from "cors";

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

export const hostName = getStringEnv('HOST', 'The HOST environment variable is not provided')
export const hostPort = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))

// Communications
export const jwtSecret = getStringEnv('JWT_SECRET', 'The Jwt secret environment variable is not provided')

export const OtpProviderConfig = {
    otpProviderUsername: getStringEnv('OTP_PROVIDER_USERNAME'),
    otpProviderPassword: getStringEnv('OTP_PROVIDER_PASSWORD'),
    otpProviderSenderNumber: getStringEnv('OTP_PROVIDER_SENDER_NUMBER')
}

export const emailConfig = {
    user: getStringEnv('EMAIL'),
    pass: getStringEnv('EMAIL_PASSWORD'),
}

export const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
    }
})

export const googleOAuth2Config = {
    clientId: getStringEnv('GOOGLE_CLIENT_ID'),
    clientSecret: getStringEnv('GOOGLE_CLIENT_SECRET'),
}

// Stores
const redisType = getStringEnv('REDIS_TYPE')
const redisInitialNodeUrl = getStringEnv('REDIS_INITIAL_NODE_URL')

let redisClient: RedisClusterType<RedisDefaultModules> | RedisClientType<RedisDefaultModules> = undefined!
if (redisType === 'single')
    redisClient = createClient({ url: redisInitialNodeUrl })
else if (redisType === 'cluster')
    redisClient = createCluster({
        rootNodes: [{ url: redisInitialNodeUrl }],
        useReplicas: true
    });

export { redisClient }

export const dbConfig = {
    databaseName: getStringEnv('DB_DATABASE_NAME'),
    supportsTransaction: getBooleanEnv('DB_SUPPORTS_TRANSACTION'),
    url: getStringEnv('DB_URL'),
    auth: {
        username: getStringEnv('MONGODB_USERNAME'),
        password: getStringEnv('MONGODB_PASSWORD'),
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
