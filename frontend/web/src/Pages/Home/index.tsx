import { GoogleAuthManager } from "@/src/Backend/Auth/GoogleAuthManager";
import { Button } from "@/src/Components/Base/Button";
import { memo, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

export const Home = memo(function Home() {
    const [queryVars, setQueryVars] = useSearchParams()
    const code = queryVars.get('code')

    const navigate = useNavigate()

    const [value, setValue] = useState('bbbb')
    console.log('Home', { code, value })

    useEffect(() => {
        console.log('Home', 'useEffect')
        googleAuth()
    }, [])

    const googleAuth = async () => {
        console.log('Home', 'googleAuth')

        try {
            if (code) {
                if (await GoogleAuthManager.authenticate(code) === true)
                    window.location.href = window.location.origin + window.location.pathname;
            } else
                console.log('no code')
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <>
            Home
            <Button onClick={() => navigate('/about-us')}>a</Button>
            <Button onClick={() => setValue('/about-us')}>b</Button>
            <Comp1 value={value} />
        </>
    )
})

export function Comp1({ value: inputValue }) {
    const [value, setValue] = useState(inputValue)
    console.log('Comp1', value)
    return (
        <div>Comp1</div>
    )
}

