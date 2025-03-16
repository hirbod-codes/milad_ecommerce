import { DateTime } from "luxon";
import { Product, ProductInput, ProductCreate, schemaVersion, ProductUpdate, ProductImmutable } from "../Models/Product";
import { Collection, DeleteResult, Filter, InsertOneResult, ObjectId, SortDirection, UpdateResult } from 'mongodb'

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

    async get(filter: Filter<Product>, sorts: [{ field: (keyof Product)[], direction: SortDirection }], limit: number, skip: number): Promise<Product[]> {
        try {
            let cursor = await this.collection.find(filter)

            sorts.forEach(sort => cursor.sort(sort.field, sort.direction))

            return await cursor.limit(limit).skip(skip).toArray()
        }
        catch (e) { console.error(e); return [] }
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

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
