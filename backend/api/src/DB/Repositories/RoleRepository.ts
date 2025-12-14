import { ClientSession, Collection, Db } from 'mongodb'
import { RoleWithPrivileges, RoleCreate } from '../Models/Role'
import { collectionName } from '../Models/Privilege'
import { IRepository, MongoDB } from '@monorepo/mongodb';

export class RoleRepository implements IRepository {
    IRepository: 'IRepository' = 'IRepository';

    private session: ClientSession | undefined = undefined

    setTransactionSession(session?: ClientSession): void {
        this.session = session
    }

    unsetTransactionSession(): void {
        this.session = undefined
    }

    private rolesWithPrivileges: RoleWithPrivileges[] = []

    async addCollection(db: Db): Promise<void> {
        if (!(await db.listCollections().toArray()).map(e => e.name).includes(collectionName))
            await db.createCollection(collectionName)

        const indexes = await db.collection(collectionName).indexes()

        if (indexes.find(i => i.name === 'unique-name') === undefined)
            await db.createIndex(collectionName, { name: 1 }, { unique: true, name: 'unique-name' })

        if (indexes.find(i => i.name === 'createdAt') === undefined)
            await db.createIndex(collectionName, { createdAt: -1 }, { name: 'createdAt' })

        if (indexes.find(i => i.name === 'updatedAt') === undefined)
            await db.createIndex(collectionName, { updatedAt: -1 }, { name: 'updatedAt' })
    }

    private async getCollection(): Promise<Collection<RoleCreate>> {
        return (await MongoDB.getDb()).collection<RoleCreate>(collectionName)
    }

    async getRolesWithPrivileges(): Promise<RoleWithPrivileges[] | false> {
        if (!this.rolesWithPrivileges || this.rolesWithPrivileges.length === 0) {
            await this.fetchRolesWithPrivileges()

            if (!this.rolesWithPrivileges || this.rolesWithPrivileges.length === 0)
                return false
        }

        return this.rolesWithPrivileges
    }

    async fetchRolesWithPrivileges(): Promise<RoleWithPrivileges[] | false> {
        let queriedRoles: RoleWithPrivileges[] = []
        try {
            queriedRoles = await (await this.getCollection()).aggregate()
                .lookup({
                    from: collectionName,
                    localField: 'privileges',
                    foreignField: '_id',
                    as: 'privileges'
                })
                .toArray() as RoleWithPrivileges[]
        }
        catch (e) { console.error(e); return false }

        if (!queriedRoles || queriedRoles.length === 0)
            return false

        // In Memory cache
        this.rolesWithPrivileges = queriedRoles

        return this.rolesWithPrivileges
    }
}
