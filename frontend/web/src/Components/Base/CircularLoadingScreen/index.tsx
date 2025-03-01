import { createPortal } from 'react-dom'
import { CircularLoadingIcon } from '../CircularLoadingIcon'

export function CircularLoadingScreen({ size = 'sm' }) {
    let className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
    switch (size) {
        case 'xl':
            className += ` size-1/2`
            break;
        case 'lg':
            className += ` size-2/5`
            break;
        case 'md':
            className += ` size-1/3`
            break;
        case 'sm':
            className += ` size-1/5`
            break;
        case 'xs':
            className += ` size-1/12`
            break;

        default:
            break;
    }

    return createPortal(
        <div className={className}>
            <CircularLoadingIcon />
        </div>
        , document.body
    )
}

