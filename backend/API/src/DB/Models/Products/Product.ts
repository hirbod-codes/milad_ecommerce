import { array, boolean, InferType, number, object, string } from "yup";
import { likeObjectId, localizedText, price, uniqueArrayTest } from "../common_schemas";

export const collectionName = 'product'

export const schemaVersion = 'v1.0.0'

export const productSchema = object().required().strict(true).unknown(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    tags: array().optional().of(string().required()).test('unique-array', uniqueArrayTest),
    categories: array().optional().of(string().required()).test('unique-array', uniqueArrayTest),
    name: string().required().strict(true).min(2).max(350),
    displayName: localizedText,
    description: localizedText.optional(),
    price: price.required(),
    isAvailable: boolean().required(),
    thumbnail: likeObjectId.optional(),
    stats: object().required().shape({
        monthly: array().required().of(object().required().shape({ from: number().required(), to: number().required(), count: number().required() })),
        weekly: array().required().of(object().required().shape({ from: number().required(), to: number().required(), count: number().required() })),
        monthlyMean: number().required(),
        weeklyMean: number().required(),
        monthlyStandardDeviation: number().required(),
        weeklyStandardDeviation: number().required(),
        monthlyZScore: number().required(),
        weeklyZScore: number().required(),
    }),
    trendingScore: object().required().shape({
        monthly: number().required(),
        weekly: number().required(),
    }),
    unitsSold: object().required().shape({ monthly: number().required().min(0).integer(), yearly: number().required().min(0).integer() }),
    reviewsCount: number().strict(true).integer().min(0).optional(),
    views: number().strict(true).integer().min(0).optional(),
    averageRating: number().strict(true).min(0).max(5).optional(),
    createdAt: number().strict(true).required(),
    updatedAt: number().strict(true).required(),
})
export type Product = InferType<typeof productSchema>

export const productInputSchema = productSchema.pick(['tags', 'categories', 'name', 'displayName', 'description', 'price', 'isAvailable', 'thumbnail']).required().strict(true).unknown(true)
export type ProductInput = InferType<typeof productInputSchema>

export const productCreateSchema = productSchema.omit(['_id']).shape({ _id: likeObjectId.optional() }).required().strict(true).unknown(true)
export type ProductCreate = InferType<typeof productCreateSchema>

export let productUpdateSchema = productSchema
    .pick(['name', 'displayName', 'description', 'tags', 'categories', 'price', 'isAvailable', 'thumbnail'])
    .shape({
        _id: string().strip(true),
        schemaVersion: string().strip(true),
        createdAt: number().strip(true),
        updatedAt: number().strip(true),
        purchaseCount: number().strip(true),
        reviewsCount: number().strip(true),
        views: number().strip(true),
        averageRating: number().strip(true),
    })
    .required()
    .strict(true)
    .unknown(true)
    .partial()
export type ProductUpdate = InferType<typeof productUpdateSchema>

export const productImmutableSchema = productSchema.required().noUnknown(true).strict(true).pick(Object.keys(productSchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(productUpdateSchema.fields)).includes(f)) as any).partial()
export type ProductImmutable = InferType<typeof productImmutableSchema>

export const fields: (keyof Product)[] = Object.keys(productSchema.fields) as any
export const readableFields: (keyof Omit<Product, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
export const forbiddenFieldsToFilter: string[] = ['schemaVersion', '_id', 'stats']
export const updatableFields: (keyof ProductUpdate)[] = Object.keys(productUpdateSchema.fields) as any
