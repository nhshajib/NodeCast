import fs from 'node:fs/promises';
// Brand assets are shared inputs; the website never reads or imports the app.
const source=new URL('../../brand/',import.meta.url);
try{
 const files=await fs.readdir(new URL('web/',source));
 for(const name of files){if(name==='head-snippet.html')continue;await fs.copyFile(new URL('web/'+name,source),new URL('../public/'+name,import.meta.url));}
 await fs.copyFile(new URL('logo/glowtv-logo-light-bg.svg',source),new URL('../public/logo.svg',import.meta.url));
 await fs.copyFile(new URL('logo/glowtv-mark.svg',source),new URL('../public/mark.svg',import.meta.url));
}catch(error){if(error.code!=='ENOENT')throw error;/* Local asset copies keep a standalone website checkout buildable. */}
