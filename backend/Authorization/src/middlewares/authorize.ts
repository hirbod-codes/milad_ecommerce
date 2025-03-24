import { Request } from "express";
import Jwt from "jsonwebtoken";
import { array, string } from "yup";
import { RoleRepository } from "../DB/Repositories/RoleRepository";

export async function authorize(req: Request, privilegeNames: string | string[], privilegeValue: any = true): Promise<boolean> {
    const userRole = Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!, { json: true })?.role ?? ''
    if (!userRole)
        return false

    const roles = await (await RoleRepository.getInstance()).getRolesWithPrivileges()
    if (roles === false)
        return false

    const role = roles.find(f => f.name === userRole)
    if (role === undefined)
        return false

    if (!array().required().strict(true).min(1).of(string().strict(true).required()).isValidSync(privilegeNames) && !string().required().strict(true).isValidSync(privilegeNames))
        return false
    else if (!array().required().strict(true).min(1).of(string().strict(true).required()).isValidSync(privilegeNames))
        privilegeNames = [privilegeNames]

    for (const privilege of role.privileges)
        if (privilege.value === privilegeValue)
            if (privilegeNames.includes(privilege.name))
                privilegeNames = privilegeNames.filter(f => f !== privilege.name)

    if (privilegeNames.length !== 0)
        return false

    return true
}
