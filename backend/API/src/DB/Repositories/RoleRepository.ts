import { Collection } from 'mongodb'
import { RoleWithPrivileges, RoleCreate } from '../Models/Role'
import { collectionName } from '../Models/Privilege'
import { MongoDB } from '../mongodb'

export class RoleRepository extends MongoDB {
    private collection: Collection<RoleCreate>
    private rolesWithPrivileges: RoleWithPrivileges[] = []

    constructor(collection: Collection<RoleCreate>) {
        super();
        this.collection = collection
    }

    static async getInstance(mongoDB?: MongoDB): Promise<RoleRepository> {
        return new RoleRepository(await (mongoDB ? mongoDB : MongoDB.getDbInstance()).getRoleCollection())
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
            queriedRoles = await this.collection.aggregate()
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
