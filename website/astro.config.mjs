import { defineConfig } from 'astro/config';
export default defineConfig({site:'https://glowtv.app', output:'static', trailingSlash:'always', build:{format:'directory',inlineStylesheets:'always'}, compressHTML:true});
