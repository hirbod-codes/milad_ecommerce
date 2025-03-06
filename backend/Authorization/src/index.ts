import dotenv from "dotenv";
import express from "express";
import { router } from "./router";
import { AuthManager } from "./AuthManager";
import { MongoDB } from "./DB/mongodb";
import { getBooleanEnv, getIntegerEnv, getStringEnv } from "./helpers";
import { schedule } from "node-cron";
import { DateTime } from "luxon";
import cors from "cors";

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

const host = getStringEnv('HOST', 'The HOST environment variable is not provided')
const port = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))
const jwtSecret = getStringEnv('JWT_SECRET', 'The Jwt secret environment variable is not provided')

export const accessTokenExpiresIn = getIntegerEnv('ACCESS_TOKEN_EXPIRES_IN', 'The Access token expires in environment variable is not provided')

export const refreshTokenExpiresIn = getIntegerEnv('REFRESH_TOKEN_EXPIRES_IN', 'The Refresh token expires in environment variable is not provided')

export const authManager = new AuthManager(jwtSecret, 'HS512', accessTokenExpiresIn, refreshTokenExpiresIn)

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

(async () => {
    while (true) {
        try {
            await db.initializeDb();
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

    app.listen(port, host, () => console.log(`listening on ${host}:${port}...`))

    const scheduleCallback = async () => {
        console.log('running scheduled task...')

        let dt = DateTime.utc()

        console.log('\n' + dt.toString() + '\n')

        let r = await (await db.getRefreshTokensCollection()).deleteMany({ expiresAt: { $lte: dt.toUnixInteger() } })

        console.log('scheduled task result', r)
    }

    schedule('0 0 0 * * *', scheduleCallback, { name: 'expired_tokens_cleaner', runOnInit: true, timezone: 'UTC' })

})()
