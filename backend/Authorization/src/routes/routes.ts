import { Router } from "express";
import { tokenRouter } from "./Auth/tokens";
import { oauthGoogleRouter } from "./oauth/google";
import { emailRouter } from "./Auth/email";
import { phoneNumberRouter } from "./Auth/phoneNumber";

const router = Router()

router.use('/auth/tokens', tokenRouter)
router.use('/auth/email', emailRouter)
router.use('/auth/phone-number', phoneNumberRouter)

router.use('/oauth/google', oauthGoogleRouter)

export { router }
