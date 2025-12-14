import { ClientSession, Collection, Db, InsertOneResult, ObjectId, UpdateResult } from "mongodb";
import { IRepository, MongoDB } from '@monorepo/mongodb';
import { collectionName, ProductViewRange, ProductViewRangeCreate, ProductViewRangeInput, schemaVersion } from "../Models/ProductViewRange";

export class ProductViewRangeRepository implements IRepository {
    IRepository: "IRepository" = "IRepository";

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

        if (indexes.find(i => i.name === 'min') === undefined)
            await db.createIndex(collectionName, { min: -1 }, { name: 'min' })

        if (indexes.find(i => i.name === 'max') === undefined)
            await db.createIndex(collectionName, { max: -1 }, { name: 'max' })

        if (indexes.find(i => i.name === 'count') === undefined)
            await db.createIndex(collectionName, { count: 1 }, { name: 'count' })

        if (indexes.find(i => i.name === 'duration') === undefined)
            await db.createIndex(collectionName, { duration: 1 }, { name: 'duration' })

        if (indexes.find(i => i.name === 'zScoreCalculated') === undefined)
            await db.createIndex(collectionName, { zScoreCalculated: -1 }, { name: 'zScoreCalculated' })
    }

    private async getCollection(): Promise<Collection<ProductViewRangeCreate>> {
        return (await MongoDB.getDb()).collection<ProductViewRangeCreate>(collectionName)
    }

    async create(productViewRange: ProductViewRangeInput, now: number): Promise<InsertOneResult | false> {
        try {
            const p: ProductViewRangeCreate = { ...productViewRange, schemaVersion, lastProcessed: undefined, zScoreCalculated: false, createdAt: now, updatedAt: now }

            const result = await (await this.getCollection()).insertOne(p)
            if (!result.acknowledged)
                throw new Error('Failed to create ProductViewRange document.')

            return result
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async getLastProductViewRangeId(): Promise<string | undefined> {
        const doc = await (await this.getCollection()).findOne({}, { sort: [['_id', -1]] })

        return doc?.max.toString() ?? undefined
    }

    async exists(range: ProductViewRangeInput): Promise<ProductViewRange | null | undefined> {
        return await (await this.getCollection()).findOne({ min: range.min, max: range.max, count: range.count, duration: range.duration })
    }

    async processed(range: ProductViewRangeInput, lastProcessed: string): Promise<UpdateResult | false> {
        const lastProcessedId = ObjectId.createFromHexString(lastProcessed)
        return await (await this.getCollection()).updateOne({ min: range.min, max: range.max, count: range.count, duration: range.duration }, { $set: { lastProcessed: lastProcessedId, zScoreCalculated: lastProcessedId.toString() === range.max.toString() } })
    }
}
