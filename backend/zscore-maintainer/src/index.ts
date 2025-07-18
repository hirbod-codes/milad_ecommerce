import express from "express";
import dotenv from "dotenv";
import { getStringEnv, getIntegerEnv } from "../../API/src/helpers"
import { runCronJobs } from "./cronJobs";
import { mixed } from "yup";

console.log('running...');

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

export const isProduction = getStringEnv('NODE_ENV', 'The Node env environment variable is not provided')! === 'production'

export const hostName = getStringEnv('HOST', 'The HOST environment variable is not provided')
export const hostPort = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))

export const appMode = getStringEnv('APP_MODE', 'The APP_MODE environment variable is not provided', (s) => s.oneOf(['master', 'slave']))

const app = express()

app.disable('x-powered-by')

app.use(express.json())

app.all('*', (req, res) => {
    res.sendStatus(404)
})

app.listen(hostPort, hostName, () => console.log(`listening on ${hostName}:${hostPort}...`))

if (appMode === 'master')
    runCronJobs()
