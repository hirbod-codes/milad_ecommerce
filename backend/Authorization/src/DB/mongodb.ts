import { ClientSession, Collection, Db, GridFSBucket, MongoClient } from 'mongodb'
import { collectionName as userCollectionName, UserCreate } from './Models/User'
import { RefreshTokenCreate, collectionName as refreshTokensCollectionName } from './Models/RefreshToken'
import { PrivilegeCreate, collectionName as privilegeCollectionName } from './Models/Privilege'
import { RoleCreate, collectionName as roleCollectionName } from './Models/Role'
import { DbConfigurationError } from './Exceptions/DbConfigurationError'
import { ConnectionError } from './Exceptions/ConnectionError'
import { collectionName as userProfilePictureCollectionName } from './Models/UserProfilePicture'
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

    static unsetClient() {
        console.log('unsetting client...')
        MongoDB.client = undefined
    }

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
            let db
            if (client === undefined)
                client = MongoDB.client ?? await this.getClient()

            db = client.db(this.config.databaseName)

            return db
        } catch (error) {
            console.error(error);
            await client?.close()
            MongoDB.unsetClient()
            throw error
        }
    }

    async initializeDb(): Promise<void> {
        MongoDB.unsetClient()
        await this.addCollections()
    }

    async dropAllCollections() {
        const db = await this.getDb()
        await this.dropRefreshTokenCollection(db)
        await this.dropUserCollection(db)
        await this.dropPrivilegeCollection(db)
        await this.dropRoleCollection(db)
    }

    async dropRefreshTokenCollection(db: Db) {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(refreshTokensCollectionName))
            await db.dropCollection(refreshTokensCollectionName)
    }

    async dropUserCollection(db: Db) {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(userCollectionName))
            await db.dropCollection(userCollectionName)
    }

    async dropPrivilegeCollection(db: Db) {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(privilegeCollectionName))
            await db.dropCollection(privilegeCollectionName)
    }

    async dropRoleCollection(db: Db) {
        if ((await db.listCollections().toArray()).map(e => e.name).includes(roleCollectionName))
            await db.dropCollection(roleCollectionName)
    }

    async addCollections() {
        const db = await this.getDb()
        await this.addRefreshTokenCollection(db)
        await this.addUserCollection(db)
        await this.addPrivilegeCollection(db)
        await this.addRoleCollection(db)
    }

    private async addRefreshTokenCollection(db: Db) {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(refreshTokensCollectionName))
            await db.createCollection(refreshTokensCollectionName)

        const indexes = await db.collection(refreshTokensCollectionName).indexes()

        if (indexes.find(i => i.name === 'unique-userId') === undefined)
            await db.createIndex(refreshTokensCollectionName, { userId: 1 }, { unique: true, name: 'unique-userId' })

        if (indexes.find(i => i.name === 'refreshToken') === undefined)
            await db.createIndex(refreshTokensCollectionName, { refreshToken: 1 }, { unique: true, name: 'refreshToken' })

        if (indexes.find(i => i.name === 'expiresAt') === undefined)
            await db.createIndex(refreshTokensCollectionName, { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expiresAt' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(refreshTokensCollectionName, { createdAt: 1 }, { name: 'createdAt' })
    }

    async getRefreshTokensCollection(client?: MongoClient, db?: Db): Promise<Collection<RefreshTokenCreate>> {
        return (db ?? (await this.getDb(client))).collection<RefreshTokenCreate>(refreshTokensCollectionName)
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
            await db.createIndex(userCollectionName, { createdAt: 1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(userCollectionName, { updatedAt: 1 }, { name: 'updatedAt' })
    }

    async getUserCollection(client?: MongoClient, db?: Db): Promise<Collection<UserCreate>> {
        return (db ?? (await this.getDb(client))).collection<UserCreate>(userCollectionName)
    }

    private async addPrivilegeCollection(db: Db) {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(privilegeCollectionName))
            await db.createCollection(privilegeCollectionName)

        const indexes = await db.collection(privilegeCollectionName).indexes()

        if (indexes.find(i => i.name === 'unique-name') === undefined)
            await db.createIndex(privilegeCollectionName, { name: 1 }, { unique: true, name: 'unique-name' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(privilegeCollectionName, { createdAt: 1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(privilegeCollectionName, { updatedAt: 1 }, { name: 'updatedAt' })
    }

    async getPrivilegeCollection(client?: MongoClient, db?: Db): Promise<Collection<PrivilegeCreate>> {
        return (db ?? (await this.getDb(client))).collection<PrivilegeCreate>(privilegeCollectionName)
    }


    private async addRoleCollection(db: Db) {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(roleCollectionName))
            await db.createCollection(roleCollectionName)

        const indexes = await db.collection(roleCollectionName).indexes()

        if (indexes.find(i => i.name === 'unique-name') === undefined)
            await db.createIndex(roleCollectionName, { name: 1 }, { unique: true, name: 'unique-name' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(roleCollectionName, { createdAt: 1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(roleCollectionName, { updatedAt: 1 }, { name: 'updatedAt' })
    }

    async getRoleCollection(client?: MongoClient, db?: Db): Promise<Collection<RoleCreate>> {
        return (db ?? (await this.getDb(client))).collection<RoleCreate>(roleCollectionName)
    }

    async getUserProfilePictureBucket(client?: MongoClient, db?: Db): Promise<GridFSBucket> {
        if (!db)
            db = await this.getDb();

        if ((await db.listCollections().toArray()).map(e => e.name).includes(userProfilePictureCollectionName)) {
            const indexes = await db.collection(`${userProfilePictureCollectionName}.files`).indexes()

            if (indexes.find(i => i.name === 'unique-userId') === undefined)
                await db.createIndex(`${userProfilePictureCollectionName}.files`, { 'metadata.userId': 1 }, { unique: true, name: 'unique-userId' })
        }

        return new GridFSBucket(db, { bucketName: userProfilePictureCollectionName });
    }
}
