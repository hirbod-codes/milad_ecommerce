import { ObjectId } from "mongodb/mongodb";
import { array, InferType, lazy, mixed, number, object, string } from "yup";

const price = lazy(value => object().required().strict(true).shape(Object.keys(value).reduce((prev, key) => ({ ...prev, [key]: number().required().positive() }), {})))

const localizedText = lazy(value => object().required().strict(true).shape(Object.keys(value).reduce((prev, key) => ({ ...prev, [key]: string().required() }), {})))

export const collectionName = 'product'

export const productSchema = object().required().strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: mixed<string | ObjectId>().required(),
    tags: array().optional().of(mixed<string | ObjectId>().required()),
    categories: array().optional().of(mixed<string | ObjectId>().required()),
    name: localizedText,
    description: localizedText.optional(),
    price,
    purchaseCount: number().positive().default(0).required(),
    reviewsCount: number().positive().default(0).required(),
    views: number().positive().default(0).required(),
    averageRating: number().positive().default(0).required(),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Product = InferType<typeof productSchema>

export const fields: string[] = Object.keys(productSchema.fields)
export const readableFields = fields.filter(f => !['schemaVersion'].includes(f))
export const updatableFields = readableFields.filter(f => !['_id', 'createdAt', 'updatedAt', 'purchaseCount', 'reviewsCount', 'views', 'averageRating'].includes(f))

export const ProductCreateSchema = productSchema.required().noUnknown(true).strict(true).pick(['tags', 'categories', 'name', 'description', 'price'])
export type ProductCreate = InferType<typeof ProductCreateSchema>
