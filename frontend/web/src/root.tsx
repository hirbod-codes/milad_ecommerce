import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Main } from './main'

import './index.css'
import './Localization/i18next'

createRoot(document.getElementById('root')!)
    .render(
        <StrictMode>
            <Main />
        </StrictMode>,
    )
