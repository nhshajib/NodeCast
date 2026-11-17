import fs from 'node:fs/promises';
import {features,versionHighlights} from '../website/src/data/downloads.ts';
const metadata=JSON.parse(await fs.readFile(new URL('../website/src/data/release.json',import.meta.url),'utf8'));
const folders={ios:'iphone',android:'android-mobile',tv:'android-tv'};
for(const [platform,folder]of Object.entries(folders)){
 const release=metadata.platforms[platform];if(!release)continue;
 const dir=new URL(`../apps/player/${folder}/`,import.meta.url);
 const info={...release,checkedAt:metadata.checkedAt,edition:platform,features:features[platform].map(([title,description])=>({title,description})),changes:versionHighlights(platform,release.version)};
 await fs.writeFile(new URL('download.json',dir),JSON.stringify(info,null,2)+'\n');
 const text=`# ${platform==='ios'?'iPhone IPA':platform==='tv'?'Android TV / Fire TV APK':'Android phone APK'} downloads\n\n[← Edition guide](README.md) · [All version history](CHANGELOG.md)\n\n## Current published version: ${release.version}\n\n- [**Direct GitHub download — ${release.file}**](${release.url})\n- [Release page and version-specific changelog](${release.source})\n${release.checksumUrl?`- [Checksum file](${release.checksumUrl})\n`:''}- Published: ${release.publishedAt.split('T')[0]}\n- Status: ${release.prerelease?'Public testing release':'Published release'}\n- Size: ${release.size.toLocaleString('en')} bytes (${(release.size/1048576).toFixed(1)} MiB)\n- Minimum OS: ${release.minimumOS||'not listed in the published release'}\n- SHA-256: \`${release.sha256}\`\n\n${release.legacy?'This is the existing NodeCast binary. The upcoming GlowTV design is not included, and no file has been renamed or republished.':'This is a published GlowTV binary.'}\n\n## Features\n\n${info.features.map(x=>`- **${x.title}:** ${x.description}`).join('\n')}\n\n## What changed in ${release.version}\n\n${info.changes.map(x=>`- ${x}`).join('\n')}\n\n${platform==='ios'?'The IPA is unsigned. Sign it with Impactor and your own Apple account. Free Apple signing normally needs renewal every seven days. Keep the app installed when updating to retain profiles.':'Install the correct edition over your existing app to retain local profiles. Android does not require weekly signing renewal.'}\n\nDownload metadata comes from public GitHub release assets. Refresh the website metadata, then run \`node scripts/sync-download-folders.mjs\` from the repository root to update these records. GlowTV is a player only and provides no channels or subscriptions.\n`;
 await fs.writeFile(new URL('DOWNLOADS.md',dir),text);
 const readme=new URL('README.md',dir);let body=await fs.readFile(readme,'utf8');const block=`<!-- direct-download:start -->\n## Download ${release.version}\n\n[**Download ${platform==='ios'?'IPA':platform==='tv'?'TV APK':'Android APK'} directly from GitHub**](${release.url}) · [Features, size and checksum](DOWNLOADS.md) · [${release.version} release notes](${release.source})\n\nThis public testing build uses the previous NodeCast name. The GlowTV redesign is still in development.${platform==='ios'?' Sign the unsigned IPA with Impactor before installing.':''}\n<!-- direct-download:end -->`;
 if(body.includes('<!-- direct-download:start -->'))body=body.replace(/<!-- direct-download:start -->[\s\S]*?<!-- direct-download:end -->/,block);
 else body=body.replace('**Your TV, beautifully lit.**','**Your TV, beautifully lit.**\n\n'+block);
 body=body.replace('Download the official APK from the GlowTV download page when published','Download the current published APK using the direct GitHub link above');
 await fs.writeFile(readme,body);
}

const rootReadme=new URL('../README.md',import.meta.url);
let home=await fs.readFile(rootReadme,'utf8');
const links=[['ios','iPhone / iPad','iphone','IPA'],['android','Android phone','android','APK'],['tv','Android TV / Fire TV','tv','TV APK']];
const table='<!-- downloads:start -->\n| Your device | Direct GitHub download | Setup and features | Project |\n| --- | --- | --- | --- |\n'+links.map(([platform,title,slug,format])=>{const r=metadata.platforms[platform];return `| ${title} | ${r?`[${format} · ${r.version}](${r.url})`:'Not published'} | [Download details](https://glowtv.app/download/${slug}/) · [Instructions](apps/player/${folders[platform]}/README.md) | [${title} project](apps/player/${folders[platform]}/) |`;}).join('\n')+'\n<!-- downloads:end -->';
if(home.includes('<!-- downloads:start -->'))home=home.replace(/<!-- downloads:start -->[\s\S]*?<!-- downloads:end -->/,table);
else home=home.replace(/\| Your device \|[\s\S]*?(?=\n\n)/,table);
await fs.writeFile(rootReadme,home);
