import express from "express";
import dotenv from "dotenv";
import { runMasterJobs } from "./runMasterJobs";
import { ZScoreMaintainerOptionsRepository } from "./DB/Repositories/ZScoreMaintainerOptionsRepository";
import { boolean, number, string } from "yup";
import { runSlaveJobs } from "./runSlaveJobs";
import { getBooleanEnv, getIntegerEnv, getStringEnv, httpRequest, tryAndWait } from "@monorepo/utils";
import { MongoDB } from "@monorepo/mongodb";
import { productSaleRangeInputSchema } from "./DB/Models/ProductSaleRange";
import { ProductSaleRangeRepository } from "./DB/Repositories/ProductSaleRangeRepository";
import { ProductRepository } from "./DB/Repositories/ProductRepository";
import { ProductSaleRepository } from "./DB/Repositories/ProductSaleRepository";
import { ProductStatisticsRepository } from "./DB/Repositories/ProductStatisticsRepository";
import { DateTime } from "luxon";
import { ObjectId } from "mongodb";
import { ProductViewRangeRepository } from "./DB/Repositories/ProductViewRangeRepository";
import { FailedProductSaleRangeRepository } from "./DB/Repositories/FailedProductSaleRangeRepository";

console.log('running...');

dotenv.config({ debug: process.env.DEBUG !== undefined ? Boolean(process.env.DEBUG) : undefined })

export const isProduction = getStringEnv('NODE_ENV', 'The Node env environment variable is not provided')! === 'production'

export const hostIp = getStringEnv('HOST', 'The HOST environment variable is not provided')
export const hostPort = getIntegerEnv('PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))

export const apiHost = getStringEnv('API_HOST', 'The HOST environment variable is not provided')
export const apiPort = getIntegerEnv('API_PORT', 'The PORT environment variable is not provided', (s) => s.min(1025))

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
    if (!await tryAndWait(async () => {
        const result = await httpRequest({ method: 'get', port: apiPort, host: apiHost, path: '/is_seeding' })
        if (result.response.statusCode === 200 && boolean().isValidSync(result.data) && boolean().cast(result.data) === false)
            return
        else
            throw new Error('Authorization service has not finished seeding.')
    }))
        throw new Error('Failed to communicate to authorization service.')

    await tryAndWait(async () => {
        MongoDB.config = dbConfig

        const db = MongoDB.getDbInstance()

        await db.reset();

        db.addRepository(new ZScoreMaintainerOptionsRepository())
        db.addRepository(new FailedProductSaleRangeRepository())
        db.addRepository(new ProductViewRangeRepository())
        db.addRepository(new ProductSaleRangeRepository())
        db.addRepository(new ProductStatisticsRepository())

        if (!isProduction)
            await MongoDB.getDbInstance().dropSeedableCollections()

        await db.createCollections()

        if (!isProduction)
            await db.seedCollections()
    })

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

        (new ZScoreMaintainerOptionsRepository()).getOptions()
            .then((options) => {
                const address = options?.addresses.find(f => f.host === host)
                if (address === undefined || address.port !== port)
                    (new ZScoreMaintainerOptionsRepository()).pushSubscriber(host, port)
                        .then((r) => {
                            if (r === false || !r.acknowledged)
                                res.sendStatus(500)
                            else
                                res.sendStatus(204)
                        })
                else
                    res.sendStatus(200)
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
        const { min, max, count, duration } = req.body

        if (!productSaleRangeInputSchema.isValidSync({ min, max, count, duration })) {
            res.sendStatus(400)
            return
        }

        res.sendStatus(200)

        handleRange({ min, max }, count, duration)
    })

    app.all('*', (req, res) => {
        res.sendStatus(404)
    })

    app.listen(hostPort, hostIp, () => console.log(`listening on ${hostIp}:${hostPort}...`))

    runSlaveJobs(masterHost, masterPort, hostName, hostPort)
}

async function handleRange({ max, min }: { min: string, max: string }, count: number, duration: number) {
    try {
        const mongodb = MongoDB.getDbInstance()
        const productRepository = new ProductRepository()
        const productSaleRepository = new ProductSaleRepository()
        const productStatisticsRepository = new ProductStatisticsRepository()
        const productSaleRangeRepository = new ProductSaleRangeRepository()

        const minId = ObjectId.createFromHexString(min)
        const maxId = ObjectId.createFromHexString(max)

        let i = minId
        const limit = 1000
        while (i < maxId) {
            const fetchedProductSales = await productSaleRepository.getProductSales(limit, i.toString(), max, true)
            if (fetchedProductSales.length === 0)
                break

            //                               id   quantity
            const groupedProductSales: Map<string, number> = new Map()
            for (const p of fetchedProductSales)
                groupedProductSales.set(p._id.toString(), (groupedProductSales.get(p._id.toString()) ?? 0) + p.metadata.quantity)

            try {
                await mongodb.startTransaction()

                for (const [k, v] of groupedProductSales.entries()) {
                    const updateCountResult = await productStatisticsRepository.updateSaleCount(k, DateTime.utc().toUnixInteger(), v)
                    if (updateCountResult === false || !updateCountResult.weeklyResult.acknowledged || !updateCountResult.monthlyResult.acknowledged || !updateCountResult.yearlyResult.acknowledged)
                        throw new Error('Failed to update product statistics document')

                    const updateZScoreResult = await productStatisticsRepository.updateSaleZScore(k, DateTime.utc().toUnixInteger(), v)
                    if (updateZScoreResult === false)
                        throw new Error('Failed to update product statistics document')

                    const updateImmutablesResult = await productRepository.updateImmutables(k, { weeklyOrderZScore: updateZScoreResult.weeklyZScore, monthlyOrderZScore: updateZScoreResult.monthlyZScore, yearlyOrderZScore: updateZScoreResult.yearlyZScore })
                    if (updateImmutablesResult === false || !updateImmutablesResult.acknowledged || updateImmutablesResult.matchedCount !== 1)
                        throw new Error('Failed to update product document')
                }

                const result = await productSaleRangeRepository.processed({ min, max, count, duration }, i.toString())
                if (result === false || !result.acknowledged || result.matchedCount !== 1)
                    throw new Error('Failed to update product statistics document')

                await mongodb.commitTransaction()
            } catch (e) {
                console.error(e)
                await mongodb.abortTransaction()
            }

            i = ObjectId.createFromHexString(fetchedProductSales[fetchedProductSales.length - 1]._id.toString())
        }
    } catch (e) {
        console.error(e)
    }
}
