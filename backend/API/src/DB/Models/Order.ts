import { array, boolean, InferType, lazy, number, object, Schema, string } from "yup";
import { likeObjectId } from "./common_schemas";

const cost = lazy(value => object().required().strict(true).shape(Object.keys(value).reduce<{ [k: string]: Schema }>((prev, key) => ({ ...prev, [key]: number().strict(true).required().positive() }), {})))

export const collectionName = 'order'

export const schemaVersion = 'v1.0.0'

export const orderSchema = object().required().strict(true).unknown(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    userId: likeObjectId.required(),
    products: array().required().min(1).of(likeObjectId.required()),
    cost,
    isPayed: boolean().required(),
    isSent: boolean().required(),
    address: object().optional().shape({
        text: string().required().max(1000),
        googleMap: string().required().url()
    }),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Order = InferType<typeof orderSchema>

export const orderInputSchema = orderSchema.required().noUnknown(true).strict(true).pick(['address', 'products', 'userId'])
export type OrderInput = InferType<typeof orderInputSchema>

export const orderCreateSchema = orderSchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: likeObjectId.optional() })
export type OrderCreate = InferType<typeof orderCreateSchema>

export const orderUpdateSchema = orderSchema.required().noUnknown(true).strict(true).pick(['address'])
export type OrderUpdate = InferType<typeof orderUpdateSchema>

export const orderImmutableSchema = orderSchema.required().noUnknown(true).strict(true).pick(Object.keys(orderSchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(orderUpdateSchema.fields)).includes(f)) as any)
export type OrderImmutable = InferType<typeof orderImmutableSchema>

export const fields: (keyof Order)[] = Object.keys(orderSchema.fields) as any
export const readableFields: (keyof Omit<Order, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
export const updatableFields: (keyof OrderUpdate)[] = Object.keys(orderUpdateSchema.fields) as any
