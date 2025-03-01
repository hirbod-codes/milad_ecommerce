export const variants = {
    enter: ({ inSource, outSource, disappear }) => ({
        name: 'enter',
        opacity: disappear ? 0 : undefined,
        x: inSource === 'left' ? '-100%' : (inSource === 'right' ? '100%' : undefined),
        y: inSource === 'top' ? '-100%' : (inSource === 'bottom' ? '100%' : undefined),
    }),
    active: ({ disappear }) => ({
        name: 'active',
        opacity: disappear ? 1 : undefined,
        x: 0,
        y: 0,
    }),
    exit: ({ inSource, outSource, disappear }) => ({
        name: 'exit',
        opacity: disappear ? 0 : undefined,
        x: outSource === 'left' ? '-100%' : (outSource === 'right' ? '100%' : undefined),
        y: outSource === 'top' ? '-100%' : (outSource === 'bottom' ? '100%' : undefined),
    })
};
