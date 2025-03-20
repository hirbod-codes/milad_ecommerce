import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb'
import { DateTime } from 'luxon'
import { Category, CategoryCreate, CategoryImmutable, CategoryInput, CategoryUpdate, schemaVersion } from '../Models/Category'

export class CategoryRepository {
    private collection: Collection<CategoryCreate>

    constructor(collection: Collection<CategoryCreate>) {
        this.collection = collection
    }

    async create(category: CategoryInput): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        let o: CategoryCreate = {
            ...category,
            schemaVersion,
            views: 0,
            createdAt: ts,
            updatedAt: ts,
        }

        try { return await this.collection.insertOne(o) }
        catch (e) { console.error(e); return false }
    }

    async get(): Promise<Category[] | false> {
        try { return await this.collection.find().toArray() }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<Category | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async update(id: string, category: CategoryUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...category, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutables(id: string, immutableFields: CategoryImmutable): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
