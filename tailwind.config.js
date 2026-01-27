/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				'forest-green': {
					DEFAULT: '#075E25',
					50: '#E6F5EB',
					100: '#CCEBD7',
					200: '#99D7AF',
					300: '#66C387',
					400: '#33AF5F',
					500: '#075E25',
					600: '#064B1E',
					700: '#043816',
					800: '#03250F',
					900: '#011207'
				}
			}
		}
	},
	plugins: []
};

