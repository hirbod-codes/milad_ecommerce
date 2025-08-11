import { DateTime } from "luxon";
import { ClientSession, Collection, DeleteResult, ObjectId, UpdateResult } from 'mongodb'
import { collectionName, ProductStatisticsCreate } from "../Models/ProductStatistics";
import { number } from "yup";
import { MongoDB } from '@monorepo/mongodb'
import { ProductImmutable } from "../Models/Product";

export class ProductStatisticsRepository {
    private session: ClientSession | undefined = undefined

    setTransactionSession(session?: ClientSession): void {
        this.session = session
    }

    unsetTransactionSession(): void {
        this.session = undefined
    }

    private async getCollection(): Promise<Collection<ProductStatisticsCreate>> {
        return (await MongoDB.getDb()).collection<ProductStatisticsCreate>(collectionName)
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
