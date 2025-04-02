export type Role = {
    _id: string
    name: string
    displayName: { [k: string]: string }
    privileges: string[]
    createdAt: number
    updatedAt: number
}
