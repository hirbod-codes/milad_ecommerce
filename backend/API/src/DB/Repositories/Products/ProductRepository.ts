import { DateTime } from "luxon";
import { Product, ProductInput, ProductCreate, schemaVersion, ProductUpdate, ProductImmutable } from "../../Models/Products/Product";
import { Collection, Db, DeleteResult, Filter, InsertOneResult, MongoClient, MongoServerError, MongoSystemError, ObjectId, SortDirection, UpdateResult } from 'mongodb'
import { MongoDB } from "../../mongodb";
import { faker, fakerFA } from "@faker-js/faker/";
import { CategoryRepository } from "../CategoryRepository";
import { TagRepository } from "../TagRepository";
import { ProductPictureRepository } from "./ProductPictureRepository";
import fs from 'fs'
import { ProductStatisticsRepository } from "./ProductStatisticsRepository";
import { ProductViewRepository } from "./ProductViewRepository";
import { clearLine, cursorTo } from "readline";

export class ProductRepository extends MongoDB {
    private collection: Collection<ProductCreate>
    private productStatisticsRepository: ProductStatisticsRepository
    private productViewRepository: ProductViewRepository

    constructor(collection: Collection<ProductCreate>, productStatisticsRepository: ProductStatisticsRepository, productViewRepository: ProductViewRepository) {
        super();
        this.collection = collection
        this.productStatisticsRepository = productStatisticsRepository
        this.productViewRepository = productViewRepository
    }

    static async getInstance(client?: MongoClient, db?: Db): Promise<ProductRepository> {
        return new ProductRepository(await MongoDB.getDbInstance().getProductCollection(client, db), await ProductStatisticsRepository.getInstance(client, db), await ProductViewRepository.getInstance(client, db))
    }

    static async seed(count: number) {
        console.log('ProductRepository.seed()')
        console.time()

        try {
            const collection = await MongoDB.getDbInstance().getProductCollection()
            const categoryRepository = await CategoryRepository.getInstance()
            const tagRepository = await TagRepository.getInstance()
            const productPictureRepository = await ProductPictureRepository.getInstance()

            if (!(await collection.deleteMany()).acknowledged || !await productPictureRepository.deleteFiles())
                throw new Error('seeding products failed!')

            const startTimeTS = DateTime.utc().minus({ years: 2 }).toUnixInteger()
            const endTimeTS = DateTime.utc().minus({ years: 1 }).toUnixInteger()

            const categories = await categoryRepository.get()
            if (categories === false || categories.length === 0)
                throw new Error('no category!')

            const tags = await tagRepository.get()
            if (tags === false || tags.length === 0)
                throw new Error('no tag!')

            const names = faker.definitions.commerce?.product_name
            const firstDigit = names.product
            const secondDigit = names.material
            const thirdDigit = names.adjective
            const firstDigitNumbers = names.product.length
            const secondDigitNumbers = names.material.length
            const thirdDigitNumbers = names.adjective.length

            const promises = []
            let counter = 0

            for (let i = 0; i < count; i++) {
                promises.push(
                    (async () => {
                        let safety = 0
                        while (safety < 10) {
                            safety++
                            try {
                                const ts = faker.number.int({ min: startTimeTS, max: endTimeTS })

                                let name: string = undefined!
                                if (i < firstDigitNumbers)
                                    name = `${thirdDigit[0]}${secondDigit[0]}${firstDigit[i]}`
                                else if ((i / firstDigitNumbers) < secondDigitNumbers)
                                    name = `${thirdDigit[0]}${secondDigit[Math.floor(i / firstDigitNumbers)]}${firstDigit[(i % firstDigitNumbers)]}`
                                else if ((i / (firstDigitNumbers * secondDigitNumbers)) < thirdDigitNumbers)
                                    name = `${thirdDigit[Math.floor(i / (firstDigitNumbers * secondDigitNumbers))]}${secondDigit[Math.floor((i % (firstDigitNumbers * secondDigitNumbers)) / firstDigitNumbers)]}${firstDigit[(((i % (firstDigitNumbers * secondDigitNumbers)) % firstDigitNumbers))]}`
                                else
                                    throw new Error('out of unique values for product name')

                                let r = await collection.insertOne({
                                    schemaVersion,
                                    categories: faker.helpers.arrayElements(categories, faker.number.int({ min: 1, max: 5 })).map(m => m.name),
                                    tags: faker.helpers.arrayElements(tags, faker.number.int({ min: 1, max: 5 })).map(m => m.name),
                                    name,
                                    displayName: { fa: fakerFA.commerce.productName(), en: name },
                                    description: { fa: fakerFA.commerce.productDescription(), en: faker.commerce.productDescription() },
                                    price: { IRR: faker.number.int({ min: 0, max: 500_000_000 }), USD: faker.number.int({ min: 0, max: 500_000_000 }) },
                                    reviewsCount: faker.number.int({ min: 0, max: 1000 }),
                                    isAvailable: faker.datatype.boolean(0.7),
                                    dailyOrderZScore: null,
                                    weeklyOrderZScore: null,
                                    yearlyOrderZScore: null,
                                    averageRating: faker.number.float({ min: 0, max: 5 }),
                                    ...(Object.fromEntries(new Array(faker.number.int({ min: 0, max: 10 })).fill(null).map(m => [faker.string.alpha({ length: { min: 2, max: 10 } }), faker.string.alpha({ length: { min: 2, max: 10 } })]))),
                                    createdAt: ts,
                                    updatedAt: ts,
                                })
                                if (!r.acknowledged)
                                    throw new Error('insertion failed')

                                let picNum = faker.helpers.arrayElements([1, 2, 3], faker.number.int({ min: 0, max: 3 }))

                                for (let i = 0; i < picNum.length; i++)
                                    if (await productPictureRepository.uploadFile(r.insertedId.toString(), { fileName: `sample${picNum[i]}.jpeg`, contentType: 'image/jpeg', bytes: fs.readFileSync(`./src/DB/Repositories/Products/sample${picNum[i]}.jpeg`) }) === undefined)
                                        throw new Error('failed to upload picture for product')

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
                        .then(() => {
                            counter++
                            // process.stdout.moveCursor(0, -1)
                            // process.stdout.clearLine(1)
                            console.log(`product ${counter} has inserted.`)
                        })
                )
            }

            await Promise.allSettled(promises)
        } finally { console.timeEnd() }
    }

    async create(product: ProductInput, now: number): Promise<InsertOneResult | false> {
        try {
            let p: ProductCreate = {
                ...product,
                schemaVersion,
                dailyOrderZScore: null,
                weeklyOrderZScore: null,
                yearlyOrderZScore: null,
                createdAt: now,
                updatedAt: now,
            }

            const productInsertResult = await this.collection.insertOne(p, { session: this.session })
            if (!productInsertResult.acknowledged)
                throw new Error('Failed to insert the product document')

            return productInsertResult
        } catch (e) {
            console.error(e)
            return false
        }
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

    async getMostViewedProducts(categories?: string[], tags?: string[], offset: number = 0, limit: number = 10): Promise<Product[] | false> {
        try {
            let cursor, filter: any = {}

            if (categories)
                filter.categories = { $in: categories }

            if (tags)
                filter.tags = { $in: tags }

            if (!tags && !categories)
                cursor = this.collection.find()
            else
                cursor = this.collection.find(filter)

            return await cursor.sort({ views: -1 }).skip(offset).limit(limit).toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async get(filter: Filter<Product>, sorts: { field: keyof Product, direction: SortDirection }[], limit: number, skip: number): Promise<Product[] | false> {
        try {
            let cursor = this.collection.find(filter)

            sorts.forEach(sort => cursor.sort(sort.field, sort.direction))

            return await cursor.limit(limit).skip(skip).toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async search(search: string): Promise<Product[] | false> {
        try {
            return this.collection
                .find({ $text: { $search: search } })
                .sort({ score: { $meta: "textScore" } })
                .toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async sumPriceOfAvailable(selectedProducts: { productId: string, quantity: number }[], unit: string): Promise<number | false> {
        try {
            let products = await this.collection.find({ isAvailable: true, _id: { $in: selectedProducts.map(p => ObjectId.createFromHexString(p.productId)) } }).toArray()
            if (products.length !== selectedProducts.length)
                return false

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
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...product, updatedAt: DateTime.utc().toUnixInteger() } }, { session: this.session }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutables(id: string | ObjectId, immutableFields: ProductImmutable): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: typeof id === 'string' ? ObjectId.createFromHexString(id) : id }, { $set: { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
