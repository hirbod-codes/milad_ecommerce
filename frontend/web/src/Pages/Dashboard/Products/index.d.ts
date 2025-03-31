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
