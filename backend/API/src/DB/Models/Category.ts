import { array, InferType, number, object, string } from "yup";
import { likeObjectId, localizedText } from "@monorepo/mongodb";

export const collectionName = 'category'

export const schemaVersion = 'v1.0.0'

export const categorySchema = object().required().noUnknown(true).strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: likeObjectId.required(),
    parentCategory: likeObjectId.optional(),
    name: string().required(),
    displayName: localizedText.required(),
    recommendedProductProperties: array().strict(true).optional().of(object({ name: string().required(), display: localizedText.required() }).strict(true).noUnknown(true).required()),
    views: number().required(),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Category = InferType<typeof categorySchema>

export const categoryInputSchema = categorySchema.required().noUnknown(true).strict(true).pick(['parentCategory', 'name', 'displayName', 'recommendedProductProperties'])
export type CategoryInput = InferType<typeof categoryInputSchema>

export const categoryCreateSchema = categorySchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: likeObjectId.optional() })
export type CategoryCreate = InferType<typeof categoryCreateSchema>

export const categoryUpdateSchema = categorySchema.required().noUnknown(true).strict(true).pick(['recommendedProductProperties'])
for (const field in categoryUpdateSchema.fields)
    if (Object.prototype.hasOwnProperty.call(categoryUpdateSchema.fields, field))
        (categoryUpdateSchema.fields as any)[field] = (categoryUpdateSchema.fields as any)[field].optional()
export type CategoryUpdate = InferType<typeof categoryUpdateSchema>

export const categoryImmutableSchema = categorySchema.required().noUnknown(true).strict(true).pick(Object.keys(categorySchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(categoryUpdateSchema.fields)).includes(f)) as any)
for (const field in categoryImmutableSchema.fields)
    if (Object.prototype.hasOwnProperty.call(categoryImmutableSchema.fields, field))
        (categoryImmutableSchema.fields as any)[field] = (categoryImmutableSchema.fields as any)[field].optional()
export type CategoryImmutable = InferType<typeof categoryImmutableSchema>

export const fields: (keyof Category)[] = Object.keys(categorySchema.fields) as any
export const readableFields: (keyof Omit<Category, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
export const updatableFields: (keyof CategoryUpdate)[] = Object.keys(categoryUpdateSchema.fields) as any
