import { InferType, mixed, number, object, string } from "yup";
import { likeObjectId, localizedText } from "@monorepo/mongodb";

export const collectionName = 'privilege'

export const schemaVersion = 'v1.0.0'

export const privilegeSchema = object().required().noUnknown(true).strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    name: string().required(),
    displayName: localizedText,
    value: mixed<string | number | boolean>().required(),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Privilege = InferType<typeof privilegeSchema>

export const privilegeInputSchema = privilegeSchema.required().noUnknown(true).strict(true).pick(['name', 'value', 'displayName'])
export type PrivilegeInput = InferType<typeof privilegeInputSchema>

export const privilegeCreateSchema = privilegeSchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: likeObjectId.optional() })
export type PrivilegeCreate = InferType<typeof privilegeCreateSchema>

export const privilegeUpdateSchema = privilegeSchema.required().noUnknown(true).strict(true).pick(['value'])
for (const field in privilegeUpdateSchema.fields)
    if (Object.prototype.hasOwnProperty.call(privilegeUpdateSchema.fields, field))
        (privilegeUpdateSchema.fields as any)[field] = (privilegeUpdateSchema.fields as any)[field].optional()
export type PrivilegeUpdate = InferType<typeof privilegeUpdateSchema>

export const privilegeImmutableSchema = privilegeSchema.required().noUnknown(true).strict(true).pick(Object.keys(privilegeSchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(privilegeUpdateSchema.fields)).includes(f)) as any)
for (const field in privilegeImmutableSchema.fields)
    if (Object.prototype.hasOwnProperty.call(privilegeImmutableSchema.fields, field))
        (privilegeImmutableSchema.fields as any)[field] = (privilegeImmutableSchema.fields as any)[field].optional()
export type PrivilegeImmutable = InferType<typeof privilegeImmutableSchema>

export const fields: (keyof Privilege)[] = Object.keys(privilegeSchema.fields) as any
export const readableFields: (keyof Omit<Privilege, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
export const updatableFields: (keyof PrivilegeUpdate)[] = Object.keys(privilegeUpdateSchema.fields) as any
