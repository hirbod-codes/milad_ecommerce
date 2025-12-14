import { DateTime } from "luxon";
import { ClientSession, Collection, Db, DeleteResult, InsertManyResult, ObjectId, UpdateResult } from 'mongodb'
import { schemaVersion } from "../../Models/Products/ProductSale";
import { collectionName, ProductStatistics, ProductStatisticsCreate, ProductStatisticsInput } from "../../Models/Products/ProductStatistics";
import { collectionName as productCollectionName } from "../../Models/Products/Product";
import { Product, ProductCreate, ProductImmutable, ProductUpdate } from "../../Models/Products/Product";
import { number } from "yup";
import { IRepository, MongoDB } from '@monorepo/mongodb'
import { ISeedable } from "@monorepo/mongodb/dist/ISeedable";

export class ProductStatisticsRepository implements IRepository, ISeedable {
    IRepository: 'IRepository' = 'IRepository';
    ISeedable: 'ISeedable' = 'ISeedable';

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

    async seed(count?: number): Promise<void> {
        // throw new Error("Method not implemented.");
    }

    async create(productStatistics: ProductStatisticsInput, now: number): Promise<InsertManyResult | false> {
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

            const thisMonth = DateTime.fromSeconds(now).set({ day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })

            const thisYear = DateTime.fromSeconds(now).set({ month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })

            let insertionResult = await (await this.getCollection()).insertMany(
                [
                    {
                        ...p,
                        duration: 604_800, // a week in seconds
                        timestamp: thisWeek.toUnixInteger(),
                    },
                    {
                        ...p,
                        duration: 2_592_000, // a month in seconds
                        timestamp: thisMonth.toUnixInteger(),
                    },
                    {
                        ...p,
                        duration: 31_104_000, // a year in seconds
                        timestamp: thisYear.toUnixInteger(),
                    }
                ]
                , { session: this.session })
            if (!insertionResult.acknowledged || insertionResult.insertedCount !== 3)
                throw new Error('Failed to create ProductStatistics document for weekly time period.')


            return insertionResult
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async getTrendingProducts(duration: 'monthly' | 'weekly' | 'yearly', categoryNames?: string[], tagNames?: string[], offset: number = 0, limit: number = 10): Promise<Product[] | false> {
        try {
            let durationSeconds, startTS
            switch (duration) {
                case 'weekly':
                    durationSeconds = 604_800
                    startTS = DateTime.utc().set({ hour: 0, minute: 0, second: 0 })
                    if (startTS.weekday !== 1)
                        startTS = startTS.minus({ days: startTS.weekday - 1 }).minus({ months: 1 })
                    break;
                case 'monthly':
                    durationSeconds = 2_592_000
                    startTS = DateTime.utc().set({ day: 1, hour: 0, minute: 0, second: 0 }).minus({ months: 12 })
                    break;
                case 'yearly':
                    durationSeconds = 31_104_000
                    startTS = DateTime.utc().set({ month: 1, day: 1, hour: 0, minute: 0, second: 0 }).minus({ years: 10 })
                    break;
                default:
                    throw new Error('invalid duration value provided')
            }

            const match: any = { duration: durationSeconds, timestamp: { $gte: startTS.toUnixInteger() } }

            if (categoryNames)
                match.categories = { $in: categoryNames }

            if (tagNames)
                match.tags = { $in: tagNames }

            return await (await this.getCollection()).aggregate<Product>()
                .match(match)
                .sort({ 'zScore': -1 })
                .skip(offset)
                .limit(limit)
                .lookup({
                    from: 'product',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product'
                })
                .addStage({
                    $replaceRoot: { newRoot: { $arrayElemAt: ['$product', 0] } }
                })
                .toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async getTopSellingProducts(duration: 'monthly' | 'weekly' | 'yearly', categoryNames?: string[], tagNames?: string[], offset: number = 0, limit: number = 10): Promise<Product[] | false> {
        try {
            let durationSeconds, startTS
            switch (duration) {
                case 'weekly':
                    durationSeconds = 604_800
                    startTS = DateTime.utc().set({ hour: 0, minute: 0, second: 0 })
                    if (startTS.weekday !== 1)
                        startTS = startTS.minus({ days: startTS.weekday - 1 }).minus({ months: 1 })
                    break;
                case 'monthly':
                    durationSeconds = 2_592_000
                    startTS = DateTime.utc().set({ day: 1, hour: 0, minute: 0, second: 0 }).minus({ months: 12 })
                    break;
                case 'yearly':
                    durationSeconds = 31_104_000
                    startTS = DateTime.utc().set({ month: 1, day: 1, hour: 0, minute: 0, second: 0 }).minus({ years: 10 })
                    break;
                default:
                    throw new Error('invalid duration value provided')
            }

            const match: any = { duration: durationSeconds, timestamp: { $gte: startTS.toUnixInteger() } }

            if (categoryNames)
                match.categories = { $in: categoryNames }

            if (tagNames)
                match.tags = { $in: tagNames }

            return await (await this.getCollection()).aggregate<Product>()
                .match(match)
                .sort({ 'count': -1 })
                .skip(offset)
                .limit(limit)
                .lookup({
                    from: 'product',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product'
                })
                .addStage({
                    $replaceRoot: { newRoot: { $arrayElemAt: ['$product', 0] } }
                })
                .toArray()
        }
        catch (e) { console.error(e); return false }
    }

    get(productIds: string | ObjectId | (string | ObjectId)[], since: number, to: number): Promise<ProductStatistics[]>[] | false {
        if (typeof productIds === 'string')
            productIds = [ObjectId.createFromHexString(productIds)]
        else if (productIds instanceof ObjectId)
            productIds = [productIds]
        else if (Array.isArray(productIds))
            productIds = productIds.map(m => typeof m === 'string' ? ObjectId.createFromHexString(m) : m)

        try { return productIds.map(async productId => (await this.getCollection()).find({ productId, timestamp: { $gte: since, $lte: to } }).toArray()) }
        catch (e) { console.error(e); return false }
    }

    count(productIds: string | ObjectId | (string | ObjectId)[], since: number, to: number): Promise<number>[] | false {
        if (typeof productIds === 'string')
            productIds = [ObjectId.createFromHexString(productIds)]
        else if (productIds instanceof ObjectId)
            productIds = [productIds]
        else if (Array.isArray(productIds))
            productIds = productIds.map(m => typeof m === 'string' ? ObjectId.createFromHexString(m) : m)

        try { return productIds.map(async productId => (await this.getCollection()).countDocuments({ productId, timestamp: { $gte: since, $lte: to } })) }
        catch (e) { console.error(e); return false }
    }

    async update(product: ProductUpdate, productId: string): Promise<UpdateResult | false> {
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
