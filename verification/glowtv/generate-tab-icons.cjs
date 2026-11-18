/** Rasterize the installed Lucide paths for the OS-native tab bar (no icon-font fallback). */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const sharp=require(path.join(root,'website/node_modules/sharp'));
const out=path.join(root,'apps/player/assets/icons');fs.mkdirSync(out,{recursive:true});
(async()=>{for(const name of ['house','tv','grid-2x2','film','layers','search','library','settings']){
 const source=fs.readFileSync(path.join(root,'apps/player/node_modules/lucide-react-native/dist/cjs/icons',name+'.js'),'utf8');
 const literal=source.match(/const __iconData = ([\s\S]*?);\n/)[1];
 const __iconNode=require('node:vm').runInNewContext('('+literal+')').node;
 const nodes=__iconNode.map(([tag,attrs])=>`<${tag} ${Object.entries(attrs).filter(([k])=>k!=='key').map(([k,v])=>`${k}="${v}"`).join(' ')}/>`).join('');
 const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${nodes}</svg>`);
 for(const scale of [1,2,3])await sharp(svg).resize(24*scale,24*scale).png().toFile(path.join(out,name+(scale===1?'':'@'+scale+'x')+'.png'));
}fs.copyFileSync(path.join(root,'apps/player/node_modules/lucide-react-native/LICENSE'),path.join(out,'LUCIDE-LICENSE.txt'));})();
