import { DateTime } from "luxon";
import { Collection, DeleteResult, InsertOneResult, ObjectId } from 'mongodb'
import { MongoDB } from "../mongodb";
import { ProductView, ProductViewCreate, ProductViewInput } from "../Models/ProductView";
import { ProductRepository } from "./ProductRepository";
import { faker } from "@faker-js/faker/.";

export class ProductViewRepository extends MongoDB {
    private collection: Collection<ProductViewCreate>

    constructor(collection: Collection<ProductViewCreate>) {
        super();
        this.collection = collection
    }

    static async getInstance(): Promise<ProductViewRepository> {
        return new ProductViewRepository(await MongoDB.getDbInstance().getProductViewCollection())
    }

    static async seed() {
        console.log('ProductViewRepository.seed()')

        const collection = await MongoDB.getDbInstance().getProductViewCollection()
        const productRepository = await ProductRepository.getInstance()

        if (!(await collection.deleteMany()).acknowledged)
            throw new Error('seeding users failed!')

        const products = await productRepository.getAll()

        for (const product of products) {
            const now = DateTime.utc().toUnixInteger()
            const docs = []
            if (product.views)
                for (let i = 0; i < product.views; i++) {
                    const ts = faker.number.int({ min: product.createdAt, max: now })
                    docs.push({ productId: ObjectId.createFromHexString(product._id.toString()), timestamp: ts })
                }
            collection.insertMany(docs)
        }

    }

    async create(product: ProductViewInput): Promise<InsertOneResult | false> {
        let p: ProductViewCreate = {
            ...product,
            timestamp: DateTime.utc().toUnixInteger(),
        }

        return await this.collection.insertOne(p)
    }

    async get(): Promise<ProductView[]> {
        try { return await this.collection.find().toArray() }
        catch (e) { console.error(e); return [] }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
