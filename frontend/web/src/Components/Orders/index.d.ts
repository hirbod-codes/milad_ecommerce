export type Order = {
    schemaVersion: string
    _id: string
    userId: string
    products: { productId: string, quantity: number }[]
    cost: { [k: string]: number }
    isPayed: boolean
    isSent: boolean
    address: {
        text: string
        googleMap?: string
    }
    createdAt: number
    updatedAt: number
}

export type OrderCreate = {
    userId: string
    products: { productId: string, quantity: number }[]
    cost: { [k: string]: number }
    isPayed: boolean
    isSent: boolean
    address: {
        text: string
        googleMap?: string
    }
}

export const staticFields = ['schemaVersion', '_id', 'tags', 'categories', 'name', 'displayName', 'description', 'cost', 'isAvailable', 'thumbnail', 'purchaseCount', 'reviewsCount', 'views', 'averageRating', 'createdAt', 'updatedAt',]

export const staticUpdateFields = ['tags', 'categories', 'name', 'displayName', 'description', 'cost', 'isAvailable', 'thumbnail']

export const staticCreateFields = ['tags', 'categories', 'name', 'displayName', 'description', 'cost', 'isAvailable', 'thumbnail']
