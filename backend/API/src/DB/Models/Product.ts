import { array, boolean, InferType, number, object, string } from "yup";
import { likeObjectId, localizedText, price } from "./common_schemas";

export const collectionName = 'product'

export const schemaVersion = 'v1.0.0'

export const productSchema = object().required().strict(true).unknown(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    tags: array().optional().of(string().required()),
    categories: array().optional().of(string().required()),
    name: string().required().strict(true).min(2).max(350),
    displayName: localizedText,
    description: localizedText.optional(),
    price: price.required(),
    isAvailable: boolean().required(),
    thumbnail: likeObjectId.optional(),
    purchaseCount: number().positive().optional(),
    reviewsCount: number().positive().optional(),
    views: number().positive().optional(),
    averageRating: number().positive().optional(),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Product = InferType<typeof productSchema>

export const productInputSchema = productSchema.required().noUnknown(true).strict(true).pick(['tags', 'categories', 'name', 'displayName', 'description', 'price', 'isAvailable'])
export type ProductInput = InferType<typeof productInputSchema>

export const productCreateSchema = productSchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: likeObjectId.optional() })
export type ProductCreate = InferType<typeof productCreateSchema>

export const productUpdateSchema = productSchema.required().noUnknown(true).strict(true).pick(['name', 'displayName', 'description', 'tags', 'categories', 'price', 'isAvailable', 'thumbnail'])
export type ProductUpdate = InferType<typeof productUpdateSchema>

export const productImmutableSchema = productSchema.required().noUnknown(true).strict(true).pick(Object.keys(productSchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(productUpdateSchema.fields)).includes(f)) as any)
export type ProductImmutable = InferType<typeof productImmutableSchema>

export const fields: (keyof Product)[] = Object.keys(productSchema.fields) as any
export const readableFields: (keyof Omit<Product, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
export const updatableFields: (keyof ProductUpdate)[] = Object.keys(productUpdateSchema.fields) as any
