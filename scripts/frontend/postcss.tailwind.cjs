// PostCSS config for the standalone tailwind.css build only (see package.json
// dev/build scripts). Adds the eventkoi scoping pass on top of the default
// pipeline; the vite build keeps using postcss.config.js.
module.exports = {
	plugins: {
		'postcss-import': {},
		tailwindcss: {},
		autoprefixer: {},
		'./postcss-scope-eventkoi.cjs': {},
	},
};
