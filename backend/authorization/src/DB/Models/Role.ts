import { array, InferType, mixed, number, object, string } from "yup";
import { Privilege } from "./Privilege";
import { likeObjectId, localizedText, uniqueArrayTest } from "./common_schemas";

export const collectionName = 'role'

export const schemaVersion = 'v1.0.0'

export const roleSchema = object().required().noUnknown(true).strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    name: string().required(),
    displayName: localizedText,
    privileges: array().required().min(0).of(likeObjectId.required()).test('unique-array', uniqueArrayTest),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Role = InferType<typeof roleSchema>

export const roleWithPrivilegesSchema = roleSchema.omit(['privileges']).shape({
    privileges: array().required().min(0).of(mixed<Privilege>().required()),
})
export type RoleWithPrivileges = InferType<typeof roleWithPrivilegesSchema>

export const roleInputSchema = roleSchema.required().noUnknown(true).strict(true).pick(['name', 'privileges', 'displayName'])
export type RoleInput = InferType<typeof roleInputSchema>

export const roleCreateSchema = roleSchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: likeObjectId.optional() })
export type RoleCreate = InferType<typeof roleCreateSchema>

export const roleUpdateSchema = roleSchema.required().noUnknown(true).strict(true).pick(['privileges'])
for (const field in roleUpdateSchema.fields)
    if (Object.prototype.hasOwnProperty.call(roleUpdateSchema.fields, field))
        (roleUpdateSchema.fields as any)[field] = (roleUpdateSchema.fields as any)[field].optional()
export type RoleUpdate = InferType<typeof roleUpdateSchema>

export const roleImmutableSchema = roleSchema.required().noUnknown(true).strict(true).pick(Object.keys(roleSchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(roleUpdateSchema.fields)).includes(f)) as any)
for (const field in roleImmutableSchema.fields)
    if (Object.prototype.hasOwnProperty.call(roleImmutableSchema.fields, field))
        (roleImmutableSchema.fields as any)[field] = (roleImmutableSchema.fields as any)[field].optional()
export type RoleImmutable = InferType<typeof roleImmutableSchema>

export const fields: (keyof Role)[] = Object.keys(roleSchema.fields) as any
export const readableFields: (keyof Omit<Role, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
export const updatableFields: (keyof RoleUpdate)[] = Object.keys(roleUpdateSchema.fields) as any
