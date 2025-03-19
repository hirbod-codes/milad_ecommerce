import { Collection } from 'mongodb'
import { RoleWithPrivileges, RoleCreate } from '../Models/Role'
import { collectionName } from '../Models/Privilege'

export class RoleRepository {
    private collection: Collection<RoleCreate>
    private rolesWithPrivileges: RoleWithPrivileges[] = []

    constructor(collection: Collection<RoleCreate>) {
        this.collection = collection
    }

    async getRolesWithPrivileges(): Promise<RoleWithPrivileges[] | false> {
        if (!this.rolesWithPrivileges || this.rolesWithPrivileges.length === 0)
            return false

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
