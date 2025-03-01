export type ThemeMode = 'light' | 'dark'

export type Color<T> = {
    main: string
    light: T
    'light-shades': { [k in keyof T]: number }
    dark: T
    'dark-shades': { [k in keyof T]: number }
}

export type PaletteVariants = {
    main: string
    foreground: string
    container: string
    'container-foreground': string
    fixed: string
    'fixed-dim': string
    'fixed-foreground': string
    'fixed-foreground-variant': string
}

export type SurfaceVariants = {
    main: string
    dim: string
    bright: string
    'container-highest': string
    'container-high': string
    'container': string
    'container-low': string
    'container-lowest': string
    foreground: string
    'foreground-variant': string
    inverse: string
    'inverse-foreground': string
    'inverse-primary-foreground': string
}

export type ThemeOptions = {
    mode: ThemeMode;
    radius: string;
    'scrollbar-width': string;
    'scrollbar-height': string;
    'scrollbar-border-radius': string;
    foregroundCoefficient: number;
    colorCoefficient: number;
    colors: {
        scrollbar: string
        primary: Color<PaletteVariants>
        secondary: Color<PaletteVariants>
        tertiary: Color<PaletteVariants>
        info: Color<PaletteVariants>
        success: Color<PaletteVariants>
        warning: Color<PaletteVariants>
        error: Color<PaletteVariants>
        surface: Color<SurfaceVariants>
        natural: string
        naturalVariant: string
        outline: Color<{
            main: string
            variant: string
        }>
    }
}
