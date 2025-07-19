import express from "express";
import dotenv from "dotenv";
import { getStringEnv, getIntegerEnv } from "../../API/src/helpers"
import { runCronJobs } from "./cronJobs";
import { MongoDB } from "../../API/src/DB/mongodb";
import { collectionName as failedProductSaleRangeCollectionName } from "./DB/Models/FailedProductSaleRange";
import { collectionName as zScoreMaintainerOptionsCollectionName } from "./DB/Models/zScoreMaintainerOptions";

console.log('running...');

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

export const isProduction = getStringEnv('NODE_ENV', 'The Node env environment variable is not provided')! === 'production'

export const hostName = getStringEnv('HOST', 'The HOST environment variable is not provided')
export const hostPort = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))

export const appMode = getStringEnv('APP_MODE', 'The APP_MODE environment variable is not provided', (s) => s.oneOf(['master', 'slave']));

(async () => {
    const db = await MongoDB.getDbInstance().getDb()

    if ((await db.collections()).find(f => f.collectionName === failedProductSaleRangeCollectionName) === undefined)
        await db.createCollection(failedProductSaleRangeCollectionName)

    if ((await db.collections()).find(f => f.collectionName === zScoreMaintainerOptionsCollectionName) === undefined)
        await db.createCollection(zScoreMaintainerOptionsCollectionName)

    const app = express()

    app.disable('x-powered-by')

    app.use(express.json())

    app.all('*', (req, res) => {
        res.sendStatus(404)
    })

    app.listen(hostPort, hostName, () => console.log(`listening on ${hostName}:${hostPort}...`))

    if (appMode === 'master')
        runCronJobs()
})()
