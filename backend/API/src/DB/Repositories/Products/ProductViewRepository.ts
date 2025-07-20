import { Collection, ObjectId } from "mongodb";
import { MongoDB } from "../../mongodb";
import { ProductViewCreate, ProductViewInput, schemaVersion } from "../../Models/Products/ProductView";
import { number, string } from "yup";
import { DateTime } from "luxon";

export class ProductViewRepository extends MongoDB {
    private collection: Collection<ProductViewCreate>

    constructor(productViewCreate: Collection<ProductViewCreate>) {
        super();
        this.collection = productViewCreate
    }

    static async getInstance(mongoDB?: MongoDB): Promise<ProductViewRepository> {
        return new ProductViewRepository(await (mongoDB ? mongoDB : MongoDB.getDbInstance()).getProductViewCollection())
    }

    async create(productViewInput: ProductViewInput, now: number) {
        try {
            const p: ProductViewCreate = { ...productViewInput, timestamp: DateTime.fromSeconds(now).toJSDate(), schemaVersion: schemaVersion }
            const insertionResult = this.collection.insertOne(p, { session: this.session })
            return insertionResult
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async getEstimatedCount() {
        try { return await this.collection.countDocuments({}) }
        catch (e) { console.error(e); return false }
    }

    async getPreviousId(id: string): Promise<string | false> {
        try {
            const r = await this.collection
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
            let aggregation = this.collection.aggregate(undefined, { allowDiskUse: true })
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
            const aggregation = this.collection.aggregate(undefined, { allowDiskUse: true })
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
