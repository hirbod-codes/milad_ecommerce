/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}",],
    theme: {
    	extend: {
    		colors: {
    			scrollbar: 'hsl(var(--scrollbar))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))',
    				container: 'hsl(var(--primary-container))',
    				'container-foreground': 'hsl(var(--primary-container-foreground))',
    				fixed: 'hsl(var(--primary-fixed))',
    				'fixed-dim': 'hsl(var(--primary-fixed-dim))',
    				'fixed-foreground': 'hsl(var(--primary-fixed-foreground))',
    				'fixed-foreground-variant': 'hsl(var(--primary-fixed-foreground-variant))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))',
    				container: 'hsl(var(--secondary-container))',
    				'container-foreground': 'hsl(var(--secondary-container-foreground))',
    				fixed: 'hsl(var(--secondary-fixed))',
    				'fixed-dim': 'hsl(var(--secondary-fixed-dim))',
    				'fixed-foreground': 'hsl(var(--secondary-fixed-foreground))',
    				'fixed-foreground-variant': 'hsl(var(--secondary-fixed-foreground-variant))'
    			},
    			tertiary: {
    				DEFAULT: 'hsl(var(--tertiary))',
    				foreground: 'hsl(var(--tertiary-foreground))',
    				container: 'hsl(var(--tertiary-container))',
    				'container-foreground': 'hsl(var(--tertiary-container-foreground))',
    				fixed: 'hsl(var(--tertiary-fixed))',
    				'fixed-dim': 'hsl(var(--tertiary-fixed-dim))',
    				'fixed-foreground': 'hsl(var(--tertiary-fixed-foreground))',
    				'fixed-foreground-variant': 'hsl(var(--tertiary-fixed-foreground-variant))'
    			},
    			info: {
    				DEFAULT: 'hsl(var(--info))',
    				foreground: 'hsl(var(--info-foreground))',
    				container: 'hsl(var(--info-container))',
    				'container-foreground': 'hsl(var(--info-container-foreground))',
    				fixed: 'hsl(var(--info-fixed))',
    				'fixed-dim': 'hsl(var(--info-fixed-dim))',
    				'fixed-foreground': 'hsl(var(--info-fixed-foreground))',
    				'fixed-foreground-variant': 'hsl(var(--info-fixed-foreground-variant))'
    			},
    			success: {
    				DEFAULT: 'hsl(var(--success))',
    				foreground: 'hsl(var(--success-foreground))',
    				container: 'hsl(var(--success-container))',
    				'container-foreground': 'hsl(var(--success-container-foreground))',
    				fixed: 'hsl(var(--success-fixed))',
    				'fixed-dim': 'hsl(var(--success-fixed-dim))',
    				'fixed-foreground': 'hsl(var(--success-fixed-foreground))',
    				'fixed-foreground-variant': 'hsl(var(--success-fixed-foreground-variant))'
    			},
    			warning: {
    				DEFAULT: 'hsl(var(--warning))',
    				foreground: 'hsl(var(--warning-foreground))',
    				container: 'hsl(var(--warning-container))',
    				'container-foreground': 'hsl(var(--warning-container-foreground))',
    				fixed: 'hsl(var(--warning-fixed))',
    				'fixed-dim': 'hsl(var(--warning-fixed-dim))',
    				'fixed-foreground': 'hsl(var(--warning-fixed-foreground))',
    				'fixed-foreground-variant': 'hsl(var(--warning-fixed-foreground-variant))'
    			},
    			error: {
    				DEFAULT: 'hsl(var(--error))',
    				foreground: 'hsl(var(--error-foreground))',
    				container: 'hsl(var(--error-container))',
    				'container-foreground': 'hsl(var(--error-container-foreground))',
    				fixed: 'hsl(var(--error-fixed))',
    				'fixed-dim': 'hsl(var(--error-fixed-dim))',
    				'fixed-foreground': 'hsl(var(--error-fixed-foreground))',
    				'fixed-foreground-variant': 'hsl(var(--error-fixed-foreground-variant))'
    			},
    			surface: {
    				DEFAULT: 'hsl(var(--surface))',
    				dim: 'hsl(var(--surface-dim))',
    				bright: 'hsl(var(--surface-bright))',
    				'container-highest': 'hsl(var(--surface-container-highest))',
    				'container-high': 'hsl(var(--surface-container-high))',
    				container: 'hsl(var(--surface-container))',
    				'container-low': 'hsl(var(--surface-container-low))',
    				'container-lowest': 'hsl(var(--surface-container-lowest))',
    				foreground: 'hsl(var(--surface-foreground))',
    				'foreground-variant': 'hsl(var(--surface-foreground-variant))',
    				inverse: 'hsl(var(--surface-inverse))',
    				'inverse-foreground': 'hsl(var(--surface-inverse-foreground))',
    				'inverse-primary-foreground': 'hsl(var(--surface-inverse-primary-foreground))'
    			},
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			outline: {
    				DEFAULT: 'hsl(var(--outline))',
    				variant: 'hsl(var(--outline-variant))'
    			},
    			border: 'hsl(var(--outline))',
    			input: 'hsl(var(--outline))',
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			ring: 'hsl(var(--ring))',
    			chart: {
    				'1': 'hsl(var(--chart-1))',
    				'2': 'hsl(var(--chart-2))',
    				'3': 'hsl(var(--chart-3))',
    				'4': 'hsl(var(--chart-4))',
    				'5': 'hsl(var(--chart-5))'
    			}
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		keyframes: {
    			'accordion-down': {
    				from: {
    					height: '0'
    				},
    				to: {
    					height: 'var(--radix-accordion-content-height)'
    				}
    			},
    			'accordion-up': {
    				from: {
    					height: 'var(--radix-accordion-content-height)'
    				},
    				to: {
    					height: '0'
    				}
    			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out'
    		}
    	}
    },
    plugins: [require("tailwindcss-animate")],
}
