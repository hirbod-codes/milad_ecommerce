import { ClientSession, Collection, Db, GridFSBucket, MongoClient } from 'mongodb'
import { collectionName as userCollectionName, UserCreate } from './Models/User'
import { RefreshTokenCreate, collectionName as refreshTokensCollectionName } from './Models/RefreshToken'
import { PrivilegeCreate, collectionName as privilegeCollectionName } from './Models/Privilege'
import { RoleCreate, collectionName as roleCollectionName } from './Models/Role'
import { DbConfigurationError } from './Exceptions/DbConfigurationError'
import { ConnectionError } from './Exceptions/ConnectionError'
import { collectionName as userProfilePictureCollectionName } from './Models/UserProfilePicture'

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
        await this.addRefreshTokenCollection()
        await this.addUserCollection()
        await this.addPrivilegeCollection()
        await this.addRoleCollection()
    }

    private async addRefreshTokenCollection() {
        const db = await this.getDb();

        if (!(await db.listCollections().toArray()).map(e => e.name).includes(refreshTokensCollectionName))
            await db.createCollection(refreshTokensCollectionName)

        const indexes = await db.collection(refreshTokensCollectionName).indexes()

        if (indexes.find(i => i.name === 'unique-username') === undefined)
            await db.createIndex(refreshTokensCollectionName, { username: 1 }, { unique: true, name: 'unique-username' })

        if (indexes.find(i => i.name === 'refreshToken') === undefined)
            await db.createIndex(refreshTokensCollectionName, { refreshToken: 1 }, { name: 'refreshToken' })

        if (indexes.find(i => i.name === 'expiresAt') === undefined)
            await db.createIndex(refreshTokensCollectionName, { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expiresAt' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(refreshTokensCollectionName, { createdAt: 1 }, { name: 'createdAt' })
    }

    async getRefreshTokensCollection(client?: MongoClient, db?: Db): Promise<Collection<RefreshTokenCreate>> {
        return (db ?? (await this.getDb(client))).collection<RefreshTokenCreate>(refreshTokensCollectionName)
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

    async getUserCollection(client?: MongoClient, db?: Db): Promise<Collection<UserCreate>> {
        return (db ?? (await this.getDb(client))).collection<UserCreate>(userCollectionName)
    }

    private async addPrivilegeCollection() {
        const db = await this.getDb();

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


    private async addRoleCollection() {
        const db = await this.getDb();

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
        return new GridFSBucket(db ?? (await this.getDb(client)), { bucketName: userProfilePictureCollectionName });
    }
}
