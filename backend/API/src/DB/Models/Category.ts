import { ObjectId } from "mongodb/mongodb";
import { InferType, lazy, mixed, number, object, string } from "yup";

export const collectionName = 'category'

export const schemaVersion = 'v1.0.0'

const localizedText = lazy(value => object().required().strict(true).shape(Object.keys(value).reduce((prev, key) => ({ ...prev, [key]: string().required() }), {})))

export const categorySchema = object().required().noUnknown(true).strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: mixed<string | ObjectId>().required(),
    parentCategory: mixed<string | ObjectId>().optional(),
    name: string().required(),
    displayName: localizedText,
    views: number().required(),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Category = InferType<typeof categorySchema>

export const categoryInputSchema = categorySchema.required().noUnknown(true).strict(true).pick(['parentCategory', 'name', 'displayName'])
export type CategoryInput = InferType<typeof categoryInputSchema>

export const categoryCreateSchema = categorySchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: mixed<string | ObjectId>().optional() })
export type CategoryCreate = InferType<typeof categoryCreateSchema>

export const categoryUpdateSchema = categorySchema.required().noUnknown(true).strict(true).pick(['views'])
export type CategoryUpdate = InferType<typeof categoryUpdateSchema>

export const categoryImmutableSchema = categorySchema.required().noUnknown(true).strict(true).pick(Object.keys(categorySchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(categoryUpdateSchema.fields)).includes(f)) as any)
export type CategoryImmutable = InferType<typeof categoryImmutableSchema>

export const fields: (keyof Category)[] = Object.keys(categorySchema.fields) as any
export const readableFields: (keyof Omit<Category, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
export const updatableFields: (keyof CategoryUpdate)[] = Object.keys(categoryUpdateSchema.fields) as any
