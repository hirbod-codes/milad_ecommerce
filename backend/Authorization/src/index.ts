import dotenv from "dotenv";
import express from "express";
import { AuthManager } from "./AuthManager";
import { MongoDB } from "./DB/mongodb";
import { getBooleanEnv, getIntegerEnv, getStringEnv } from "./helpers";
import cors from "cors";
import { createClient, createCluster, RedisClientType, RedisClusterType, RedisDefaultModules } from "redis";
import nodemailer from "nodemailer";
import { UserRepository } from "./DB/Repositories/UserRepository";

import { tokenRouter } from "./routes/Auth/tokens";
import { emailRouter } from "./routes/Auth/email";
import { phoneNumberRouter } from "./routes/Auth/phoneNumber";
import { oauthGoogleRouter } from "./routes/oauth/google";

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

export const hostName = getStringEnv('HOST', 'The HOST environment variable is not provided')
export const hostPort = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))

export const jwtSecret = getStringEnv('JWT_SECRET', 'The Jwt secret environment variable is not provided')

export const accessTokenExpiresIn = getIntegerEnv('ACCESS_TOKEN_EXPIRES_IN', 'The Access token expires in environment variable is not provided')

export const refreshTokenExpiresIn = getIntegerEnv('REFRESH_TOKEN_EXPIRES_IN', 'The Refresh token expires in environment variable is not provided')

export const authManager = new AuthManager(jwtSecret, 'HS512', accessTokenExpiresIn, refreshTokenExpiresIn)

export const otpProviderConfig = {
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
        username: getStringEnv('DB_AUTH_USERNAME'),
        password: getStringEnv('DB_AUTH_PASSWORD'),
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

    const app = express()

    app.disable('x-powered-by')

    app.use(cors({
        origin: '*',
        methods: ['*'],
        allowedHeaders: ['*'],
        credentials: true,
    }));

    // To Do: Add rate limiter middleware

    app.use(express.json())

    app.use('/auth/tokens', tokenRouter)
    app.use('/auth/email', emailRouter)
    app.use('/auth/phone-number', phoneNumberRouter)

    app.use('/oauth/google', oauthGoogleRouter)

    app.all('*', (req, res) => {
        console.log('Not Found')
        res.sendStatus(404)
    })

    app.listen(hostPort, hostName, () => console.log(`listening on ${hostName}:${hostPort}...`))
})()
