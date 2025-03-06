import dotenv from "dotenv";
import express from "express";
import { router } from "./router";
import { AuthManager } from "./AuthManager";
import { MongoDB } from "./DB/mongodb";
import { getBooleanEnv, getIntegerEnv, getStringEnv } from "./helpers";
import { schedule } from "node-cron";
import { DateTime } from "luxon";
import cors from "cors";
import { createCluster } from "redis";
import nodemailer from "nodemailer";
import { UserRepository } from "./DB/Repositories/UserRepository";

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
const redisInitialNodeUrl = getStringEnv('REDIS_INITIAL_NODE_URL')

export const redisClient = createCluster({
    rootNodes: [{ url: redisInitialNodeUrl }],
    useReplicas: true
});

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

    app.use(router)

    app.all('*', (req, res) => {
        res.sendStatus(404)
    })

    app.listen(hostPort, hostName, () => console.log(`listening on ${hostName}:${hostPort}...`))

    const scheduleCallback = async () => {
        console.log('running scheduled task...')

        let dt = DateTime.utc()

        console.log('\n' + dt.toString() + '\n')

        let r = await (await db.getRefreshTokensCollection()).deleteMany({ expiresAt: { $lte: dt.toUnixInteger() } })

        console.log('scheduled task result', r)
    }

    schedule('0 0 0 * * *', scheduleCallback, { name: 'expired_tokens_cleaner', runOnInit: true, timezone: 'UTC' })

})()
