const {withMainActivity,withDangerousMod} = require('expo/config-plugins');
const fs=require('node:fs/promises');
const path=require('node:path');
module.exports=(config,{tv=false}={})=>{
 if(!tv)return config;
 config=withMainActivity(config,mod=>{
  if(mod.modResults.language!=='kt')throw new Error('TV remote support requires the Kotlin activity.');
  const source=mod.modResults.contents;
  if(!source.includes('private val tvRemoteController')){
   const marker='class MainActivity : ReactActivity() {';
   if(!source.includes(marker))throw new Error('Review the TV remote activity integration for this Expo template.');
   mod.modResults.contents=source.replace(marker,marker+`\n  private val tvRemoteController by lazy { TVRemoteController(this) }\n  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) tvRemoteController.onWindowFocus()
  }
  override fun dispatchKeyEvent(event: android.view.KeyEvent): Boolean {\n    if (tvRemoteController.dispatch(event)) return true\n    return super.dispatchKeyEvent(event)\n  }\n`);
  }
  return mod;
 });
 return withDangerousMod(config,['android',async mod=>{
  const pkg=config.android.package;const target=path.join(mod.modRequest.platformProjectRoot,'app/src/main/java',...pkg.split('.'),'TVRemoteController.kt');
  await fs.mkdir(path.dirname(target),{recursive:true});
  const source=await fs.readFile(path.join(mod.modRequest.projectRoot,'plugins/tv/TVRemoteController.kt'),'utf8');
  await fs.writeFile(target,source.replace('__PACKAGE__',pkg));return mod;
 }]);
};
