import { Collection, DeleteResult, Filter, InsertOneResult, MongoSystemError, ObjectId, SortDirection, UpdateResult } from 'mongodb'
import { Order, OrderCreate, OrderImmutable, OrderInput, OrderUpdate, schemaVersion } from '../Models/Order'
import { DateTime } from 'luxon'
import { MongoDB } from '../mongodb';
import { faker } from '@faker-js/faker/.';
import { ProductRepository } from './ProductRepository';
import { UserRepository } from './UserRepository';

export class OrderRepository extends MongoDB {
    private collection: Collection<OrderCreate>

    constructor(collection: Collection<OrderCreate>) {
        super();
        this.collection = collection
    }

    static async getInstance(): Promise<OrderRepository> {
        return new OrderRepository(await MongoDB.getDbInstance().getOrderCollection())
    }

    static async seed(count: number = 150) {
        const collection = await MongoDB.getDbInstance().getOrderCollection()
        const productRepository = await ProductRepository.getInstance()
        const userRepository = await UserRepository.getInstance()

        if (!(await collection.deleteMany()).acknowledged)
            throw new Error('seeding users failed!')

        const users = await userRepository.get()
        if (users.length === 0)
            throw new Error('seeding users failed!')

        const products = await productRepository.getAll()
        if (products.length === 0)
            throw new Error('seeding users failed!')

        const startTimeTS = DateTime.utc().minus({ years: 2 }).toUnixInteger()
        const endTimeTS = DateTime.utc().minus({ months: 2 }).toUnixInteger()

        for (let i = 0; i < count; i++) {
            let safety = 0
            while (safety < 10) {
                safety++
                try {
                    const ts = faker.number.int({ min: startTimeTS, max: endTimeTS })

                    const selectedProducts = faker.helpers.arrayElements(products, faker.number.int({ min: 3 }))
                    const cost = { IRR: selectedProducts.reduce((p, c) => p + c.price.IRR, 0), USD: selectedProducts.reduce((p, c) => p + c.price.USD, 0) }

                    let r = await collection.insertOne({
                        schemaVersion,
                        userId: faker.helpers.arrayElement(users)._id.toString(),
                        isPayed: true,
                        isSent: faker.datatype.boolean(0.5),
                        products: selectedProducts.map(m => m._id),
                        cost,
                        address: {
                            text: faker.lorem.lines({ min: 1, max: 5 }),
                            googleMap: faker.internet.url()
                        },
                        createdAt: ts,
                        updatedAt: ts,
                    })
                    if (r.acknowledged)
                        break
                } catch (e) {
                    if (!(e instanceof MongoSystemError) || e.code !== 11000)
                        throw e
                }
            }
        }
    }

    async create(userId: string | ObjectId, order: OrderInput, cost: { [k: string]: number }): Promise<InsertOneResult | false> {
        const ts = DateTime.utc().toUnixInteger()

        if (typeof userId === 'string')
            userId = ObjectId.createFromHexString(userId)

        order.products = order.products.map(p => typeof p === 'string' ? ObjectId.createFromHexString(p) : p)

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

        try { return await this.collection.insertOne(o) }
        catch (e) { console.error(e); return false }
    }

    async get(filter: Filter<Order>, sorts: { field: keyof Order, direction: SortDirection }[], limit: number, skip: number, userId?: string): Promise<Order[] | false> {
        try {
            let cursor = this.collection.find(userId === undefined ? filter : { $and: [filter, { userId: ObjectId.createFromHexString(userId) }] })

            sorts.forEach(sort => cursor.sort(sort.field, sort.direction))

            return await cursor.limit(limit).skip(skip).toArray()
        }
        catch (e) { console.error(e); return false }
    }

    async getById(id: string): Promise<Order | null | undefined> {
        try { return await this.collection.findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) {
            console.error(e)
            return undefined
        }
    }

    async update(id: string, order: OrderUpdate): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...order, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutables(id: string, immutableFields: OrderImmutable): Promise<UpdateResult | false> {
        try { return await this.collection.updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async delete(id: string): Promise<DeleteResult | false> {
        try { return await this.collection.deleteOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return false }
    }

    async updateForUser(userId: string | ObjectId, orderId: string | ObjectId, order: OrderUpdate): Promise<UpdateResult | false> {
        if (typeof userId === 'string')
            userId = ObjectId.createFromHexString(userId)

        if (typeof orderId === 'string')
            orderId = ObjectId.createFromHexString(orderId)

        try { return await this.collection.updateOne({ _id: orderId, userId }, { $set: { ...order, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async updateImmutablesForUser(userId: string | ObjectId, orderId: string | ObjectId, immutableFields: OrderImmutable): Promise<UpdateResult | false> {
        if (typeof userId === 'string')
            userId = ObjectId.createFromHexString(userId)

        if (typeof orderId === 'string')
            orderId = ObjectId.createFromHexString(orderId)

        try { return await this.collection.updateOne({ _id: orderId, userId }, { $set: { ...immutableFields, updatedAt: DateTime.utc().toUnixInteger() } }) }
        catch (e) { console.error(e); return false }
    }

    async deleteForUser(userId: string | ObjectId, orderId: string | ObjectId): Promise<DeleteResult | false> {
        if (typeof userId === 'string')
            userId = ObjectId.createFromHexString(userId)

        if (typeof orderId === 'string')
            orderId = ObjectId.createFromHexString(orderId)

        try { return await this.collection.deleteOne({ _id: orderId, userId }) }
        catch (e) { console.error(e); return false }
    }
}
