import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb'
import { ProductReview, ProductReviewCreate, ProductReviewInput, ProductReviewUpdate, schemaVersion } from '../Models/ProductReview'
import { DateTime } from 'luxon'

export class ProductReviewsRepository {
    private collection: Collection<ProductReviewCreate>

    constructor(collection: Collection<ProductReviewCreate>) {
        this.collection = collection
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
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { ...order, updatedAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
