export type Product = {
    _id: string
    categories?: string[]
    tags?: string[]
    name: string
    displayName: { [k: string]: string }
    description?: { [k: string]: string }
    price: { [k: string]: number }
    isAvailable: boolean
    thumbnail?: string
    purchaseCount?: number
    reviewsCount?: number
    views?: number
    averageRating?: number
    createdAt: number
    updatedAt: number
}

export type ProductCreate = {
    categories?: string[]
    tags?: string[]
    name?: string
    displayName?: { [k: string]: string }
    description?: { [k: string]: string }
    price?: { [k: string]: number }
    isAvailable?: boolean
    thumbnail?: string
    purchaseCount?: number
    reviewsCount?: number
    views?: number
    averageRating?: number
}

export const staticFields = ['schemaVersion', '_id', 'tags', 'categories', 'name', 'displayName', 'description', 'price', 'isAvailable', 'thumbnail', 'purchaseCount', 'reviewsCount', 'views', 'averageRating', 'createdAt', 'updatedAt',]

export const staticUpdateFields = ['tags', 'categories', 'name', 'displayName', 'description', 'price', 'isAvailable', 'thumbnail']

export const staticCreateFields = ['tags', 'categories', 'name', 'displayName', 'description', 'price', 'isAvailable', 'thumbnail']
