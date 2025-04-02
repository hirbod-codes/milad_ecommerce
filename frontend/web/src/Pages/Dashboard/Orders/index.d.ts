export type Order = {
    _id: string
    products: { productId: string, quantity: number }[]
    address: { text: string, googleMap: string }
    userId: string
    cost: { [k: string]: number }
    isSent: boolean
    isPayed: boolean
    createdAt: number
    updatedAt: number
}
