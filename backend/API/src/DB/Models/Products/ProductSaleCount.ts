import { array, InferType, mixed, number, object, string } from "yup";
import { likeObjectId, uniqueArrayTest } from "../common_schemas";

export const collectionName = 'productSaleCount'

export const schemaVersion = 'v1.0.0'

export const productSaleCountSchema = object().required().strict(true).noUnknown(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    tags: array().optional().of(string().required()).test('unique-array', uniqueArrayTest),
    categories: array().optional().of(string().required()).test('unique-array', uniqueArrayTest),
    productId: likeObjectId.required(),
    duration: number().required().min(1).integer(),
    timestamp: number().required(),
    count: number().required(),
    zScore: number().required(),
})
export type ProductSaleCount = InferType<typeof productSaleCountSchema>

export const productSaleCountInputSchema = productSaleCountSchema.pick(['productId', 'tags', 'categories', 'count', 'zScore', 'duration']).required().strict(true).noUnknown(true)
export type ProductSaleCountInput = InferType<typeof productSaleCountInputSchema>

export const productSaleCountCreateSchema = productSaleCountSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).noUnknown(true)
export type ProductSaleCountCreate = InferType<typeof productSaleCountCreateSchema>

export let productSaleCountUpdateSchema = productSaleCountSchema
    .pick(['tags', 'categories', 'count', 'zScore'])
    .required()
    .strict(true)
    .noUnknown(true)
    .partial()
export type ProductSaleCountUpdate = InferType<typeof productSaleCountUpdateSchema>

export const productImmutableSchema = productSaleCountSchema.required().noUnknown(true).strict(true).pick(Object.keys(productSaleCountSchema.fields).filter(f => !['_id', 'schemaVersion'].concat(Object.keys(productSaleCountUpdateSchema.fields)).includes(f)) as any).partial()
export type ProductSaleCountImmutable = InferType<typeof productImmutableSchema>

export const fields: (keyof ProductSaleCount)[] = Object.keys(productSaleCountSchema.fields) as any
export const readableFields: (keyof Omit<ProductSaleCount, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
