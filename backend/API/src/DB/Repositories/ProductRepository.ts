import { DateTime } from "luxon";
import { Product, ProductInput, ProductCreate, schemaVersion, ProductUpdate, ProductImmutable } from "../Models/Product";
import { Collection, DeleteResult, Filter, InsertOneResult, MongoSystemError, ObjectId, SortDirection, UpdateResult } from 'mongodb'
import { MongoDB } from "../mongodb";
import { faker, fakerFA } from "@faker-js/faker/";
import { CategoryRepository } from "./CategoryRepository";
import { TagRepository } from "./TagRepository";

export class ProductRepository extends MongoDB {
    private collection: Collection<ProductCreate>

    constructor(collection: Collection<ProductCreate>) {
        super();
        this.collection = collection
    }

    static async getInstance(): Promise<ProductRepository> {
        return new ProductRepository(await MongoDB.getDbInstance().getProductCollection())
    }

    static async seed(count: number = 100) {
        const collection = await MongoDB.getDbInstance().getProductCollection()
        const categoryRepository = await CategoryRepository.getInstance()
        const tagRepository = await TagRepository.getInstance()

        if (!(await collection.deleteMany()).acknowledged)
            throw new Error('seeding users failed!')

        const startTimeTS = DateTime.utc().minus({ years: 2 }).toUnixInteger()
        const endTimeTS = DateTime.utc().minus({ months: 2 }).toUnixInteger()

        const categories = await categoryRepository.get()
        if (categories === false || categories.length === 0)
            throw new Error('seeding users failed!')

        const tags = await tagRepository.get()
        if (tags === false || tags.length === 0)
            throw new Error('seeding users failed!')

        const localCategoryIds: string[] = []

        for (let i = 0; i < count; i++) {
            let safety = 0
            while (safety < 10) {
                safety++
                try {
                    const ts = faker.number.int({ min: startTimeTS, max: endTimeTS })

                    const name = faker.commerce.productName()

                    let r = await collection.insertOne({
                        schemaVersion,
                        categories: faker.helpers.arrayElements(categories, faker.number.int({ min: 1, max: 5 })).map(m => m.name),
                        tags: faker.helpers.arrayElements(tags, faker.number.int({ min: 1, max: 5 })).map(m => m.name),
                        name,
                        displayName: { fa: fakerFA.commerce.productName(), en: name },
                        description: { fa: fakerFA.commerce.productDescription(), en: faker.commerce.productDescription() },
                        price: { IRR: faker.number.int({ min: 0, max: 500_000_000 }), USD: faker.number.int({ min: 0, max: 500_000_000 }) },
                        purchaseCount: faker.number.int({ min: 0, max: 5000 }),
                        reviewsCount: faker.number.int({ min: 0, max: 1000 }),
                        isAvailable: faker.datatype.boolean(0.7),
                        views: faker.number.int({ min: 0, max: 100000 }),
                        averageRating: faker.number.float({ min: 0, max: 5 }),
                        ...(Object.fromEntries(new Array(faker.number.int({ min: 0, max: 10 })).fill(null).map(m => [faker.string.alpha({ length: { min: 2, max: 10 } }), faker.string.alpha({ length: { min: 2, max: 10 } })]))),
                        createdAt: ts,
                        updatedAt: ts,
                    })
                    if (r.acknowledged) {
                        localCategoryIds.push(r.insertedId.toString())
                        break
                    }
                } catch (e) {
                    if (!(e instanceof MongoSystemError) || e.code !== 11000)
                        throw e
                }
            }
        }
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

    async isNameExist(name: string): Promise<boolean> {
        try { return await this.collection.countDocuments({ name }) !== 0 }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string | ObjectId): Promise<Product | null | undefined> {
        try { return await this.collection.findOne({ _id: typeof id === 'string' ? ObjectId.createFromHexString(id) : id }) }
        catch (e) { console.error(e); return undefined }
    }

    async getByIds(ids: (string | ObjectId)[]): Promise<Product[] | undefined> {
        try { return await this.collection.find({ _id: { $in: ids.map(id => typeof id === 'string' ? ObjectId.createFromHexString(id) : id) } }).toArray() }
        catch (e) { console.error(e); return undefined }
    }

    async getAll(): Promise<Product[]> {
        try { return await this.collection.find().toArray() }
        catch (e) { console.error(e); return [] }
    }

    async get(filter: Filter<Product>, sorts: { field: keyof Product, direction: SortDirection }[], limit: number, skip: number): Promise<Product[] | false> {
        try {
            let cursor = this.collection.find(filter)

            sorts.forEach(sort => cursor.sort(sort.field, sort.direction))

            return await cursor.limit(limit).skip(skip).toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async sumPriceOfAvailable(productIds: string[], unit: string): Promise<number | false> {
        try {
            let products = await this.collection.find({ isAvailable: true, _id: { $in: productIds.map(id => ObjectId.createFromHexString(id)) } }).toArray()
            console.log('products', products)

            let sum = 0
            for (const product of products)
                if (product?.price[unit] === undefined)
                    return false
                else
                    sum += product?.price[unit]

            return sum
        }
        catch (e) { console.error(e); return false }
    }

    async getAvailableByIds(ids: (string | ObjectId)[]): Promise<Product[] | undefined> {
        try { return await this.collection.find({ _id: { $in: ids.map(id => typeof id === 'string' ? ObjectId.createFromHexString(id) : id) }, isAvailable: true }).toArray() }
        catch (e) { console.error(e); return undefined }
    }

    async update(id: string, product: ProductUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...product, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutables(id: string, immutableFields: ProductImmutable): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
