import dotenv from "dotenv";
import express from "express";
import pino from 'pino-http'
import { MongoDB } from "./DB/mongodb";
import { getBooleanEnv, getIntegerEnv, getStringEnv, tryAndWait } from "./helpers";
import nodemailer from "nodemailer";
import { UserRepository } from "./DB/Repositories/UserRepository";
import { RoleRepository } from "./DB/Repositories/RoleRepository";
import { PrivilegeRepository } from "./DB/Repositories/PrivilegeRepository";
import { tokenRouter } from "./routes/Auth/tokens";
import { emailRouter } from "./routes/Auth/email";
import { phoneNumberRouter } from "./routes/Auth/phoneNumber";
import { oauthGoogleRouter } from "./routes/oauth/google";
import { exit } from "process";
import { QueueManagement } from "./QueueManagement";
import { users } from "./routes/users";
import { user } from "./routes/user";
import { roles } from "./routes/roles";
import { privileges } from "./routes/privileges";
import cookieParser from "cookie-parser";
import { SessionManager } from "./DB/Session/SessionManager";
import { RevokedAccessTokenManager } from "./RevokedAccessTokens/RevokedAccessTokenManager";

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

export const isProduction = getStringEnv('NODE_ENV', 'The Node env environment variable is not provided')! === 'production'

export const hostName = getStringEnv('HOST', 'The HOST environment variable is not provided')!
export const hostPort = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))!

export const adminUsername = getStringEnv('ADMIN_USERNAME', 'The Admin username environment variable is not provided')!
export const adminPhoneNumber = getStringEnv('ADMIN_PHONE_NUMBER', 'The Admin phone number environment variable is not provided')!
export const adminEmail = getStringEnv('ADMIN_EMAIL', 'The Admin email environment variable is not provided')!
export const adminPassword = getStringEnv('ADMIN_PASSWORD', 'The Admin password environment variable is not provided')!

export const allowedOrigins = getStringEnv('ALLOWED_ORIGINS', 'The Allowed origins environment variable is not provided')!
export const jwtSecret = getStringEnv('JWT_SECRET', 'The Jwt secret environment variable is not provided')!

export const accessTokenExpiresIn = getIntegerEnv('ACCESS_TOKEN_EXPIRES_IN', 'The Access token expires in environment variable is not provided')!

export const refreshTokenExpiresIn = getIntegerEnv('REFRESH_TOKEN_EXPIRES_IN', 'The Refresh token expires in environment variable is not provided')!

export const otpProviderConfig = {
    otpProviderUsername: getStringEnv('OTP_PROVIDER_USERNAME', 'The Otp provider username environment variable is not provided')!,
    otpProviderPassword: getStringEnv('OTP_PROVIDER_PASSWORD', 'The Otp provider password environment variable is not provided')!,
    otpProviderSenderNumber: getStringEnv('OTP_PROVIDER_SENDER_NUMBER', 'The Otp provider sender number environment variable is not provided')!
}

export const emailConfig = {
    user: getStringEnv('EMAIL', 'The Email environment variable is not provided')!,
    pass: getStringEnv('EMAIL_PASSWORD', 'The Email password environment variable is not provided')!,
}

export const googleOAuth2Config = {
    clientId: getStringEnv('GOOGLE_CLIENT_ID', 'The Google client environment variable is not provided')!,
    clientSecret: getStringEnv('GOOGLE_CLIENT_SECRET', 'The Google client secret environment variable is not provided')!,
}

// Message Broker
export const messageBrokerUsername = getStringEnv('MESSAGE_BROKER_USERNAME', 'The Message broker username environment variable is not provided')!
export const messageBrokerPassword = getStringEnv('MESSAGE_BROKER_PASSWORD', 'The Message broker password environment variable is not provided')!
export const messageBrokerType = getStringEnv('MESSAGE_BROKER_TYPE', 'The Message broker type environment variable is not provided', undefined, e => ['single', 'cluster'].includes(e ?? ''))!
export const messageBrokerManagementApiUrl = getStringEnv('MESSAGE_BROKER_MANAGEMENT_API_URL', 'The Message broker management api url environment variable is not provided', s => s.optional())
export const messageBrokerSingleUrl = getStringEnv('MESSAGE_BROKER_URL', 'The Message broker url environment variable is not provided', s => s.optional())

if ((messageBrokerType === 'single' && messageBrokerSingleUrl === undefined) || (messageBrokerType === 'cluster' && messageBrokerManagementApiUrl === undefined))
    throw new Error('Invalid environment variables is provided for rabbitMQ cluster')

let messageBrokerUrl: string = undefined!
if (messageBrokerType === 'single')
    messageBrokerUrl = `amqp://${messageBrokerUsername}:${messageBrokerPassword}@${messageBrokerSingleUrl}`
else
    messageBrokerUrl = messageBrokerManagementApiUrl!

// Stores
const sessionRedisType = getStringEnv('SESSION_REDIS_TYPE', 'The Session redis type environment variable is not provided', s => s.oneOf(['single', 'cluster']))! as 'single' | 'cluster'
const sessionRedisInitialNodeUrl = getStringEnv('SESSION_REDIS_INITIAL_NODE_URL', 'The Session redis initial node url environment variable is not provided')!
const revokedTokensRedisType = getStringEnv('REVOKED_TOKENS_REDIS_TYPE', 'The Revoked tokens redis type environment variable is not provided', s => s.oneOf(['single', 'cluster']))! as 'single' | 'cluster'
const revokedTokensRedisInitialNodeUrl = getStringEnv('REVOKED_TOKENS_REDIS_INITIAL_NODE_URL', 'The Revoked tokens redis initial node url environment variable is not provided')!

export const dbConfig = {
    databaseName: getStringEnv('DB_DATABASE_NAME', 'The Db database name environment variable is not provided')!,
    supportsTransaction: getBooleanEnv('DB_SUPPORTS_TRANSACTION', 'The Db supports transaction environment variable is not provided')!,
    url: getStringEnv('DB_URL', 'The Db url environment variable is not provided')!,
    auth: {
        username: getStringEnv('MONGODB_USERNAME', 'The Mongodb username environment variable is not provided')!,
        password: getStringEnv('MONGODB_PASSWORD', 'The Mongodb password environment variable is not provided')!,
    }
}

export const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
    }
})

SessionManager.initialize(sessionRedisType, sessionRedisInitialNodeUrl)
RevokedAccessTokenManager.initialize(revokedTokensRedisType, revokedTokensRedisInitialNodeUrl)

export const queueManagement = new QueueManagement(messageBrokerUrl, messageBrokerUsername, messageBrokerPassword, messageBrokerType as any);

(async () => {
    if (!await tryAndWait(async () => {
        if (!isProduction)
            await MongoDB.getDbInstance().dropAllCollections()

        await MongoDB.getDbInstance().initializeDb();
    }))
        exit(1)

    if (!await tryAndWait(async () => await queueManagement.subscribeConsumers(messageBrokerUrl)))
        exit(1)

    if (!await tryAndWait(async () => {
        await UserRepository.initialize(adminUsername, adminPhoneNumber, adminEmail, adminPassword)
        await PrivilegeRepository.initialize()
        await RoleRepository.initialize()

        if (isProduction !== true) {
            await RoleRepository.seed()
            await UserRepository.seed()
        }
    }))
        exit(1)

    const app = express()

    app.disable('x-powered-by')

    app.use(pino())

    if (isProduction !== true)
        app.use((req, res, next) => {
            // To simulate slow connections
            setTimeout(() => {
                next()
            }, 2000)
        })

    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', allowedOrigins)
        res.header('Access-Control-Allow-Method', 'GET,HEAD,POST,PATCH,DELETE,OPTIONS')
        res.header('Access-Control-Allow-Headers', 'authorization,content-type,content-length,accept')
        res.header('Access-Control-Allow-Credentials', 'true')

        if (req.method === 'OPTIONS')
            res.sendStatus(204)
        else
            next()
    });

    // To Do: Add rate limiter middleware

    app.use(express.json())
    app.use(cookieParser())

    app.use('/auth/tokens', tokenRouter)
    app.use('/auth/email', emailRouter)
    app.use('/auth/phone-number', phoneNumberRouter)

    app.use('/oauth/google', oauthGoogleRouter)

    app.use('/users', users)
    app.use('/user', user)

    app.use('/roles', roles)

    app.use('/privileges', privileges)

    app.all('*', (req, res) => {
        console.log('Not Found')
        res.sendStatus(404)
    })

    app.listen(hostPort, hostName, () => console.log(`listening on ${hostName}:${hostPort}...`))
})()
