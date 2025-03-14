import { ObjectId } from "mongodb/mongodb";
import { InferType, mixed, number, object, string } from "yup";

export const collectionName = 'tag'

export const tagSchema = object().required().noUnknown(true).strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: mixed<string | ObjectId>().required(),
    name: string().required(),
    views: number().required(),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Tag = InferType<typeof tagSchema>

export const fields: string[] = Object.keys(tagSchema.fields)
export const readableFields = fields.filter(f => !['schemaVersion'].includes(f))
export const updatableFields = []

export const tagCreateSchema = tagSchema.required().noUnknown(true).strict(true).omit(['_id', 'schemaVersion', 'createdAt', 'updatedAt', 'views'])
export type TagCreate = InferType<typeof tagCreateSchema>
