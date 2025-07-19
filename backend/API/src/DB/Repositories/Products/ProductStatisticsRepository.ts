import { DateTime } from "luxon";
import { Collection, Db, DeleteResult, InsertManyResult, MongoClient, ObjectId, UpdateResult } from 'mongodb'
import { MongoDB } from "../../mongodb";
import { schemaVersion } from "../../Models/Products/ProductSale";
import { ProductStatistics, ProductStatisticsCreate, ProductStatisticsInput } from "../../Models/Products/ProductStatistics";
import { Product, ProductCreate, ProductUpdate } from "../../Models/Products/Product";
import { number } from "yup";

export class ProductStatisticsRepository extends MongoDB {
    private collection: Collection<ProductStatisticsCreate>
    private productCollection: Collection<ProductCreate>

    constructor(productStatisticsCollection: Collection<ProductStatisticsCreate>, productCollection: Collection<ProductCreate>) {
        super();
        this.collection = productStatisticsCollection
        this.productCollection = productCollection
    }

    static async getInstance(client?: MongoClient, db?: Db): Promise<ProductStatisticsRepository> {
        return new ProductStatisticsRepository(await MongoDB.getDbInstance().getProductStatisticsCollection(client, db), await MongoDB.getDbInstance().getProductCollection(client, db))
    }

    async create(productStatistics: ProductStatisticsInput, now: number): Promise<InsertManyResult | false> {
        try {
            const product = await this.productCollection.findOne({ _id: productStatistics.productId.toString() })
            if (!product)
                throw new Error('No product was found with provided product id.')

            let p: ProductStatisticsCreate = {
                ...productStatistics,
                schemaVersion: schemaVersion,
                count: 0,
                duration: 0,
                product,
                zScore: 0,
                timestamp: now,
            }

            let thisWeek = DateTime.fromSeconds(now).set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            while (thisWeek.weekday !== 1) {
                thisWeek = thisWeek.minus({ days: 1 })
            }

            const thisMonth = DateTime.fromSeconds(now).set({ day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })

            const thisYear = DateTime.fromSeconds(now).set({ month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })

            let insertionResult = await this.collection.insertMany(
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

            return await this.collection.aggregate<Product>()
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

            return await this.collection.aggregate<Product>()
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

        try { return productIds.map(productId => this.collection.find({ productId, timestamp: { $gte: since, $lte: to } }).toArray()) }
        catch (e) { console.error(e); return false }
    }

    count(productIds: string | ObjectId | (string | ObjectId)[], since: number, to: number): Promise<number>[] | false {
        if (typeof productIds === 'string')
            productIds = [ObjectId.createFromHexString(productIds)]
        else if (productIds instanceof ObjectId)
            productIds = [productIds]
        else if (Array.isArray(productIds))
            productIds = productIds.map(m => typeof m === 'string' ? ObjectId.createFromHexString(m) : m)

        try { return productIds.map(productId => this.collection.countDocuments({ productId, timestamp: { $gte: since, $lte: to } })) }
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

            return await this.collection.updateMany({ productId }, { $set: { updatedAt, 'product.updatedAt': updatedAt, ...updates } }, { session: this.session })
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
    async updateCount(productId: string, now: number, count: number): Promise<{ weeklyZScore: number, monthlyZScore: number, yearlyZScore: number } | false> {
        try {
            return {
                weeklyZScore: await this.updateWeeklyCount(productId, now, count),
                monthlyZScore: await this.updateMonthlyCount(productId, now, count),
                yearlyZScore: await this.updateYearlyCount(productId, now, count)
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
    private async updateWeeklyCount(productId: string, now: number, count: number): Promise<number> {
        let thisWeek = DateTime.fromSeconds(now).set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        while (thisWeek.weekday !== 1) {
            thisWeek = thisWeek.minus({ days: 1 })
        }

        const aggregationResult = await this.getZScoreAggregationPipeline(productId.toString(), 608_800, [thisWeek.minus({ weeks: 7 }).toUnixInteger(), thisWeek.minus({ weeks: 1 }).toUnixInteger()], thisWeek.toUnixInteger(), count)

        let zScore: number | null | undefined
        if (aggregationResult && Array.isArray(aggregationResult) && aggregationResult[0]?.zScore && number().required().isValidSync(aggregationResult[0]?.zScore)) {
            zScore = number().required().cast(aggregationResult[0]?.zScore)
            if (zScore >= 20)
                console.log('aggregationResult', JSON.stringify(aggregationResult, undefined, 4))
        }

        if (!zScore)
            throw new Error('Failed to calculate weekly zScore.')

        let updateResult = await this.collection.updateOne(
            {
                productId: ObjectId.createFromHexString(productId.toString()),
                duration: 608_800, // a week in seconds
                timestamp: thisWeek.toUnixInteger(),
            },
            {
                $inc: { count },
                $set: {
                    zScore
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
    private async updateMonthlyCount(productId: string, now: number, count: number): Promise<number> {
        const thisMonth = DateTime.fromSeconds(now).set({ day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })

        const aggregationResult = await this.getZScoreAggregationPipeline(productId.toString(), 2_592_000, [thisMonth.minus({ months: 12 }).toUnixInteger(), thisMonth.minus({ months: 1 }).toUnixInteger()], thisMonth.toUnixInteger(), count)

        let zScore: number | null | undefined
        if (aggregationResult && Array.isArray(aggregationResult) && aggregationResult[0]?.zScore && number().required().isValidSync(aggregationResult[0]?.zScore)) {
            zScore = number().required().cast(aggregationResult[0]?.zScore)
            if (zScore >= 20)
                console.log('aggregationResult', JSON.stringify(aggregationResult, undefined, 4))
        }

        if (!zScore)
            throw new Error('Failed to calculate monthly zScore.')

        let updateResult = await this.collection.updateOne(
            {
                productId: ObjectId.createFromHexString(productId.toString()),
                duration: 2_592_000, // a month in seconds
                timestamp: thisMonth.toUnixInteger(),
            },
            {
                $inc: { count },
                $set: {
                    zScore
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
    private async updateYearlyCount(productId: string, now: number, count: number): Promise<number> {
        const thisYear = DateTime.fromSeconds(now).set({ month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 })

        const aggregationResult = await this.getZScoreAggregationPipeline(productId.toString(), 31_104_000, [thisYear.minus({ years: 7 }).toUnixInteger(), thisYear.minus({ years: 1 }).toUnixInteger()], thisYear.toUnixInteger(), count)

        let zScore: number | null | undefined
        if (aggregationResult && Array.isArray(aggregationResult) && aggregationResult[0]?.zScore && number().required().isValidSync(aggregationResult[0]?.zScore)) {
            zScore = number().required().cast(aggregationResult[0]?.zScore)
            if (zScore >= 20)
                console.log('aggregationResult', JSON.stringify(aggregationResult, undefined, 4))
        }

        if (!zScore)
            throw new Error('Failed to calculate yearly zScore.')

        let updateResult = await this.collection.updateOne(
            {
                productId: ObjectId.createFromHexString(productId.toString()),
                duration: 31_104_000, // a year in seconds
                timestamp: thisYear.toUnixInteger(),
            },
            {
                $inc: { count },
                $set: {
                    zScore
                },
            }
            , { session: this.session })
        if (!updateResult.acknowledged || updateResult.modifiedCount !== 1)
            throw new Error('failed to update ProductStatistics document with yearly calculated z-score')

        return zScore
    }

    private async getZScoreAggregationPipeline(productId: string, duration: number, period: [number, number], now: number, count: number) {
        return await this.collection.aggregate(undefined, { allowDiskUse: true })
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
                                mu: { $avg: "$count" },
                                sigma: {
                                    $stdDevSamp: "$count"
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
                                                            count
                                                        ]
                                                    },
                                                    count
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
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
