import { addMethod, array, boolean, InferType, number, object, string } from "yup";
import { likeObjectId, price } from "./common_schemas";

export const collectionName = 'order'

export const schemaVersion = 'v1.0.0'

addMethod(array, 'uniqueArray', function (message) {
    return this.test('unique-array', message, function (list) {
        if (!list) return true
        if (!Array.isArray(list)) return false
        return list.length === new Set(list).size;
    });
})

export const orderSchema = object().required().strict(true).noUnknown(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    userId: likeObjectId.required(),
    products: array().required().min(1).max(20).of(object().required().strict(true).noUnknown(true).shape({ productId: likeObjectId.required(), quantity: number().required().min(1) })).test('unique-array', (list: any) => {
        if (!list) return true
        if (!Array.isArray(list)) return false
        return list.length === new Set(list.map(m => m.productId)).size;
    }),
    cost: price.required(),
    isPayed: boolean().required(),
    isSent: boolean().required(),
    address: object().required().shape({
        text: string().required().max(1000),
        googleMap: string().optional().url()
    }),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Order = InferType<typeof orderSchema>

export const orderInputSchema = orderSchema.required().noUnknown(true).strict(true).pick(['address', 'products'])
export type OrderInput = InferType<typeof orderInputSchema>

export const orderCreateSchema = orderSchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: likeObjectId.optional() })
export type OrderCreate = InferType<typeof orderCreateSchema>

export const orderUpdateSchema = orderSchema.required().noUnknown(true).strict(true).pick(['address'])
for (const field in orderUpdateSchema.fields)
    if (Object.prototype.hasOwnProperty.call(orderUpdateSchema.fields, field))
        (orderUpdateSchema.fields as any)[field] = (orderUpdateSchema.fields as any)[field].optional()
export type OrderUpdate = InferType<typeof orderUpdateSchema>

export const orderImmutableSchema = orderSchema.required().noUnknown(true).strict(true).pick(Object.keys(orderSchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(orderUpdateSchema.fields)).includes(f)) as any)
for (const field in orderImmutableSchema.fields)
    if (Object.prototype.hasOwnProperty.call(orderImmutableSchema.fields, field))
        (orderImmutableSchema.fields as any)[field] = (orderImmutableSchema.fields as any)[field].optional()
export type OrderImmutable = InferType<typeof orderImmutableSchema>

export const fields: (keyof Order)[] = Object.keys(orderSchema.fields) as any
export const readableFields: (keyof Omit<Order, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
export const forbiddenFieldsToFilter: string[] = ['schemaVersion', '_id', 'userId']
export const updatableFields: (keyof OrderUpdate)[] = Object.keys(orderUpdateSchema.fields) as any
