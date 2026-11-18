/** Audit contract: layout padding/margins/gaps use the 8px grid, including conditional branches. */
const ts=require('../../apps/player/node_modules/typescript'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');let checked=0;
function scan(dir){for(const name of fs.readdirSync(dir)){const filename=path.join(dir,name);if(fs.statSync(filename).isDirectory()){scan(filename);continue}if(!filename.endsWith('.tsx'))continue;
 const file=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(node){if(ts.isPropertyAssignment(node)&&/^(padding|margin)(Horizontal|Vertical|Top|Bottom|Left|Right)?$|^(gap|rowGap|columnGap)$/.test(node.name.getText(file))){checked++;
  // Half-size negative offsets center supplied splash artwork and the seek thumb;
  // they are geometry, not space between UI items. Keep animation/artwork geometry.
  const optical=['StartupSplash.tsx','VideoSeekBar.tsx'].includes(name)&&/^margin(Left|Top)$/.test(node.name.getText(file));
  function values(value){if(ts.isPrefixUnaryExpression(value)&&value.operator===ts.SyntaxKind.MinusToken&&optical)return;
   if(ts.isNumericLiteral(value))assert.equal(Number(value.text)%8,0,`${path.relative(root,filename)}:${file.getLineAndCharacterOfPosition(value.pos).line+1} ${node.getText(file)}`);
   ts.forEachChild(value,values)}values(node.initializer)}ts.forEachChild(node,visit)}visit(file);
}}
scan(path.join(root,'apps/player/src'));scan(path.join(root,'apps/player/android-tv'));
console.log(`PASS: ${checked} style properties use the 8px grid, including conditional branches; only artwork/thumb centering geometry is excluded.`);
