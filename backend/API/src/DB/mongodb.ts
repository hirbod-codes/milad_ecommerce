import { ClientSession, Collection, Db, GridFSBucket, MongoClient } from 'mongodb'
import { DbConfigurationError } from './Exceptions/DbConfigurationError'
import { ConnectionError } from './Exceptions/ConnectionError'
import { User, collectionName as userCollectionName } from './Models/User'
import { RoleCreate, collectionName as roleCollectionName } from './Models/Role'
import { CategoryCreate, collectionName as categoryCollectionName } from './Models/Category'
import { OrderCreate, collectionName as orderCollectionName } from './Models/Order'
import { ProductCreate, collectionName as productCollectionName } from './Models/Products/Product'
import { ProductSaleCreate, collectionName as productSaleCollectionName } from './Models/Products/ProductSale'
import { ProductStatisticsCreate, collectionName as productStatisticsCollectionName } from './Models/Products/ProductStatistics'
import { ProductReviewCreate, collectionName as productReviewCollectionName } from './Models/Products/ProductReview'
import { ProductViewCreate, collectionName as productViewCollectionName } from './Models/Products/ProductView'
import { TagCreate, collectionName as tagCollectionName } from './Models/Tag'
import { collectionName as productPictureCollectionName } from './Models/Products/ProductPicture'
import { dbConfig } from '..'

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
    private static client: MongoClient | undefined = undefined

    static getDbInstance() {
        return new MongoDB()
    }

    private config: MongodbConfig

    constructor() {
        this.config = dbConfig
    }

    async checkConnectionHealth(): Promise<boolean> {
        try {
            const db = await this.getDb(await this.getClient())
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
        try {
            if (MongoDB.client !== undefined)
                return MongoDB.client

            console.log('creating mongodb client...')

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

            try {
                const adminDb = client.db().admin();
                await adminDb.ping();
                console.log('MongoDB is healthy');
            } catch (e) {
                console.error('MongoDB health check failed:', e)
                throw e
            }

            MongoDB.client = client

            return client
        } catch (error) {
            console.error(error)

            if (error instanceof DbConfigurationError)
                throw error
            else
                throw new ConnectionError()
        }
    }

    async getDb(client?: MongoClient): Promise<Db> {
        try {
            if (client === undefined)
                client = MongoDB.client ?? await this.getClient()

            return client.db(this.config.databaseName)
        } catch (error) {
            console.error(error);
            await client?.close()
            MongoDB.client = undefined
            throw error
        }
    }

    async initializeDb(): Promise<void> {
        MongoDB.client = undefined
        await this.addCollections()
    }

    async dropAllCollections() {
        const db = await this.getDb()
        await this.dropCategoryCollection(db)
        await this.dropTagCollection(db)
        await this.dropOrderCollection(db)
        await this.dropProductCollection(db)
        await this.dropProductReviewsCollection(db)
        await this.dropProductViewCollection(db)
        await this.dropProductSaleCollection(db)
        // await this.dropProductStatisticsCollection(db)
    }

    async dropCategoryCollection(db: Db) {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(categoryCollectionName))
            await db.dropCollection(categoryCollectionName)
    }

    async dropOrderCollection(db: Db) {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(orderCollectionName))
            await db.dropCollection(orderCollectionName)
    }

    async dropProductCollection(db: Db) {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(productCollectionName))
            await db.dropCollection(productCollectionName)
    }

    async dropProductReviewsCollection(db: Db) {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(productReviewCollectionName))
            await db.dropCollection(productReviewCollectionName)
    }

    async dropProductViewCollection(db: Db) {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(productViewCollectionName))
            await db.dropCollection(productViewCollectionName)
    }

    async dropTagCollection(db: Db) {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(tagCollectionName))
            await db.dropCollection(tagCollectionName)
    }

    async dropProductSaleCollection(db: Db) {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(productSaleCollectionName))
            await db.dropCollection(productSaleCollectionName)
    }

    // async dropProductStatisticsCollection(db: Db) {
    //     if ((await db.listCollections().toArray()).map(e => e.name).includes(productStatisticsCollectionName))
    //         await db.dropCollection(productStatisticsCollectionName)
    // }

    async addCollections() {
        const db = await this.getDb()

        await this.addUserCollection(db)
        await this.addCategoryCollection(db)
        await this.addOrderCollection(db)
        await this.addProductCollection(db)
        await this.addProductSaleCollection(db)
        await this.addProductViewCollection(db)
        await this.addProductStatisticsCollection(db)
        await this.addProductReviewsCollection(db)
        await this.addTagCollection(db)
        await this.addRoleCollection(db)
    }

    private async addUserCollection(db: Db) {
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
            await db.createIndex(userCollectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(userCollectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    async getUserCollection(client?: MongoClient, db?: Db): Promise<Collection<User>> {
        return (db ?? (await this.getDb(client))).collection<User>(userCollectionName)
    }

    private async addCategoryCollection(db: Db) {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(categoryCollectionName))
            await db.createCollection(categoryCollectionName)

        const indexes = await db.collection(categoryCollectionName).indexes()

        if (indexes.find(i => i.name === 'unique-name') === undefined)
            await db.createIndex(categoryCollectionName, { name: 1 }, { unique: true, name: 'unique-name' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(categoryCollectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(categoryCollectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    async getCategoryCollection(client?: MongoClient, db?: Db): Promise<Collection<CategoryCreate>> {
        return (db ?? (await this.getDb(client))).collection<CategoryCreate>(categoryCollectionName)
    }

    private async addOrderCollection(db: Db) {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(orderCollectionName))
            await db.createCollection(orderCollectionName)

        const indexes = await db.collection(orderCollectionName).indexes()

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(orderCollectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(orderCollectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    async getOrderCollection(client?: MongoClient, db?: Db): Promise<Collection<OrderCreate>> {
        return (db ?? (await this.getDb(client))).collection<OrderCreate>(orderCollectionName)
    }

    //////////////////////////// Product collections

    private async addProductCollection(db: Db) {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(productCollectionName))
            await db.createCollection(productCollectionName)

        const indexes = await db.collection(productCollectionName).indexes()

        if (indexes.find(i => i.name === 'unique-name') === undefined)
            await db.createIndex(productCollectionName, { name: 1 }, { unique: true, name: 'unique-name' })

        if (indexes.find(i => i.name === 'search') === undefined)
            await db.createIndex(
                productCollectionName,
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
            await db.createIndex(productCollectionName, { dailyOrderZScore: -1 }, { name: 'dailyOrderZScore' })

        if (indexes.find(i => i.name === 'weeklyOrderZScore') === undefined)
            await db.createIndex(productCollectionName, { weeklyOrderZScore: -1 }, { name: 'weeklyOrderZScore' })

        if (indexes.find(i => i.name === 'yearlyOrderZScore') === undefined)
            await db.createIndex(productCollectionName, { yearlyOrderZScore: -1 }, { name: 'yearlyOrderZScore' })

        if (indexes.find(i => i.name === 'categories') === undefined)
            await db.createIndex(productCollectionName, { categories: -1 }, { name: 'categories' })

        if (indexes.find(i => i.name === 'tags') === undefined)
            await db.createIndex(productCollectionName, { tags: -1 }, { name: 'tags' })

        if (indexes.find(i => i.name === 'isAvailable') === undefined)
            await db.createIndex(productCollectionName, { isAvailable: -1 }, { name: 'isAvailable' })

        if (indexes.find(i => i.name === 'reviewsCount') === undefined)
            await db.createIndex(productCollectionName, { reviewsCount: -1 }, { name: 'reviewsCount' })

        if (indexes.find(i => i.name === 'averageRating') === undefined)
            await db.createIndex(productCollectionName, { averageRating: -1 }, { name: 'averageRating' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(productCollectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(productCollectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    async getProductCollection(client?: MongoClient, db?: Db): Promise<Collection<ProductCreate>> {
        return (db ?? (await this.getDb(client))).collection<ProductCreate>(productCollectionName)
    }

    private async addProductReviewsCollection(db: Db) {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(productReviewCollectionName))
            await db.createCollection(productReviewCollectionName)

        const indexes = await db.collection(productReviewCollectionName).indexes()

        if (indexes.find(i => i.name === 'uniqueness') === undefined)
            await db.createIndex(productReviewCollectionName, { userId: 1, productId: 1 }, { unique: true, name: 'uniqueness' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(productReviewCollectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(productReviewCollectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    async getProductReviewsCollection(client?: MongoClient, db?: Db): Promise<Collection<ProductReviewCreate>> {
        return (db ?? (await this.getDb(client))).collection<ProductReviewCreate>(productReviewCollectionName)
    }

    private async addProductViewCollection(db: Db) {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(productViewCollectionName))
            await db.createCollection(productViewCollectionName)

        const indexes = await db.collection(productViewCollectionName).indexes()

        if (indexes.find(i => i.name === 'uniqueness') === undefined)
            await db.createIndex(productViewCollectionName, { productId: 1 }, { unique: true, name: 'uniqueness' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(productViewCollectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(productViewCollectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    async getProductViewCollection(client?: MongoClient, db?: Db): Promise<Collection<ProductViewCreate>> {
        return (db ?? (await this.getDb(client))).collection<ProductViewCreate>(productViewCollectionName)
    }

    private async addProductSaleCollection(db: Db) {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(productSaleCollectionName))
            await db.createCollection(productSaleCollectionName, { timeseries: { timeField: 'timestamp', granularity: 'hours', metaField: 'metadata' }, expireAfterSeconds: 5 * 12 * 30 * 24 * 60 * 60 })

        const indexes = await db.collection(productSaleCollectionName).indexes()

        if (indexes.find(i => i.name === 'productId') === undefined)
            await db.createIndex(productSaleCollectionName, { 'metadata.productId': 1 }, { name: 'productId' })

        if (indexes.find(i => i.name === 'userId') === undefined)
            await db.createIndex(productSaleCollectionName, { 'metadata.userId': 1 }, { name: 'userId' })

        if (indexes.find(i => i.name === 'quantity') === undefined)
            await db.createIndex(productSaleCollectionName, { 'metadata.quantity': 1 }, { name: 'quantity' })
    }

    async getProductSaleCollection(client?: MongoClient, db?: Db): Promise<Collection<ProductSaleCreate>> {
        return (db ?? (await this.getDb(client))).collection<ProductSaleCreate>(productSaleCollectionName)
    }

    private async addProductStatisticsCollection(db: Db) {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(productStatisticsCollectionName))
            await db.createCollection(productStatisticsCollectionName)

        const indexes = await db.collection(productStatisticsCollectionName).indexes()

        if (indexes.find(i => i.name === 'timestamp') === undefined)
            await db.createIndex(productStatisticsCollectionName, { timestamp: -1 }, { name: 'timestamp' })

        if (indexes.find(i => i.name === 'productId') === undefined)
            await db.createIndex(productStatisticsCollectionName, { productId: -1 }, { name: 'productId' })

        if (indexes.find(i => i.name === 'tags') === undefined)
            await db.createIndex(productStatisticsCollectionName, { tags: 1 }, { name: 'tags' })

        if (indexes.find(i => i.name === 'categories') === undefined)
            await db.createIndex(productStatisticsCollectionName, { categories: 1 }, { name: 'categories' })

        if (indexes.find(i => i.name === 'count') === undefined)
            await db.createIndex(productStatisticsCollectionName, { count: -1 }, { name: 'count' })

        if (indexes.find(i => i.name === 'duration') === undefined)
            await db.createIndex(productStatisticsCollectionName, { duration: -1 }, { name: 'duration' })

        if (indexes.find(i => i.name === 'zScore') === undefined)
            await db.createIndex(productStatisticsCollectionName, { zScore: -1 }, { name: 'zScore' })
    }

    async getProductStatisticsCollection(client?: MongoClient, db?: Db): Promise<Collection<ProductStatisticsCreate>> {
        return (db ?? (await this.getDb(client))).collection<ProductStatisticsCreate>(productStatisticsCollectionName)
    }

    async getProductPictureBucket(client?: MongoClient, db?: Db): Promise<GridFSBucket> {
        return new GridFSBucket(db ?? (await this.getDb(client)), { bucketName: productPictureCollectionName });
    }

    //////////////////////////// 

    private async addTagCollection(db: Db) {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(tagCollectionName))
            await db.createCollection(tagCollectionName)

        const indexes = await db.collection(tagCollectionName).indexes()

        if (indexes.find(i => i.name === 'unique-name') === undefined)
            await db.createIndex(tagCollectionName, { name: 1 }, { unique: true, name: 'unique-name' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(tagCollectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(tagCollectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    async getTagCollection(client?: MongoClient, db?: Db): Promise<Collection<TagCreate>> {
        return (db ?? (await this.getDb(client))).collection<TagCreate>(tagCollectionName)
    }

    private async addRoleCollection(db: Db) {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(roleCollectionName))
            await db.createCollection(roleCollectionName)

        const indexes = await db.collection(roleCollectionName).indexes()

        if (indexes.find(i => i.name === 'unique-name') === undefined)
            await db.createIndex(roleCollectionName, { name: 1 }, { unique: true, name: 'unique-name' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(roleCollectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(roleCollectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    async getRoleCollection(client?: MongoClient, db?: Db): Promise<Collection<RoleCreate>> {
        return (db ?? (await this.getDb(client))).collection<RoleCreate>(roleCollectionName)
    }
}
