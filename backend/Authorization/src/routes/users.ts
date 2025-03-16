import { Router } from "express"

const users  = Router()

users.patch('/role')

users.patch('/privilege')

users.patch('/assign-role')
users.patch('/privilege')

export {users}
