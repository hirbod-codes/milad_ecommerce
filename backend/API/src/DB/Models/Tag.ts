import { ObjectId } from "mongodb/mongodb";
import { InferType, lazy, mixed, number, object, string } from "yup";

export const collectionName = 'tag'

export const schemaVersion = 'v1.0.0'

const localizedText = lazy(value => object().required().strict(true).shape(Object.keys(value).reduce((prev, key) => ({ ...prev, [key]: string().required() }), {})))

export const tagSchema = object().required().noUnknown(true).strict(true).shape({
    schemaVersion: string().required().min(6).max(20),
    _id: mixed<string | ObjectId>().required(),
    name: string().required(),
    displayName: localizedText,
    views: number().required(),
    createdAt: number().required(),
    updatedAt: number().required(),
})
export type Tag = InferType<typeof tagSchema>

export const tagInputSchema = tagSchema.required().noUnknown(true).strict(true).pick(['name', 'displayName'])
export type TagInput = InferType<typeof tagInputSchema>

export const tagCreateSchema = tagSchema.required().noUnknown(true).strict(true).omit(['_id']).shape({ _id: mixed<string | ObjectId>().optional() })
export type TagCreate = InferType<typeof tagCreateSchema>

export const tagUpdateSchema = tagSchema.required().noUnknown(true).strict(true).pick(['views'])
export type TagUpdate = InferType<typeof tagUpdateSchema>

export const tagImmutableSchema = tagSchema.required().noUnknown(true).strict(true).pick(Object.keys(tagSchema.fields).filter(f => !['_id', 'schemaVersion', 'createdAt', 'updatedAt'].concat(Object.keys(tagUpdateSchema.fields)).includes(f)) as any)
export type TagImmutable = InferType<typeof tagImmutableSchema>

export const fields: (keyof Tag)[] = Object.keys(tagSchema.fields) as any
export const readableFields: (keyof Omit<Tag, 'schemaVersion'>)[] = fields.filter(f => !['schemaVersion'].includes(f)) as any
export const updatableFields: (keyof TagUpdate)[] = Object.keys(tagUpdateSchema.fields) as any
