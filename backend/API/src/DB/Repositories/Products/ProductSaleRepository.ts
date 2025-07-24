import { ClientSession, Collection, Db, MongoServerError, MongoSystemError, ObjectId } from "mongodb";
import { MongoDB } from "../../mongodb";
import { collectionName, ProductSaleCreate, ProductSaleInput, schemaVersion } from "../../Models/Products/ProductSale";
import { DateTime } from "luxon";
import { number, string } from "yup";
import { IRepository } from "../../IRepository";
import { collectionName as orderCollectionName, OrderCreate } from "../../Models/Order";

export class ProductSaleRepository implements IRepository {
    private session: ClientSession | undefined = undefined

    setTransactionSession(session?: ClientSession): void {
        this.session = session
    }

    unsetTransactionSession(): void {
        this.session = undefined
    }

    async addCollection(db: Db): Promise<void> {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.createCollection(collectionName, { timeseries: { timeField: 'timestamp', granularity: 'hours', metaField: 'metadata' }, expireAfterSeconds: 5 * 12 * 30 * 24 * 60 * 60 })

        const indexes = await db.collection(collectionName).indexes()

        if (indexes.find(i => i.name === 'productId') === undefined)
            await db.createIndex(collectionName, { 'metadata.productId': 1 }, { name: 'productId' })

        if (indexes.find(i => i.name === 'userId') === undefined)
            await db.createIndex(collectionName, { 'metadata.userId': 1 }, { name: 'userId' })

        if (indexes.find(i => i.name === 'quantity') === undefined)
            await db.createIndex(collectionName, { 'metadata.quantity': 1 }, { name: 'quantity' })
    }

    async getCollection(): Promise<Collection<ProductSaleCreate>> {
        return (await MongoDB.getDb()).collection<ProductSaleCreate>(collectionName)
    }

    async dropCollection(db: Db): Promise<void> {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.dropCollection(collectionName)
    }

    async seed(count?: number) {
        console.log('ProductSaleRepository.seed()')
        console.time()

        try {
            const collection = await this.getCollection()
            const orderCollection = (await MongoDB.getDb()).collection<OrderCreate>(orderCollectionName)

            if (!(await collection.deleteMany()).acknowledged)
                throw new Error('seeding product sales failed!')

            const orders = await orderCollection.find({ isPayed: true }).toArray()

            const promises = []

            for (let i = 0; i < orders.length; i++) {
                const order = orders[i]

                promises.push(
                    (async () => {
                        let safety = 0
                        while (safety < 10) {
                            safety++
                            try {
                                const inserts = []
                                for (let j = 0; j < order.products.length; j++) {
                                    const { productId, quantity } = order.products[j];

                                    inserts.push({
                                        schemaVersion: schemaVersion,
                                        timestamp: DateTime.fromSeconds(order.updatedAt).toJSDate(),
                                        metadata: {
                                            productId,
                                            quantity,
                                            userId: ObjectId.createFromHexString(order.userId.toString())
                                        }
                                    })
                                }

                                const r = await collection.insertMany(inserts)
                                if (!r.acknowledged)
                                    throw new Error('insertion failed')

                                break;
                            } catch (e) {
                                if (!(e instanceof MongoSystemError) || !(e instanceof MongoServerError) || e.code !== 11000)
                                    throw e
                            }
                        }

                        if (safety >= 10)
                            throw new Error('safety triggered while seeding products!')
                    })()
                        .catch((e) => { throw new e })
                        .finally(() => {
                            console.log(`order ${i} has processed.`)
                        })
                )
            }

            await Promise.allSettled(promises)
        } finally { console.timeEnd() }
    }

    async create(productSaleInput: ProductSaleInput, now: number) {
        try {
            const p: ProductSaleCreate = { ...productSaleInput, timestamp: DateTime.fromSeconds(now).toJSDate(), schemaVersion: schemaVersion }
            const insertionResult = (await this.getCollection()).insertOne(p, { session: this.session })
            return insertionResult
        } catch (e) {
            console.error(e)
            return false
        }
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
