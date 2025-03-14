import { ObjectId } from "mongodb/mongodb";
import { array, boolean, InferType, lazy, mixed, number, object, string } from "yup";

const cost = lazy(value => object().required().strict(true).shape(Object.keys(value).reduce((prev, key) => ({ ...prev, [key]: number().required().positive() }), {})))

export const collectionName = 'order'

export const orderSchema = object().required().strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: mixed<string | ObjectId>().required(),
    userId: mixed<string | ObjectId>().required(),
    products: array().required().min(1).of(mixed<string | ObjectId>().required()),
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

export const fields: string[] = Object.keys(orderSchema.fields)
export const readableFields = fields.filter(f => !['schemaVersion'].includes(f))
export const updatableFields = ['isPayed', 'isSent', 'address']

export const OrderCreateSchema = orderSchema.required().noUnknown(true).strict(true).pick(['address', 'products'])
export type OrderCreate = InferType<typeof OrderCreateSchema>
