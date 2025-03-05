import dotenv from "dotenv";
import express from "express";
import { createCluster } from "redis";
import { MongoDB } from "./DB/mongodb";
import { router } from "./router";
import { getBooleanEnv, getIntegerEnv, getStringEnv, httpRequest } from "./helpers";
import { UserRepository } from "./DB/Repositories/UserRepository";
import nodemailer from "nodemailer";

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

const host = getStringEnv('HOST', 'The HOST environment variable is not provided')
const port = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))

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
})()

const app = express()

app.disable('x-powered-by')

// To Do: Add rate limiter middleware

app.use(express.json())

app.all('/test/:id', async (req, res) => {
    try {
        console.log('received request to /test')

        console.log('params', req.params)
        console.log('query', req.query)
        console.log('body', req.body)

        let r = await httpRequest({
            hostname: 'authorization',
            port: 3000,
            path: '/generate-tokens',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        }, JSON.stringify({
            username: "hirbod1"
        }))
        console.log(r.response.statusCode)

        let data = JSON.parse(r.data)
        console.log(data)
        res.send(data)
    } catch (e) {
        console.error(e)
        res.sendStatus(500)
    }
})

app.use(router)

app.all('*', (req, res) => {
    res.sendStatus(404)
})

app.listen(port, host, () => console.log(`listening on ${host}:${port}...`))
