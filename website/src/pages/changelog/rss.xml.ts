import release from '../../data/release';
import {versionHighlights} from '../../data/downloads';
import type {DownloadPlatform} from '../../data/release';
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function GET(){
 const names={ios:'iPhone and iPad',android:'Android phone and tablet',tv:'Android TV and Fire TV'};
 const items=(Object.entries(release.platforms) as [DownloadPlatform,typeof release.platforms.ios][]).flatMap(([platform,item])=>item&&!item.legacy?[`<item><title>${escape(`GlowTV ${item.version} — ${names[platform]}`)}</title><link>${escape(item.source)}</link><guid isPermaLink="false">${escape(`${item.tag}-${platform}`)}</guid><pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate><description>${escape(versionHighlights(platform,item.version).join(' '))}</description></item>`]:[]);
 if(!items.length)items.push('<item><title>GlowTV rebrand in development</title><link>https://glowtv.app/changelog/</link><guid isPermaLink="false">glowtv-rebrand-development</guid><description>New identity, original demo artwork and an independent website. Compiled releases will be announced separately.</description></item>');
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>GlowTV updates</title><link>https://glowtv.app/changelog/</link><description>Development and release notes for GlowTV.</description><language>en</language>${items.join('')}</channel></rss>`,{headers:{'Content-Type':'application/rss+xml'}});
}
