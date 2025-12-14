import { collectionName, User } from "../Models/User";
import { ClientSession, Collection, Db, ObjectId } from 'mongodb'
import { IRepository, MongoDB } from '@monorepo/mongodb';

export class UserRepository implements IRepository {
    IRepository: 'IRepository' = 'IRepository';

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

        if (indexes.find(i => i.name === 'unique-username') === undefined)
            await db.createIndex(collectionName, { username: 1 }, { unique: true, name: 'unique-username' })

        if (indexes.find(i => i.name === 'unique-email') === undefined)
            await db.createIndex(collectionName, { email: 1 }, { sparse: true, unique: true, name: 'email' })

        if (indexes.find(i => i.name === 'unique-phoneNumber') === undefined)
            await db.createIndex(collectionName, { phoneNumber: 1 }, { sparse: true, unique: true, name: 'phoneNumber' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(collectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(collectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    private async getCollection(): Promise<Collection<User>> {
        return (await MongoDB.getDb()).collection<User>(collectionName)
    }

    async getById(id: string): Promise<User | null | undefined> {
        try { return await (await this.getCollection()).findOne({ _id: ObjectId.createFromHexString(id) }) }
        catch (e) { console.error(e); return undefined }
    }

    async get(): Promise<User[]> {
        try { return await (await this.getCollection()).find().toArray() }
        catch (e) { console.error(e); return [] }
    }
}
