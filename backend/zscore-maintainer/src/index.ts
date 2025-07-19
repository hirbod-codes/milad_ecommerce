import express from "express";
import dotenv from "dotenv";
import { getStringEnv, getIntegerEnv, getBooleanEnv } from "../../API/src/helpers"
import { runMasterJobs } from "./runMasterJobs";
import { MongoDB } from "../../API/src/DB/mongodb";
import { collectionName as failedProductSaleRangeCollectionName } from "./DB/Models/FailedProductSaleRange";
import { collectionName as zScoreMaintainerOptionsCollectionName } from "./DB/Models/zScoreMaintainerOptions";
import { ZScoreMaintainerOptionsRepository } from "./DB/Repositories/ZScoreMaintainerOptionsRepository";
import { boolean, number, string, object } from "yup";
import { handleRange, runSlaveJobs } from "./runSlaveJobs";

console.log('running...');

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

export const isProduction = getStringEnv('NODE_ENV', 'The Node env environment variable is not provided')! === 'production'

export const hostIp = getStringEnv('HOST', 'The HOST environment variable is not provided')
export const hostPort = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))

export const appMode = getStringEnv('APP_MODE', 'The APP_MODE environment variable is not provided', (s) => s.oneOf(['master', 'slave']));

export const dbConfig = {
    databaseName: getStringEnv('DB_DATABASE_NAME', 'The Db database name environment variable is not provided'),
    supportsTransaction: getBooleanEnv('DB_SUPPORTS_TRANSACTION', 'The Db supports transaction environment variable is not provided'),
    url: getStringEnv('DB_URL', 'The Db url environment variable is not provided'),
    auth: {
        username: getStringEnv('MONGODB_USERNAME', 'The Mongodb username environment variable is not provided'),
        password: getStringEnv('MONGODB_PASSWORD', 'The Mongodb password environment variable is not provided'),
    }
};

(async () => {
    MongoDB.config = dbConfig

    const mongodb = MongoDB.getDbInstance()

    await mongodb.reset()

    const db = await mongodb.getDb()

    if ((await db.collections()).find(f => f.collectionName === failedProductSaleRangeCollectionName) === undefined)
        await db.createCollection(failedProductSaleRangeCollectionName)

    if ((await db.collections()).find(f => f.collectionName === zScoreMaintainerOptionsCollectionName) === undefined)
        await db.createCollection(zScoreMaintainerOptionsCollectionName)

    if (appMode === 'master')
        runMaster()
    else
        runSlave()
})()

function runMaster() {
    const app = express()

    app.disable('x-powered-by')

    app.use(express.json())

    app.post('/subscribe', async (req, res) => {
        const { host, port } = req.body

        if (!string().required().isValidSync(host) || !number().required().integer().positive().isValidSync(port)) {
            res.sendStatus(400)
            return
        }

        ZScoreMaintainerOptionsRepository.getInstance()
            .then((zScoreMaintainerOptionsRepository) => {
                zScoreMaintainerOptionsRepository.getOptions()
                    .then((options) => {
                        const address = options?.addresses.find(f => f.host === host)
                        if (address === undefined || address.port !== port)
                            zScoreMaintainerOptionsRepository.pushSubscriber(host, port)
                                .then((r) => {
                                    if (r === false || !r.acknowledged)
                                        res.sendStatus(500)

                                    res.sendStatus(201)
                                })
                        else
                            res.sendStatus(201)
                    })
            })
    })

    app.all('*', (req, res) => {
        res.sendStatus(404)
    })

    app.listen(hostPort, hostIp, () => console.log(`listening on ${hostIp}:${hostPort}...`))

    runMasterJobs()
}

function runSlave() {
    const hostName = getStringEnv('HOST_NAME', 'The HOST environment variable is not provided')
    const masterHost = getStringEnv('MASTER_HOST', 'The HOST environment variable is not provided')
    const masterPort = getIntegerEnv('MASTER_PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))

    const app = express()

    app.disable('x-powered-by')

    app.use(express.json())

    app.get('/heart-beat', (req, res) => {
        res.sendStatus(200)
    })

    app.post('/calculate-z-score', (req, res) => {
        const { range, count, inclusive } = req.body

        if (
            !object().required().shape({ min: string().required(), max: string().required() }).isValidSync(range) ||
            !number().required().integer().positive().isValidSync(count) ||
            !boolean().required().isValidSync(inclusive)
        ) {
            res.sendStatus(400)
            return
        }

        res.sendStatus(200)

        handleRange(range, count, inclusive)
    })

    app.all('*', (req, res) => {
        res.sendStatus(404)
    })

    app.listen(hostPort, hostIp, () => console.log(`listening on ${hostIp}:${hostPort}...`))

    runSlaveJobs(masterHost, masterPort, hostName, hostPort)
}
