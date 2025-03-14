import { ObjectId } from "mongodb/mongodb";
import { array, InferType, mixed, number, object, string } from "yup";

export const collectionName = 'role'

export const roleSchema = object().required().noUnknown(true).strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: mixed<string | ObjectId>().required(),
    name: string().required(),
    privileges: array().required().min(1).of(mixed<string | ObjectId>().required()),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Role = InferType<typeof roleSchema>

export const fields: string[] = Object.keys(roleSchema.fields)
export const readableFields = fields.filter(f => !['schemaVersion'].includes(f))
export const updatableFields = []

export const roleCreateSchema = roleSchema.required().noUnknown(true).strict(true).pick(['name', 'privileges'])
export type RoleCreate = InferType<typeof roleCreateSchema>
