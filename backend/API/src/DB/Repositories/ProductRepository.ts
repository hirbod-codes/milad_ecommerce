import { DateTime } from "luxon";
import { Product, ProductInput, ProductCreate, schemaVersion, ProductUpdate, ProductImmutable } from "../Models/Product";
import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb/mongodb'

export class ProductRepository {
    private collection: Collection<ProductCreate>

    constructor(collection: Collection<ProductCreate>) {
        this.collection = collection
    }

    async create(product: ProductInput): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        let p: ProductCreate = {
            ...product,
            schemaVersion,
            createdAt: ts,
            updatedAt: ts,
        }

        return await this.collection.insertOne(p)
    }

    async getById(id: string): Promise<Product | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async getByIds(ids: (string | ObjectId)[]): Promise<Product[] | undefined> {
        try { return await this.collection.find({ _id: { $in: ids.map(id => typeof id === 'string' ? ObjectId.createFromHexString(id) : id) } }).toArray() }
        catch (e) { console.error(e); return undefined }
    }

    async getAvailableByIds(ids: (string | ObjectId)[]): Promise<Product[] | undefined> {
        try { return await this.collection.find({ _id: { $in: ids.map(id => typeof id === 'string' ? ObjectId.createFromHexString(id) : id) }, isAvailable: true }).toArray() }
        catch (e) { console.error(e); return undefined }
    }

    async update(id: string, product: ProductUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { ...product, updatedAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutables(id: string, immutableFields: ProductImmutable): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() }) }
        catch (e) { console.error(e); return false }
    }

    async deleteImmutables(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
