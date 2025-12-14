import { DateTime } from "luxon";
import { ClientSession, Collection, Db, DeleteResult, InsertManyResult, InsertOneResult, ObjectId, Timestamp, UpdateResult } from 'mongodb'
import { collectionName, ProductStatisticsCreate, ProductStatisticsInput, schemaVersion } from "../Models/ProductStatistics";
import { number } from "yup";
import { IRepository, MongoDB } from '@monorepo/mongodb'
import { ProductCreate, ProductImmutable } from "../Models/Product";
import { IDropable } from "@monorepo/mongodb/dist/IDropable";
import { collectionName as productCollectionName } from "../Models/Product";

export class ProductStatisticsRepository implements IDropable, IRepository {
    IRepository: 'IRepository' = 'IRepository';
    IDropable: "IDropable" = "IDropable";

    private WEEK_SECONDS = 604_800
    private MONTH_SECONDS = 2_592_000
    private YEAR_SECONDS = 31_104_000
    private session: ClientSession | undefined = undefined

    setTransactionSession(session?: ClientSession): void {
        this.session = session
    }

    unsetTransactionSession(): void {
        this.session = undefined
    }

    async addCollection(db: Db): Promise<void> {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.createCollection(collectionName)

        const indexes = await db.collection(collectionName).indexes()

        if (indexes.find(i => i.name === 'timestamp') === undefined)
            await db.createIndex(collectionName, { timestamp: -1 }, { name: 'timestamp' })

        if (indexes.find(i => i.name === 'productId') === undefined)
            await db.createIndex(collectionName, { productId: -1 }, { name: 'productId' })

        if (indexes.find(i => i.name === 'tags') === undefined)
            await db.createIndex(collectionName, { tags: 1 }, { name: 'tags' })

        if (indexes.find(i => i.name === 'categories') === undefined)
            await db.createIndex(collectionName, { categories: 1 }, { name: 'categories' })

        if (indexes.find(i => i.name === 'count') === undefined)
            await db.createIndex(collectionName, { count: -1 }, { name: 'count' })

        if (indexes.find(i => i.name === 'duration') === undefined)
            await db.createIndex(collectionName, { duration: -1 }, { name: 'duration' })

        if (indexes.find(i => i.name === 'zScore') === undefined)
            await db.createIndex(collectionName, { zScore: -1 }, { name: 'zScore' })
    }

    private async getCollection(): Promise<Collection<ProductStatisticsCreate>> {
        return (await MongoDB.getDb()).collection<ProductStatisticsCreate>(collectionName)
    }

    async dropCollection(db: Db): Promise<void> {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.dropCollection(collectionName)
    }

    async createWeekly(productStatistics: ProductStatisticsInput, now: number): Promise<InsertOneResult | false> {
        try {
            const product = await ((await MongoDB.getDb()).collection<ProductCreate>(productCollectionName)).findOne({ _id: productStatistics.productId.toString() })
            if (!product)
                throw new Error('No product was found with provided product id.')

            let p: ProductStatisticsCreate = {
                ...productStatistics,
                schemaVersion: schemaVersion,
                duration: 0,
                product,
                count: 0,
                zScore: 0,
                viewCount: 0,
                viewZScore: 0,
                timestamp: now,
            }

            let thisWeek = DateTime.fromSeconds(now).set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            while (thisWeek.weekday !== 1) {
                thisWeek = thisWeek.minus({ days: 1 })
            }

            let result = await (await this.getCollection()).insertOne(
                {
                    ...p,
                    duration: this.WEEK_SECONDS,
                    timestamp: thisWeek.toUnixInteger(),
                }
                , { session: this.session }
            )
            if (!result.acknowledged)
                throw new Error('Failed to create ProductStatistics document for weekly time period.')

            return result
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async createMonthly(productStatistics: ProductStatisticsInput, now: number): Promise<InsertOneResult | false> {
        try {
            const product = await ((await MongoDB.getDb()).collection<ProductCreate>(productCollectionName)).findOne({ _id: productStatistics.productId.toString() })
            if (!product)
                throw new Error('No product was found with provided product id.')

            let p: ProductStatisticsCreate = {
                ...productStatistics,
                schemaVersion: schemaVersion,
                duration: 0,
                product,
                count: 0,
                zScore: 0,
                viewCount: 0,
                viewZScore: 0,
                timestamp: now,
            }

            const thisMonth = DateTime.fromSeconds(now).set({ day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })

            let result = await (await this.getCollection()).insertOne(
                {
                    ...p,
                    duration: this.MONTH_SECONDS,
                    timestamp: thisMonth.toUnixInteger(),
                }
                , { session: this.session }
            )
            if (!result.acknowledged)
                throw new Error('Failed to create ProductStatistics document for weekly time period.')

            return result
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async createYearly(productStatistics: ProductStatisticsInput, now: number): Promise<InsertOneResult | false> {
        try {
            const product = await ((await MongoDB.getDb()).collection<ProductCreate>(productCollectionName)).findOne({ _id: productStatistics.productId.toString() })
            if (!product)
                throw new Error('No product was found with provided product id.')

            let p: ProductStatisticsCreate = {
                ...productStatistics,
                schemaVersion: schemaVersion,
                duration: 0,
                product,
                count: 0,
                zScore: 0,
                viewCount: 0,
                viewZScore: 0,
                timestamp: now,
            }

            const thisYear = DateTime.fromSeconds(now).set({ month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })

            let result = await (await this.getCollection()).insertOne(
                {
                    ...p,
                    duration: this.YEAR_SECONDS,
                    timestamp: thisYear.toUnixInteger(),
                }
                , { session: this.session }
            )
            if (!result.acknowledged)
                throw new Error('Failed to create ProductStatistics document for weekly time period.')

            return result
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async updateImmutables(productId: string | ObjectId, product: ProductImmutable): Promise<UpdateResult | false> {
        try {
            const updatedAt = DateTime.utc().toUnixInteger()
            const updates: any = {}
            for (const key in product) {
                if (Object.prototype.hasOwnProperty.call(product, key)) {
                    const value = (product as any)[key]
                    updates[`product.${key}`] = value
                }
            }
            if (Object.keys(updates).length === 0)
                return false

            return await (await this.getCollection()).updateMany({ productId: typeof productId === 'string' ? ObjectId.createFromHexString(productId) : productId }, { $set: { ...updates, updatedAt, 'product.updatedAt': updatedAt } }, { session: this.session })
        }
        catch (e) { console.error(e); return false }
    }

    /**
     * 
     * @param productId 
     * @param now for testing and seeding purposes, current timestamp is given at run time.
     * @param count number of sold products
     */
    async updateViewCount(productId: string, now: number, count: number): Promise<{ weeklyZScore: number, monthlyZScore: number, yearlyZScore: number } | false> {
        try {
            return {
                weeklyZScore: await this.updateWeeklySaleCount(productId, now, count, 'viewZScore', 'viewCount'),
                monthlyZScore: await this.updateMonthlySaleCount(productId, now, count, 'viewZScore', 'viewCount'),
                yearlyZScore: await this.updateYearlySaleCount(productId, now, count, 'viewZScore', 'viewCount')
            }
        } catch (e) {
            console.error(e)
            return false
        }
    }

    /**
     * 
     * @param productId 
     * @param now for testing and seeding purposes, current timestamp is given at run time.
     * @param count number of sold products
     */
    async updateSaleCount(productId: string, now: number, count: number): Promise<{ weeklyZScore: number, monthlyZScore: number, yearlyZScore: number } | false> {
        try {
            return {
                weeklyZScore: await this.updateWeeklySaleCount(productId, now, count),
                monthlyZScore: await this.updateMonthlySaleCount(productId, now, count),
                yearlyZScore: await this.updateYearlySaleCount(productId, now, count)
            }
        } catch (e) {
            console.error(e)
            return false
        }
    }

    /**
     * 
     * @param productId 
     * @param now for testing and seeding purposes, current timestamp is given at run time.
     * @param count number of sold products
     * @returns calculated z-score
     */
    async updateWeeklySaleCount(productId: string, now: number, count: number, zScoreField: string = 'zScore', countField: string = 'count'): Promise<number> {
        let thisWeek = DateTime.fromSeconds(now).set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        while (thisWeek.weekday !== 1) {
            thisWeek = thisWeek.minus({ days: 1 })
        }

        await this.createRecordsIfNotExist(productId.toString(), 'weekly', [thisWeek.minus({ weeks: 7 }).toUnixInteger(), thisWeek.minus({ weeks: 1 }).toUnixInteger()], thisWeek.toUnixInteger())

        const aggregationResult = await this.getZScoreAggregationPipeline(productId.toString(), 608_800, [thisWeek.minus({ weeks: 7 }).toUnixInteger(), thisWeek.minus({ weeks: 1 }).toUnixInteger()], thisWeek.toUnixInteger(), count, countField)

        let zScore: number | null | undefined
        if (aggregationResult && Array.isArray(aggregationResult) && aggregationResult[0]?.zScore && number().required().isValidSync(aggregationResult[0]?.zScore)) {
            zScore = number().required().cast(aggregationResult[0]?.zScore)
            if (zScore >= 20)
                console.log('aggregationResult', JSON.stringify(aggregationResult, undefined, 4))
        }

        if (!zScore)
            throw new Error('Failed to calculate weekly zScore.')

        let updateResult = await (await this.getCollection()).updateOne(
            {
                productId: ObjectId.createFromHexString(productId.toString()),
                duration: 608_800, // a week in seconds
                timestamp: thisWeek.toUnixInteger(),
            },
            {
                $inc: { count },
                $set: {
                    [zScoreField]: zScore
                },
            }
            , { session: this.session })
        if (!updateResult.acknowledged || updateResult.modifiedCount !== 1)
            throw new Error('failed to update ProductStatistics document with weekly calculated z-score')

        return zScore
    }

    /**
     * 
     * @param productId 
     * @param now for testing and seeding purposes, current timestamp is given at run time.
     * @param count number of sold products
     * @returns calculated z-score
     */
    async updateMonthlySaleCount(productId: string, now: number, count: number, zScoreField: string = 'zScore', countField: string = 'count'): Promise<number> {
        const thisMonth = DateTime.fromSeconds(now).set({ day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })

        const aggregationResult = await this.getZScoreAggregationPipeline(productId.toString(), 2_592_000, [thisMonth.minus({ months: 12 }).toUnixInteger(), thisMonth.minus({ months: 1 }).toUnixInteger()], thisMonth.toUnixInteger(), count, countField)

        let zScore: number | null | undefined
        if (aggregationResult && Array.isArray(aggregationResult) && aggregationResult[0]?.zScore && number().required().isValidSync(aggregationResult[0]?.zScore)) {
            zScore = number().required().cast(aggregationResult[0]?.zScore)
            if (zScore >= 20)
                console.log('aggregationResult', JSON.stringify(aggregationResult, undefined, 4))
        }

        if (!zScore)
            throw new Error('Failed to calculate monthly zScore.')

        let updateResult = await (await this.getCollection()).updateOne(
            {
                productId: ObjectId.createFromHexString(productId.toString()),
                duration: 2_592_000, // a month in seconds
                timestamp: thisMonth.toUnixInteger(),
            },
            {
                $inc: { count },
                $set: {
                    [zScoreField]: zScore
                },
            }
            , { session: this.session })
        if (!updateResult.acknowledged || updateResult.modifiedCount !== 1)
            throw new Error('failed to update ProductStatistics document with monthly calculated z-score')

        return zScore
    }

    /**
     * 
     * @param productId 
     * @param now for testing and seeding purposes, current timestamp is given at run time.
     * @param count number of sold products
     * @returns calculated z-score
     */
    async updateYearlySaleCount(productId: string, now: number, count: number, zScoreField: string = 'zScore', countField: string = 'count'): Promise<number> {
        const thisYear = DateTime.fromSeconds(now).set({ month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })

        const aggregationResult = await this.getZScoreAggregationPipeline(productId.toString(), 31_104_000, [thisYear.minus({ years: 7 }).toUnixInteger(), thisYear.minus({ years: 1 }).toUnixInteger()], thisYear.toUnixInteger(), count, countField)

        let zScore: number | null | undefined
        if (aggregationResult && Array.isArray(aggregationResult) && aggregationResult[0]?.zScore && number().required().isValidSync(aggregationResult[0]?.zScore)) {
            zScore = number().required().cast(aggregationResult[0]?.zScore)
            if (zScore >= 20)
                console.log('aggregationResult', JSON.stringify(aggregationResult, undefined, 4))
        }

        if (!zScore)
            throw new Error('Failed to calculate yearly zScore.')

        let updateResult = await (await this.getCollection()).updateOne(
            {
                productId: ObjectId.createFromHexString(productId.toString()),
                duration: 31_104_000, // a year in seconds
                timestamp: thisYear.toUnixInteger(),
            },
            {
                $inc: { count },
                $set: {
                    [zScoreField]: zScore
                },
            }
            , { session: this.session })
        if (!updateResult.acknowledged || updateResult.modifiedCount !== 1)
            throw new Error('failed to update ProductStatistics document with yearly calculated z-score')

        return zScore
    }

    private async createRecordsIfNotExist(productId: string, duration: 'monthly' | 'weekly' | 'yearly', period: [number, number], now: number) {
        let cursor: number = period[0]
        while (cursor < period[1]) {
            let document = (await this.getCollection()).findOne({ duration: this.WEEK_SECONDS, timestamp: cursor })
            if (document === undefined || document === null) {
                if (duration === 'weekly')
                    await this.createWeekly({ productId }, cursor)
                if (duration === 'monthly')
                    await this.createMonthly({ productId }, cursor)
                if (duration === 'yearly')
                    await this.createYearly({ productId }, cursor)
            }

            let cursorDT = DateTime.fromSeconds(now)
            if (duration === 'weekly')
                cursorDT = cursorDT.plus({ weeks: 1 })
            if (duration === 'monthly')
                cursorDT = cursorDT.plus({ months: 1 })
            if (duration === 'yearly')
                cursorDT = cursorDT.plus({ years: 1 })
            cursor = cursorDT.toUnixInteger()
        }

        let document = (await this.getCollection()).findOne({ duration: this.WEEK_SECONDS, timestamp: now })
        if (document === undefined || document === null) {
            if (duration === 'weekly')
                await this.createWeekly({ productId }, now)
            if (duration === 'monthly')
                await this.createMonthly({ productId }, now)
            if (duration === 'yearly')
                await this.createYearly({ productId }, now)
        }

    }

    private async getZScoreAggregationPipeline(productId: string, duration: number, period: [number, number], now: number, amountToAdd: number, countField: string = 'count') {
        return await (await this.getCollection()).aggregate(undefined, { allowDiskUse: true })
            .addStage({
                $facet: {
                    periods: [
                        {
                            $match: {
                                productId: ObjectId.createFromHexString(productId),
                                duration,
                                timestamp: { $gte: period[0], $lte: period[1] }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                periods: {
                                    $push: "$$ROOT"
                                },
                                mu: { $avg: `${countField}` },
                                sigma: {
                                    $stdDevSamp: `${countField}`
                                }
                            }
                        }
                    ],
                    lastPeriod: [
                        {
                            $match: {
                                productId: ObjectId.createFromHexString(productId),
                                duration,
                                timestamp: now
                            }
                        }
                    ]
                }
            })
            .addStage({
                $addFields: {
                    zScore: {
                        $cond: [
                            {
                                $eq: [
                                    {
                                        $arrayElemAt: ["$periods.sigma", 0]
                                    },
                                    0
                                ]
                            },
                            0,
                            {
                                $divide: [
                                    {
                                        $subtract: [
                                            {
                                                $cond: [
                                                    {
                                                        $cond: {
                                                            if: {
                                                                $ifNull: [
                                                                    "$lastPeriod",
                                                                    false
                                                                ]
                                                            },
                                                            then: true,
                                                            else: false
                                                        }
                                                    },
                                                    {
                                                        $sum: [
                                                            {
                                                                $arrayElemAt: [
                                                                    "$lastPeriod.count",
                                                                    0
                                                                ]
                                                            },
                                                            amountToAdd
                                                        ]
                                                    },
                                                    amountToAdd
                                                ]
                                            },
                                            {
                                                $arrayElemAt: ["$periods.mu", 0]
                                            }
                                        ]
                                    },
                                    {
                                        $arrayElemAt: ["$periods.sigma", 0]
                                    }
                                ]
                            }
                        ]
                    }
                }
            })
            .toArray()
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await (await this.getCollection()).deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
