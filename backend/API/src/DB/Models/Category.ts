import { ObjectId } from "mongodb/mongodb";
import { InferType, mixed, number, object, string } from "yup";

export const collectionName = 'category'

export const schemaVersion = 'v1.0.0'

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

export const categoryInputSchema = categorySchema.required().noUnknown(true).strict(true).pick(['parentCategory', 'name'])
export type CategoryInput = InferType<typeof categoryInputSchema>

export const categoryCreateSchema = categorySchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: mixed<string | ObjectId>().optional() })
export type CategoryCreate = InferType<typeof categoryCreateSchema>

export const categoryUpdateSchema = categorySchema.required().noUnknown(true).strict(true).pick(['views'])
export type CategoryUpdate = InferType<typeof categoryUpdateSchema>

export const categoryImmutableSchema = categorySchema.required().noUnknown(true).strict(true).pick(Object.keys(categorySchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(categoryUpdateSchema.fields)).includes(f)) as any)
export type CategoryImmutable = InferType<typeof categoryImmutableSchema>

export const fields: string[] = Object.keys(categorySchema.fields)
export const readableFields = fields.filter(f => !['schemaVersion'].includes(f))
export const updatableFields = []
