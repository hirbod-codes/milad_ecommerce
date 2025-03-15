import { ObjectId } from "mongodb/mongodb";
import { InferType, mixed, number, object, string } from "yup";

export const collectionName = 'privilege'

export const privilegeSchema = object().required().noUnknown(true).strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: mixed<string | ObjectId>().required(),
    name: string().required(),
    value: mixed<string | number | boolean>().required(),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Privilege = InferType<typeof privilegeSchema>

export const fields: string[] = Object.keys(privilegeSchema.fields)
export const readableFields = fields.filter(f => !['schemaVersion'].includes(f))
export const updatableFields = []

export const privilegeCreateSchema = privilegeSchema.required().noUnknown(true).strict(true).pick(['name', 'value'])
export type PrivilegeCreate = InferType<typeof privilegeCreateSchema>
