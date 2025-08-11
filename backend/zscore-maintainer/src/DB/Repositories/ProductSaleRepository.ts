import { Collection, ObjectId } from "mongodb";
import { MongoDB } from '@monorepo/mongodb';
import { DateTime } from "luxon";
import { number, string } from "yup";
import { collectionName, ProductSaleCreate } from "../Models/ProductSale";

export class ProductSaleRepository {
    private async getCollection(): Promise<Collection<ProductSaleCreate>> {
        return (await MongoDB.getDb()).collection<ProductSaleCreate>(collectionName)
    }

    async getEstimatedCount() {
        try { return await (await this.getCollection()).countDocuments({}) }
        catch (e) { console.error(e); return false }
    }

    async getPreviousId(id: string): Promise<string | false> {
        try {
            const r = await (await this.getCollection())
                .find({ _id: { $lt: ObjectId.createFromHexString(id) } })
                .sort({ _id: -1 })
                .limit(1)
                .toArray()

            if (r.length !== 1)
                throw new Error('failed to find previous id.')

            return r[0]._id.toString()
        }
        catch (e) { console.error(e); return false }
    }

    async divideByProductIds(buckets: number): Promise<{ _id: { min: ObjectId | string, max: ObjectId | string }, count: number }[] | false>
    async divideByProductIds(buckets: number, lastProcessedId: ObjectId | string): Promise<{ _id: { min: ObjectId | string, max: ObjectId | string }, count: number }[] | false>
    async divideByProductIds(buckets: number, from: number, to: number): Promise<{ _id: { min: ObjectId | string, max: ObjectId | string }, count: number }[] | false>
    async divideByProductIds(buckets: number, first?: ObjectId | string | number, second?: number): Promise<{ _id: { min: ObjectId | string, max: ObjectId | string }, count: number }[] | false> {
        try {
            let aggregation = (await this.getCollection()).aggregate(undefined, { allowDiskUse: true })
            if (string().required().isValidSync(first) && second === undefined) {
                aggregation = aggregation
                    .match({ _id: { $gt: ObjectId.createFromHexString(first) } })
            } else if (number().required().isValidSync(first) && number().required().isValidSync(second)) {
                aggregation = aggregation
                    .match({
                        timestamp: {
                            $gte: DateTime.fromSeconds(first).toJSDate(),
                            $lt: DateTime.fromSeconds(second).toJSDate()
                        }
                    })
            }

            aggregation = aggregation
                .addStage({
                    $bucketAuto: {
                        groupBy: "$_id",
                        buckets,
                        output: {
                            count: { $sum: 1 },
                        }
                    }
                })

            return await aggregation.toArray() as any[]
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async getGroupedByProductIds(minId: string, maxId: string, offset: number, limit: number, inclusive: boolean = false): Promise<false | { _id: ObjectId | string, quantity: number }[]> {
        try {
            const aggregation = (await this.getCollection()).aggregate(undefined, { allowDiskUse: true })
                .match({
                    _id: {
                        $gte: ObjectId.createFromHexString(minId),
                        [inclusive ? '$lte' : '$lt']: ObjectId.createFromHexString(maxId)
                    }
                })
                .group({
                    _id: "$metadata.productId",
                    quantity: { $sum: "$metadata.quantity" },
                })
                .skip(offset)
                .limit(limit)

            return await aggregation.toArray() as any
        } catch (e) {
            console.error(e)
            return false
        }
    }
}
