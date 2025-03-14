import { ObjectId } from "mongodb/mongodb";
import { InferType, mixed, number, object, string } from "yup";

export const collectionName = 'category'

export const categorySchema = object().required().noUnknown(true).strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: mixed<string | ObjectId>().required(),
    parentCategory: mixed<string | ObjectId>().optional(),
    name: string().required(),
    views: number().required(),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Category = InferType<typeof categorySchema>

export const fields: string[] = Object.keys(categorySchema.fields)
export const readableFields = fields.filter(f => !['schemaVersion'].includes(f))
export const updatableFields = []

export const categoryCreateSchema = categorySchema.required().noUnknown(true).strict(true).omit(['_id', 'schemaVersion', 'createdAt', 'updatedAt', 'views'])
export type CategoryCreate = InferType<typeof categoryCreateSchema>
