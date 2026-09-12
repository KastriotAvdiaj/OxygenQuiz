/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
  	extend: {
  		// Height-based variant. Every other breakpoint here is about WIDTH; this one is the
  		// answer to "it fits, but only if you scroll" on a laptop — a 1440x800 screen is wide
  		// enough for the two-column layouts and still short enough that a form runs past the
  		// fold. Use it for spacing and type steps only (`short:py-3`, `short:text-lg`), never
  		// to hide content or to shrink a touch target below the 36px floor.
  		// See docs/RESPONSIVE.md, "Short viewports".
  		screens: {
  			short: { raw: '(max-height: 860px)' },
  		},
  		fontFamily: {
  			header: [
  				'Titillium Web',
  				'serif'
  			],
			secondary: ['Barriecito', 'system-ui'],
			// User-selectable zones resolve through CSS variables (set at runtime from
			// the user's settings). Fallbacks keep them working if the var is unset.
			quiz: ['var(--font-quiz)', 'DynaPuff', 'system-ui'],
			app: ['var(--font-app)', 'Baloo 2', 'sans-serif'],
  		},
  		scale: {
  			'101': '1.01',
  			'102': '1.02',
  			'103': '1.03'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			'foreground-lighter': 'hsl(var(--foreground-lighter))',
  			card: 'hsl(var(--card))',
  			'card-foreground': 'hsl(var(--card-foreground))',
  			popover: 'hsl(var(--popover))',
  			'popover-foreground': 'hsl(var(--popover-foreground))',
  			primary: 'hsl(var(--primary))',
  			'primary-foreground': 'hsl(var(--primary-foreground))',
  			secondary: 'hsl(var(--secondary))',
  			'secondary-foreground': 'hsl(var(--secondary-foreground))',
  			muted: 'hsl(var(--muted))',
  			'muted-foreground': 'hsl(var(--muted-foreground))',
  			accent: 'hsl(var(--accent))',
  			'accent-foreground': 'hsl(var(--accent-foreground))',
  			destructive: 'hsl(var(--destructive))',
  			'destructive-foreground': 'hsl(var(--destructive-foreground))',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			'chart-1': 'hsl(var(--chart-1))',
  			'chart-2': 'hsl(var(--chart-2))',
  			'chart-3': 'hsl(var(--chart-3))',
  			'chart-4': 'hsl(var(--chart-4))',
  			'chart-5': 'hsl(var(--chart-5))',
  			// Quiz-specific colors
  			'quiz-primary': 'hsl(var(--quiz-primary))',
  			'quiz-primary-light': 'hsl(var(--quiz-primary-light))',
  			'quiz-primary-dark': 'hsl(var(--quiz-primary-dark))',
  			'quiz-success': 'hsl(var(--quiz-success))',
  			'quiz-success-light': 'hsl(var(--quiz-success-light))',
  			'quiz-error': 'hsl(var(--quiz-error))',
  			'quiz-error-light': 'hsl(var(--quiz-error-light))',
  			'quiz-warning': 'hsl(var(--quiz-warning))',
  			'quiz-warning-light': 'hsl(var(--quiz-warning-light))',
  			'quiz-neutral': 'hsl(var(--quiz-neutral))',
  			'quiz-surface': 'hsl(var(--quiz-surface))',
  			'quiz-surface-elevated': 'hsl(var(--quiz-surface-elevated))',
  			'quiz-border-subtle': 'hsl(var(--quiz-border-subtle))',
  			'quiz-text-primary': 'hsl(var(--quiz-text-primary))',
  			'quiz-text-secondary': 'hsl(var(--quiz-text-secondary))',
  			'quiz-shadow': 'hsl(var(--quiz-shadow))'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			xl: 'calc(var(--radius) + 2px)',
  			'2xl': 'calc(var(--radius) + 4px)'
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
  			},
  			// Radix Collapsible exposes its measured height under a DIFFERENT variable from
  			// Accordion's, so the pair above cannot be reused — a Collapsible animated with
  			// `accordion-down` reads an unset var and jumps straight to full height with no
  			// transition at all. Same shape, different variable, hence the duplication.
  			'collapsible-down': {
  				from: {
  					height: '0',
  					opacity: '0'
  				},
  				to: {
  					height: 'var(--radix-collapsible-content-height)',
  					opacity: '1'
  				}
  			},
  			'collapsible-up': {
  				from: {
  					height: 'var(--radix-collapsible-content-height)',
  					opacity: '1'
  				},
  				to: {
  					height: '0',
  					opacity: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			// Slightly longer than the accordion pair and eased both ends: these panels open a
  			// two-column block of answer options, which is a lot more travel than a line of text.
  			'collapsible-down': 'collapsible-down 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
  			'collapsible-up': 'collapsible-up 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};