import { Router } from "express"

const users = Router()

users.post('/role')

users.get('/role')

users.patch('/role')

users.delete('/role')

users.post('/privilege')

users.delete('/privilege')

users.patch('/assign-role')

users.get('/user')

users.patch('/user')

users.patch('/user/email')

users.patch('/user/phoneNumber')

users.patch('/user/username')

users.patch('/user/password')

users.delete('/user')

export { users }
