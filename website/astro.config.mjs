import { defineConfig } from 'astro/config';
export default defineConfig({site:'https://glowtv.app', output:'static', trailingSlash:'always', build:{format:'directory'}, compressHTML:true});
