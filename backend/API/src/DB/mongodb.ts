import { ClientSession, Collection, Db, GridFSBucket, MongoClient } from 'mongodb'
import { DbConfigurationError } from './Exceptions/DbConfigurationError'
import { ConnectionError } from './Exceptions/ConnectionError'
import { User, collectionName as userCollectionName } from './Models/User'
import { RoleCreate, collectionName as roleCollectionName } from './Models/Role'
import { CategoryCreate, collectionName as categoryCollectionName } from './Models/Category'
import { OrderCreate, collectionName as orderCollectionName } from './Models/Order'
import { ProductCreate, collectionName as productCollectionName } from './Models/Product'
import { ProductReviewCreate, collectionName as productReviewCollectionName } from './Models/ProductReview'
import { TagCreate, collectionName as tagCollectionName } from './Models/Tag'
import { collectionName as productPictureCollectionName } from './Models/ProductPicture'

export type MongodbConfig = {
    supportsTransaction: boolean;
    url: string;
    databaseName: string;
    auth?: {
        username: string;
        password: string;
    };
}

export class MongoDB {
    private static db: Db | null = null

    private config: MongodbConfig

    constructor(config: MongodbConfig) {
        this.config = config
    }

    async checkConnectionHealth(): Promise<boolean> {
        try {
            const db = await this.getDb(await this.getClient(), false)
            const stats = await db.stats()
            console.log({ stats })
            return stats.ok as boolean
        } catch (error) {
            console.error(error)
            return false
        }
    }

    protected transactionClient: MongoClient | undefined = undefined
    protected session: ClientSession | undefined = undefined

    async startTransaction(): Promise<void> {
        const funcName = 'startTransaction'

        console.log(funcName, 'called')

        const supportsTransaction = this.config?.supportsTransaction
        if (!supportsTransaction) {
            console.log(funcName, 'Transactions are not supported.')
            return
        }

        this.transactionClient = await this.getClient()
        this.session = this.transactionClient.startSession()

        this.session.startTransaction()
    }

    async abortTransaction(): Promise<void> {
        const funcName = 'abortTransaction'

        console.log(funcName, 'called')

        const supportsTransaction = this.config?.supportsTransaction
        if (!supportsTransaction) {
            console.log(funcName, 'Transactions are not supported.')
            return
        }

        await this.session?.abortTransaction()
    }

    async commitTransaction(): Promise<void> {
        const funcName = 'commitTransaction'

        console.log(funcName, 'called')

        const supportsTransaction = this.config?.supportsTransaction
        if (!supportsTransaction) {
            console.log(funcName, 'Transactions are not supported.')
            return
        }

        await this.session?.commitTransaction()
    }

    async endSession(): Promise<void> {
        const funcName = 'endSession'

        console.log(funcName, 'called')

        const supportsTransaction = this.config?.supportsTransaction
        if (!supportsTransaction) {
            console.log(funcName, 'Transactions are not supported.')
            return
        }

        await this.session?.endSession()
    }

    async getClient(): Promise<MongoClient> {
        console.group('getClient')

        try {
            const c = this.config

            if (!c || !c)
                throw new Error('Mongodb configuration not found.')

            const client = new MongoClient(c.url, {
                authMechanism: "DEFAULT",
                auth: c.auth
                    ? {
                        username: c.auth.username,
                        password: c.auth.password,
                    }
                    : undefined
            })

            await client.connect()

            return client
        } catch (error) {
            console.error(error)

            if (error instanceof DbConfigurationError)
                throw error
            else
                throw new ConnectionError()
        } finally {
            console.groupEnd()
        }
    }

    async getDb(client?: MongoClient, useCache = true): Promise<Db> {
        console.group('getDb')

        try {
            if (useCache && MongoDB.db)
                return MongoDB.db

            let db
            if (!client) {
                client = await this.getClient()
                db = client.db(this.config.databaseName)
            }
            else
                db = client.db(this.config.databaseName)

            MongoDB.db = db

            try {
                const pingResult = await db.command({ ping: 1 })

                console.log({ pingResult })
            } catch (error) {
                console.error(error);
                await client?.close()
                throw error
            }

            return db
        } finally {
            console.groupEnd()
        }
    }

    async initializeDb(): Promise<void> {
        await this.getDb(undefined, false)
        await this.addCollections()
    }

    async addCollections() {
        await this.addUserCollection()
        await this.addCategoryCollection()
        await this.addOrderCollection()
        await this.addProductCollection()
        await this.addProductReviewsCollection()
        await this.addTagCollection()
        await this.addRoleCollection()
    }

    private async addUserCollection() {
        const db = await this.getDb();

        if (!(await db.listCollections().toArray()).map(e => e.name).includes(userCollectionName))
            await db.createCollection(userCollectionName)

        const indexes = await db.collection(userCollectionName).indexes()

        if (indexes.find(i => i.name === 'unique-username') === undefined)
            await db.createIndex(userCollectionName, { username: 1 }, { unique: true, name: 'unique-username' })

        if (indexes.find(i => i.name === 'unique-email') === undefined)
            await db.createIndex(userCollectionName, { email: 1 }, { sparse: true, unique: true, name: 'email' })

        if (indexes.find(i => i.name === 'unique-phoneNumber') === undefined)
            await db.createIndex(userCollectionName, { phoneNumber: 1 }, { sparse: true, unique: true, name: 'phoneNumber' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(userCollectionName, { createdAt: 1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(userCollectionName, { updatedAt: 1 }, { name: 'updatedAt' })
    }

    async getUserCollection(client?: MongoClient, db?: Db): Promise<Collection<User>> {
        return (db ?? (await this.getDb(client))).collection<User>(userCollectionName)
    }

    private async addCategoryCollection() {
        const db = await this.getDb();

        if (!(await db.listCollections().toArray()).map(e => e.name).includes(categoryCollectionName))
            await db.createCollection(categoryCollectionName)

        const indexes = await db.collection(categoryCollectionName).indexes()

        if (indexes.find(i => i.name === 'unique-name') === undefined)
            await db.createIndex(categoryCollectionName, { name: 1 }, { unique: true, name: 'unique-name' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(categoryCollectionName, { createdAt: 1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(categoryCollectionName, { updatedAt: 1 }, { name: 'updatedAt' })
    }

    async getCategoryCollection(client?: MongoClient, db?: Db): Promise<Collection<CategoryCreate>> {
        return (db ?? (await this.getDb(client))).collection<CategoryCreate>(categoryCollectionName)
    }

    private async addOrderCollection() {
        const db = await this.getDb();

        if (!(await db.listCollections().toArray()).map(e => e.name).includes(orderCollectionName))
            await db.createCollection(orderCollectionName)

        const indexes = await db.collection(orderCollectionName).indexes()

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(orderCollectionName, { createdAt: 1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(orderCollectionName, { updatedAt: 1 }, { name: 'updatedAt' })
    }

    async getOrderCollection(client?: MongoClient, db?: Db): Promise<Collection<OrderCreate>> {
        return (db ?? (await this.getDb(client))).collection<OrderCreate>(orderCollectionName)
    }

    private async addProductCollection() {
        const db = await this.getDb();

        if (!(await db.listCollections().toArray()).map(e => e.name).includes(productCollectionName))
            await db.createCollection(productCollectionName)

        const indexes = await db.collection(productCollectionName).indexes()

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(productCollectionName, { createdAt: 1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(productCollectionName, { updatedAt: 1 }, { name: 'updatedAt' })
    }

    async getProductCollection(client?: MongoClient, db?: Db): Promise<Collection<ProductCreate>> {
        return (db ?? (await this.getDb(client))).collection<ProductCreate>(productCollectionName)
    }

    private async addProductReviewsCollection() {
        const db = await this.getDb();

        if (!(await db.listCollections().toArray()).map(e => e.name).includes(productReviewCollectionName))
            await db.createCollection(productReviewCollectionName)

        const indexes = await db.collection(productReviewCollectionName).indexes()

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(productReviewCollectionName, { createdAt: 1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(productReviewCollectionName, { updatedAt: 1 }, { name: 'updatedAt' })
    }

    async getProductReviewsCollection(client?: MongoClient, db?: Db): Promise<Collection<ProductReviewCreate>> {
        return (db ?? (await this.getDb(client))).collection<ProductReviewCreate>(productReviewCollectionName)
    }

    private async addTagCollection() {
        const db = await this.getDb();

        if (!(await db.listCollections().toArray()).map(e => e.name).includes(tagCollectionName))
            await db.createCollection(tagCollectionName)

        const indexes = await db.collection(tagCollectionName).indexes()

        if (indexes.find(i => i.name === 'unique-name') === undefined)
            await db.createIndex(tagCollectionName, { name: 1 }, { unique: true, name: 'unique-name' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(tagCollectionName, { createdAt: 1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(tagCollectionName, { updatedAt: 1 }, { name: 'updatedAt' })
    }

    async getTagCollection(client?: MongoClient, db?: Db): Promise<Collection<TagCreate>> {
        return (db ?? (await this.getDb(client))).collection<TagCreate>(tagCollectionName)
    }

    private async addRoleCollection() {
        const db = await this.getDb();

        if (!(await db.listCollections().toArray()).map(e => e.name).includes(roleCollectionName))
            await db.createCollection(roleCollectionName)
    }

    async getRoleCollection(client?: MongoClient, db?: Db): Promise<Collection<RoleCreate>> {
        return (db ?? (await this.getDb(client))).collection<RoleCreate>(roleCollectionName)
    }

    async getProductPictureBucket(client?: MongoClient, db?: Db): Promise<GridFSBucket> {
        return new GridFSBucket(db ?? (await this.getDb(client)), { bucketName: productPictureCollectionName });
    }
}
