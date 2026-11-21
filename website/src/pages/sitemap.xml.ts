import pages from '../data/pages.json';
// lastmod is only listed where a page records when its content last changed;
// a build timestamp on every URL tells search engines nothing.
export function GET(){
 const entries=[{path:'/',updated:'2026-11-21'},...pages.map(p=>({path:`/${p.path}/`,updated:(p as {updated?:string}).updated}))];
 const urls=entries.map(({path,updated})=>`  <url>\n    <loc>https://glowtv.app${path}</loc>${updated?`\n    <lastmod>${updated}</lastmod>`:''}\n  </url>`).join('\n');
 return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
