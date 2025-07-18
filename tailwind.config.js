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
  		fontFamily: {
  			header: [
  				'Titillium Web',
  				'serif'
  			],
			secondary: ['Barriecito', 'system-ui'],
			quiz: ['Quiz-Card-Font', 'system-ui'],
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
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};