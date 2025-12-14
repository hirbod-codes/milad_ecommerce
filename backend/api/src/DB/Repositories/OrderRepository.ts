import { ClientSession, Collection, Db, DeleteResult, Filter, InsertOneResult, MongoSystemError, ObjectId, Sort, SortDirection, UpdateResult } from 'mongodb'
import { collectionName, Order, OrderCreate, OrderImmutable, OrderInput, OrderUpdate, schemaVersion } from '../Models/Order'
import { DateTime } from 'luxon'
import { IRepository, MongoDB } from '@monorepo/mongodb';
import { faker } from '@faker-js/faker';
import { ProductRepository } from './Products/ProductRepository';
import { UserRepository } from './UserRepository';
import { ISeedable } from "@monorepo/mongodb/dist/ISeedable";

export class OrderRepository implements IRepository, ISeedable {
    IRepository: 'IRepository' = 'IRepository';
    ISeedable: 'ISeedable' = 'ISeedable';

    private session: ClientSession | undefined = undefined

    setTransactionSession(session?: ClientSession): void {
        this.session = session
    }

    unsetTransactionSession(): void {
        this.session = undefined
    }

    async addCollection(db: Db): Promise<void> {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.createCollection(collectionName)

        const indexes = await db.collection(collectionName).indexes()

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(collectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(collectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    private async getCollection(): Promise<Collection<OrderCreate>> {
        return (await MongoDB.getDb()).collection<OrderCreate>(collectionName)
    }

    async dropCollection(db: Db): Promise<void> {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.dropCollection(collectionName)
    }

    async seed(count?: number) {
        console.log('OrderRepository.seed()')
        console.time()

        try {
            const collection = await this.getCollection()
            const productRepository = new ProductRepository()
            const userRepository = new UserRepository()

            if ((await collection.countDocuments()) !== 0) {
                console.warn(`${collectionName} collection is not empty!`)
                return
            }

            const users = await userRepository.get()
            if (users.length === 0)
                throw new Error('no user!')

            const products = await productRepository.getAll()
            if (products.length === 0)
                throw new Error('no product!')

            if (count === undefined)
                count = 50

            const endTimeTS = DateTime.utc().minus({ months: 2 }).toUnixInteger()

            const promises = []

            for (let j = 0; j < users.length; j++) {
                const user = users[j]

                for (let i = 0; i < count; i++) {
                    promises.push(
                        (async () => {
                            let safety = 0
                            while (safety < 10) {
                                safety++
                                try {
                                    const selectedProducts = faker.helpers.arrayElements(products, faker.datatype.number({ min: 3, max: 5 }))
                                    const orderProducts = selectedProducts.map(m => ({ productId: m._id, quantity: faker.datatype.number({ min: 1, max: 400 }) }))
                                    const cost = { IRR: orderProducts.reduce((p, c) => p + products.find(f => f._id === c.productId)!.price.IRR * c.quantity, 0), USD: orderProducts.reduce((p, c) => p + products.find(f => f._id === c.productId)!.price.USD * c.quantity, 0) }

                                    const ts = faker.datatype.number({ min: selectedProducts.reduce((p, c) => c.createdAt > p ? c.createdAt : p, 0), max: endTimeTS })

                                    const orderCreate: OrderCreate = {
                                        schemaVersion,
                                        userId: user._id,
                                        isPayed: faker.datatype.boolean(),
                                        isSent: faker.datatype.boolean(),
                                        products: orderProducts,
                                        cost,
                                        address: {
                                            text: faker.address.streetAddress(),
                                            googleMap: faker.datatype.boolean() ? undefined : faker.internet.url()
                                        },
                                        createdAt: ts,
                                        updatedAt: ts,
                                    }

                                    let r = await collection.insertOne(orderCreate)
                                    if (!r.acknowledged)
                                        throw new Error('system failed to insert order')

                                    break
                                } catch (e) {
                                    console.error(e)
                                    if (!(e instanceof MongoSystemError) || e.code !== 11000)
                                        throw e
                                }
                            }

                            if (safety >= 10)
                                throw new Error('safety triggered while seeding orders!')
                        })()
                            .catch((e) => { throw new e })
                            .finally(() => {
                                console.log(`user ${j}, order ${i}`)
                            })
                    )
                }
            }

            await Promise.allSettled(promises)
        } finally { console.timeEnd() }
    }

    async create(userId: string | ObjectId, order: OrderInput, cost: { [k: string]: number }): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        if (typeof userId === 'string')
            userId = ObjectId.createFromHexString(userId)

        order.products = order.products.map(p => ({ ...p, productId: typeof p.productId === 'string' ? ObjectId.createFromHexString(p.productId) : p.productId }))

        let o: OrderCreate = {
            ...order,
            schemaVersion,
            userId,
            isPayed: false,
            isSent: false,
            cost,
            createdAt: ts,
            updatedAt: ts,
        }

        try { return await (await this.getCollection()).insertOne(o) }
        catch (e) { console.error(e); return false }
    }

    async get(limit: number, skip: number, filter?: Filter<Order>, sorts?: { field: keyof Order, direction: SortDirection }[], userId?: string): Promise<Order[] | false> {
        try {
            let finalFilter: Filter<Order> | undefined = undefined

            if (filter && userId)
                finalFilter = { $and: [filter, { userId: typeof userId === 'string' ? ObjectId.createFromHexString(userId) : userId }] }
            else if (userId)
                finalFilter = { userId: typeof userId === 'string' ? ObjectId.createFromHexString(userId) : userId }
            else if (filter)
                finalFilter = filter

            let cursor = finalFilter !== undefined ? (await this.getCollection()).find(finalFilter) : (await this.getCollection()).find()

            if (sorts !== undefined)
                sorts.forEach(sort => cursor.sort(sort.field, sort.direction))

            return await cursor.limit(limit).skip(skip).toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<Order | null | undefined> {
        try { return await (await this.getCollection()).findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async getAll(sorts?: Sort): Promise<Order[]> {
        try { return await (await this.getCollection()).find({}, { sort: sorts }).toArray() }
        catch (e) { console.error(e); return [] }
    }

    async update(id: string, order: OrderUpdate): Promise<UpdateResult | false> {
        try { return await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...order, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutables(id: string, immutableFields: OrderImmutable): Promise<UpdateResult | false> {
        try { return await (await this.getCollection()).updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async payed(orderId: string | ObjectId): Promise<UpdateResult | false> {
        try { return await (await this.getCollection()).updateOne({ _id: typeof orderId === 'string' ? ObjectId.createFromHexString(orderId) : orderId }, { $set: { isPayed: true, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateForUser(userId: string | ObjectId, orderId: string | ObjectId, order: OrderUpdate): Promise<UpdateResult | false> {
        if (typeof userId === 'string')
            userId = ObjectId.createFromHexString(userId)

        if (typeof orderId === 'string')
            orderId = ObjectId.createFromHexString(orderId)

        try { return await (await this.getCollection()).updateOne({ _id: orderId, userId }, { $set: { ...order, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutablesForUser(userId: string | ObjectId, orderId: string | ObjectId, immutableFields: OrderImmutable): Promise<UpdateResult | false> {
        if (typeof userId === 'string')
            userId = ObjectId.createFromHexString(userId)

        if (typeof orderId === 'string')
            orderId = ObjectId.createFromHexString(orderId)

        try { return await (await this.getCollection()).updateOne({ _id: orderId, userId }, { $set: { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await (await this.getCollection()).deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }

    async deleteForUser(userId: string | ObjectId, orderId: string | ObjectId): Promise<DeleteResult | false> {
        if (typeof userId === 'string')
            userId = ObjectId.createFromHexString(userId)

        if (typeof orderId === 'string')
            orderId = ObjectId.createFromHexString(orderId)

        try { return await (await this.getCollection()).deleteOne({ _id: orderId, userId }) }
        catch (e) { console.error(e); return false }
    }
}
