import { Request } from "express";
import Jwt from "jsonwebtoken";
import { roleRepository } from "@/src";
import { array, string } from "yup";

export async function authorize(req: Request, privilegeNames: string | string[], privilegeValue: any = true): Promise<boolean> {
    let userRole = (Jwt.decode(req.headers['authorization']!.replace('Bearer ', '')!) as Jwt.JwtPayload)?.role ?? ''
    if (!userRole)
        return false

    let roles = (await roleRepository.getRolesWithPrivileges())
    if (roles === false)
        return false

    if (!Array.isArray(privilegeNames) && !string().required().strict(true).isValidSync(privilegeNames))
        return false
    else if (!array().required().strict(true).min(1).of(string().strict(true).required()).isValidSync(privilegeNames))
        return false

    if (!Array.isArray(privilegeNames))
        privilegeNames = [privilegeNames]

    const validPrivilegeNames: string[] = []
    for (const role of roles)
        for (const privilege of role.privileges)
            if (privilege.value === privilegeValue)
                if (privilegeNames.includes(privilege.name) && !validPrivilegeNames.includes(privilege.name))
                    validPrivilegeNames.push(privilege.name)

    if (validPrivilegeNames.length !== privilegeNames.length)
        return false

    return true
}
