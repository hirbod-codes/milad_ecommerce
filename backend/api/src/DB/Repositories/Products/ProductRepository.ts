import { DateTime } from "luxon";
import { Product, ProductInput, ProductCreate, schemaVersion, ProductUpdate, ProductImmutable, collectionName } from "../../Models/Products/Product";
import { ClientSession, Collection, Db, DeleteResult, Filter, InsertOneResult, MongoServerError, MongoSystemError, ObjectId, SortDirection, UpdateResult } from 'mongodb'
import { IRepository, MongoDB } from '@monorepo/mongodb';
import { faker, fakerFA } from "@faker-js/faker";
import { CategoryRepository } from "../CategoryRepository";
import { TagRepository } from "../TagRepository";
import { ProductPictureRepository } from "./ProductPictureRepository";
import * as fs from 'fs'
import { ProductStatisticsRepository } from "./ProductStatisticsRepository";

export class ProductRepository implements IRepository {
    private session: ClientSession | undefined = undefined

    setTransactionSession(session: ClientSession): void {
        this.session = session
    }

    unsetTransactionSession(): void {
        this.session = undefined
    }

    async addCollection(db: Db): Promise<void> {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.createCollection(collectionName)

        const indexes = await db.collection(collectionName).indexes()

        if (indexes.find(i => i.name === 'unique-name') === undefined)
            await db.createIndex(collectionName, { name: 1 }, { unique: true, name: 'unique-name' })

        if (indexes.find(i => i.name === 'search') === undefined)
            await db.createIndex(
                collectionName,
                { name: 'text', 'displayName.en': 'text', 'displayName.fa': 'text', 'description.en': 'text', 'description.fa': 'text' },
                {
                    weights: {
                        'name': 10,
                        'displayName.en': 5,
                        'displayName.fa': 5,
                        'description.en': 1,
                        'description.fa': 1,
                    }, name: 'search'
                }
            )

        if (indexes.find(i => i.name === 'dailyOrderZScore') === undefined)
            await db.createIndex(collectionName, { dailyOrderZScore: -1 }, { name: 'dailyOrderZScore' })

        if (indexes.find(i => i.name === 'weeklyOrderZScore') === undefined)
            await db.createIndex(collectionName, { weeklyOrderZScore: -1 }, { name: 'weeklyOrderZScore' })

        if (indexes.find(i => i.name === 'yearlyOrderZScore') === undefined)
            await db.createIndex(collectionName, { yearlyOrderZScore: -1 }, { name: 'yearlyOrderZScore' })

        if (indexes.find(i => i.name === 'categories') === undefined)
            await db.createIndex(collectionName, { categories: -1 }, { name: 'categories' })

        if (indexes.find(i => i.name === 'tags') === undefined)
            await db.createIndex(collectionName, { tags: -1 }, { name: 'tags' })

        if (indexes.find(i => i.name === 'isAvailable') === undefined)
            await db.createIndex(collectionName, { isAvailable: -1 }, { name: 'isAvailable' })

        if (indexes.find(i => i.name === 'reviewsCount') === undefined)
            await db.createIndex(collectionName, { reviewsCount: -1 }, { name: 'reviewsCount' })

        if (indexes.find(i => i.name === 'averageRating') === undefined)
            await db.createIndex(collectionName, { averageRating: -1 }, { name: 'averageRating' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(collectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(collectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    private async getCollection(): Promise<Collection<ProductCreate>> {
        return (await MongoDB.getDb()).collection<ProductCreate>(collectionName)
    }

    async dropCollection(db: Db): Promise<void> {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.dropCollection(collectionName)
    }

    async seed(count?: number) {
        console.log('ProductRepository.seed()')
        console.time()

        try {
            const collection = await this.getCollection()
            const categoryRepository = new CategoryRepository()
            const tagRepository = new TagRepository()
            const productPictureRepository = new ProductPictureRepository()

            if ((await collection.countDocuments()) !== 0) {
                console.warn(`${collectionName} collection is not empty!`)
                return
            }

            const startTimeTS = DateTime.utc().minus({ years: 2 }).toUnixInteger()
            const endTimeTS = DateTime.utc().minus({ years: 1 }).toUnixInteger()

            const categories = await categoryRepository.get()
            if (categories === false || categories.length === 0)
                throw new Error('no category!')

            const tags = await tagRepository.get()
            if (tags === false || tags.length === 0)
                throw new Error('no tag!')

            if (count === undefined)
                count = 100

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
                                    weeklyOrderZScore: null,
                                    monthlyOrderZScore: null,
                                    yearlyOrderZScore: null,
                                    weeklyViewZScore: null,
                                    monthlyViewZScore: null,
                                    yearlyViewZScore: null,
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
                weeklyOrderZScore: null,
                monthlyOrderZScore: null,
                yearlyOrderZScore: null,
                weeklyViewZScore: null,
                monthlyViewZScore: null,
                yearlyViewZScore: null,
                createdAt: now,
                updatedAt: now,
            }

            const productInsertResult = await (await this.getCollection()).insertOne(p, { session: this.session })
            if (!productInsertResult.acknowledged)
                throw new Error('Failed to insert the product document')

            const productStatisticsInsertResult = await (new ProductStatisticsRepository()).create({ productId: productInsertResult.insertedId }, now)
            if (productStatisticsInsertResult === false || !productStatisticsInsertResult.acknowledged)
                throw new Error('Failed to insert the product\'s statistics documents')

            return productInsertResult
        } catch (e) {
            console.error(e)
            return false
        }
    }

    async isNameExist(name: string): Promise<boolean> {
        try { return await (await this.getCollection()).countDocuments({ name }) !== 0 }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string | ObjectId): Promise<Product | null | undefined> {
        try { return await (await this.getCollection()).findOne({ _id: typeof id === 'string' ? ObjectId.createFromHexString(id) : id }) }
        catch (e) { console.error(e); return undefined }
    }

    async getByIds(ids: (string | ObjectId)[]): Promise<Product[] | undefined> {
        try { return await (await this.getCollection()).find({ _id: { $in: ids.map(id => typeof id === 'string' ? ObjectId.createFromHexString(id) : id) } }).toArray() }
        catch (e) { console.error(e); return undefined }
    }

    async getAll(): Promise<Product[]> {
        try { return await (await this.getCollection()).find().toArray() }
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
                cursor = (await this.getCollection()).find()
            else
                cursor = (await this.getCollection()).find(filter)

            return await cursor.sort({ views: -1 }).skip(offset).limit(limit).toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async get(filter: Filter<Product>, sorts: { field: keyof Product, direction: SortDirection }[], limit: number, skip: number): Promise<Product[] | false> {
        try {
            let cursor = (await this.getCollection()).find(filter)

            sorts.forEach(sort => cursor.sort(sort.field, sort.direction))

            return await cursor.limit(limit).skip(skip).toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async search(search: string): Promise<Product[] | false> {
        try {
            return (await this.getCollection())
                .find({ $text: { $search: search } })
                .sort({ score: { $meta: "textScore" } })
                .toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async sumPriceOfAvailable(selectedProducts: { productId: string, quantity: number }[], unit: string): Promise<number | false> {
        try {
            let products = await (await this.getCollection()).find({ isAvailable: true, _id: { $in: selectedProducts.map(p => ObjectId.createFromHexString(p.productId)) } }).toArray()
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
        try { return await (await this.getCollection()).find({ _id: { $in: ids.map(id => typeof id === 'string' ? ObjectId.createFromHexString(id) : id) }, isAvailable: true }).toArray() }
        catch (e) { console.error(e); return undefined }
    }

    async update(id: string, product: ProductUpdate): Promise<UpdateResult | false> {
        try {
            const updateResult = await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...product, updatedAt: DateTime.utc().toUnixInteger() } }, { session: this.session })
            const productStatisticsRepository = new ProductStatisticsRepository()
            productStatisticsRepository.setTransactionSession(this.session)
            await productStatisticsRepository.update(product, id)
            return updateResult
        }
        catch (e) { console.error(e); return false }
    }

    async updateImmutables(id: string | ObjectId, product: ProductImmutable): Promise<UpdateResult | false> {
        try {
            const updateResult = await (await this.getCollection()).updateOne({ _id: typeof id === 'string' ? ObjectId.createFromHexString(id) : id }, { $set: { ...product, updatedAt: DateTime.utc().toUnixInteger() } })
            const productStatisticsRepository = new ProductStatisticsRepository()
            productStatisticsRepository.setTransactionSession(this.session)
            await productStatisticsRepository.updateImmutables(id, product)
            return updateResult
        }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await (await this.getCollection()).deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }
}
