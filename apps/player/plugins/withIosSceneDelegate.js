const { withInfoPlist } = require('expo/config-plugins');

// The generated SceneDelegate is @objc(SceneDelegate). UIKit loads the
// Info.plist name with NSClassFromString, and the module-qualified
// NodeCast.SceneDelegate string does not find that class, so the app
// exits while opening. The plist has to use the registered name.
const SCENE_DELEGATE_CLASS = 'SceneDelegate';

function useRegisteredSceneDelegate(infoPlist) {
  const manifest = infoPlist.UIApplicationSceneManifest;
  const scenes = manifest && manifest.UISceneConfigurations && manifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication;
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error('iOS Info.plist has no application scene configuration.');
  }
  for (const scene of scenes) scene.UISceneDelegateClassName = SCENE_DELEGATE_CLASS;
  return infoPlist;
}

module.exports = config => withInfoPlist(config, mod => {
  mod.modResults = useRegisteredSceneDelegate(mod.modResults);
  return mod;
});

module.exports.useRegisteredSceneDelegate = useRegisteredSceneDelegate;
module.exports.SCENE_DELEGATE_CLASS = SCENE_DELEGATE_CLASS;
