import { DateTime } from "luxon";
import { Product, ProductInput, ProductCreate, schemaVersion, productUpdateSchema, ProductUpdate, productSchema, ProductImmutable, productImmutableSchema } from "../Models/Product";
import { Collection, DeleteResult, InsertOneResult, ObjectId, UpdateResult } from 'mongodb/mongodb'

export class UserRepository {
    private collection: Collection<ProductCreate>

    constructor(collection: Collection<ProductCreate>) {
        this.collection = collection
    }

    async create(product: ProductInput): Promise<InsertOneResult> {
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
        catch (e) {
            console.error(e)
            return undefined
        }
    }

    async update(id: string, product: ProductCreate): Promise<UpdateResult | false> {
        try {
            let castedProduct: ProductUpdate | undefined = undefined
            if (!productUpdateSchema.isValidSync(product))
                return false
            else
                castedProduct = productUpdateSchema.cast(product)

            if (castedProduct === undefined || Object.keys(castedProduct).length === 0)
                return false

            return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { ...castedProduct, updatedAt: DateTime.utc().toUnixInteger() })
        }
        catch (e) {
            console.error(e)
            return false
        }
    }

    async updateImmutables(id: string, immutableFields: ProductImmutable): Promise<UpdateResult | false> {
        try {
            let immutableFieldsCasted: ProductImmutable | undefined = undefined
            if (!productImmutableSchema.isValidSync(immutableFields))
                return false
            else
                immutableFieldsCasted = productImmutableSchema.cast(immutableFields)

            if (immutableFieldsCasted === undefined || Object.keys(immutableFieldsCasted).length === 0)
                return false

            return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { ...immutableFieldsCasted, updatedAt: DateTime.utc().toUnixInteger() })
        }
        catch (e) {
            console.error(e)
            return false
        }
    }

    async deleteImmutables(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) {
            console.error(e)
            return false
        }
    }
}
