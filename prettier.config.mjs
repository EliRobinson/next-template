import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const standardConfig = require('prettier-config-standard')

/** @type {import("prettier").Config} */
const config = {
  ...standardConfig,
  plugins: ['prettier-plugin-tailwindcss']
}

export default config
