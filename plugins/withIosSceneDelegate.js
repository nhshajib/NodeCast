const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// UIKit loads UISceneDelegateClassName with the Swift module prefix
// ($(PRODUCT_MODULE_NAME).SceneDelegate). @objc(SceneDelegate) registers a
// different Objective-C class, so the scene never connects and the process
// exits while opening.
function rewriteSceneDelegate(source) {
  if (!source.includes('class SceneDelegate')) {
    throw new Error('SceneDelegate.swift is missing class SceneDelegate.');
  }
  const next = source.replaceAll('@objc(SceneDelegate)', '@objc');
  if (!/@objc\b/.test(next)) {
    throw new Error('SceneDelegate.swift is not exposed to UIKit.');
  }
  if (next.includes('@objc(SceneDelegate)')) {
    throw new Error('Scene delegate is still registered under the short name SceneDelegate.');
  }
  return next;
}

module.exports = config => withDangerousMod(config, ['ios', async mod => {
  const root = mod.modRequest.platformProjectRoot;
  const name = mod.modRequest.projectName || 'NodeCast';
  const file = path.join(root, name, 'SceneDelegate.swift');
  const source = await fs.promises.readFile(file, 'utf8');
  const next = rewriteSceneDelegate(source);
  if (next !== source) await fs.promises.writeFile(file, next);
  return mod;
}]);

module.exports.rewriteSceneDelegate = rewriteSceneDelegate;
