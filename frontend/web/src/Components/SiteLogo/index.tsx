import { memo } from "react"
import { useNavigate } from "react-router"

export const SiteLogo = memo(function SiteLogo() {
    console.log('SiteLogo')

    const navigate = useNavigate()

    return (
        <div className="cursor-pointer" onClick={() => navigate('/')}>SiteLogo</div>
    )
})

