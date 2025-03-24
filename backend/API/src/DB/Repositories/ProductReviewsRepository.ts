import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb'
import { ProductReview, ProductReviewCreate, ProductReviewInput, ProductReviewUpdate, schemaVersion } from '../Models/ProductReview'
import { DateTime } from 'luxon'
import { MongoDB } from '../mongodb';

export class ProductReviewsRepository extends MongoDB {
    private collection: Collection<ProductReviewCreate>

    constructor(collection: Collection<ProductReviewCreate>) {
        super();
        this.collection = collection
    }

    static async getInstance(): Promise<ProductReviewsRepository> {
        return new ProductReviewsRepository(await MongoDB.getDbInstance().getProductReviewsCollection())
    }

    async create(order: ProductReviewInput): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        let pr: ProductReviewCreate = {
            ...order,
            schemaVersion,
            createdAt: ts,
            updatedAt: ts,
        }

        try { return await this.collection.insertOne(pr) }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<ProductReview | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async updateById(id: string, order: ProductReviewUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...order, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
