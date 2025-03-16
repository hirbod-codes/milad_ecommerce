import { ObjectId } from "mongodb/mongodb";
import { array, boolean, InferType, lazy, mixed, number, object, Schema, string } from "yup";

const price = lazy(value => object().required().strict(true).shape(Object.keys(value).reduce<{ [k: string]: Schema }>((prev, key) => ({ ...prev, [key]: number().strict(true).required().positive() }), {})))

const localizedText = lazy(value => object().required().strict(true).shape(Object.keys(value).reduce((prev, key) => ({ ...prev, [key]: string().required() }), {})))

export const collectionName = 'product'

export const schemaVersion = 'v1.0.0'

export const productSchema = object().required().unknown(true).strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: mixed<string | ObjectId>().required(),
    tags: array().optional().of(string().required()),
    categories: array().optional().of(string().required()),
    name: localizedText,
    description: localizedText.optional(),
    price,
    isAvailable: boolean().required(),
    purchaseCount: number().positive().optional(),
    reviewsCount: number().positive().optional(),
    views: number().positive().optional(),
    averageRating: number().positive().optional(),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Product = InferType<typeof productSchema>

export const productInputSchema = productSchema.required().noUnknown(true).strict(true).pick(['tags', 'categories', 'name', 'description', 'price', 'isAvailable'])
export type ProductInput = InferType<typeof productInputSchema>

export const productCreateSchema = productSchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: mixed<string | ObjectId>().optional() })
export type ProductCreate = InferType<typeof productCreateSchema>

export const productUpdateSchema = productSchema.required().noUnknown(true).strict(true).pick(['name', 'description', 'tags', 'categories', 'price'])
export type ProductUpdate = InferType<typeof productUpdateSchema>

export const productImmutableSchema = productSchema.required().noUnknown(true).strict(true).pick(Object.keys(productSchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(productUpdateSchema.fields)).includes(f)) as any)
export type ProductImmutable = InferType<typeof productImmutableSchema>

export const fields: (keyof Product)[] = Object.keys(productSchema.fields) as any
export const readableFields: (keyof Omit<Product, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
export const updatableFields: (keyof ProductUpdate)[] = Object.keys(productUpdateSchema.fields) as any
