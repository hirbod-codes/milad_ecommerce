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
import { exit } from "process";

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

export const hostName = getStringEnv('HOST', 'The HOST environment variable is not provided')
export const hostPort = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))

export const jwtSecret = getStringEnv('JWT_SECRET', 'The Jwt secret environment variable is not provided')

export const accessTokenExpiresIn = getIntegerEnv('ACCESS_TOKEN_EXPIRES_IN', 'The Access token expires in environment variable is not provided')

export const refreshTokenExpiresIn = getIntegerEnv('REFRESH_TOKEN_EXPIRES_IN', 'The Refresh token expires in environment variable is not provided')

export const authManager = new AuthManager(jwtSecret, 'HS512', accessTokenExpiresIn, refreshTokenExpiresIn)

export const otpProviderConfig = {
    otpProviderUsername: getStringEnv('OTP_PROVIDER_USERNAME', 'The Otp provider username environment variable is not provided'),
    otpProviderPassword: getStringEnv('OTP_PROVIDER_PASSWORD', 'The Otp provider password environment variable is not provided'),
    otpProviderSenderNumber: getStringEnv('OTP_PROVIDER_SENDER_NUMBER', 'The Otp provider sender number environment variable is not provided')
}

export const emailConfig = {
    user: getStringEnv('EMAIL', 'The Email environment variable is not provided'),
    pass: getStringEnv('EMAIL_PASSWORD', 'The Email password environment variable is not provided'),
}

export const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
    }
})

export const googleOAuth2Config = {
    clientId: getStringEnv('GOOGLE_CLIENT_ID', 'The Google client environment variable is not provided'),
    clientSecret: getStringEnv('GOOGLE_CLIENT_SECRET', 'The Google client secret environment variable is not provided'),
}

// Stores
const redisType = getStringEnv('REDIS_TYPE', 'The Redis type environment variable is not provided')
const redisInitialNodeUrl = getStringEnv('REDIS_INITIAL_NODE_URL', 'The Redis initial node url environment variable is not provided')

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
    let safety = 0
    while (safety <= 100) {
        safety++
        try {
            await db.initializeDb();
            userRepository = new UserRepository(await db.getUserCollection())
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

    if (safety > 100) {
        console.log('safety reached!!')
        exit(1)
        return
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
