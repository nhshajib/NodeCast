# Add a CI-only UI test target to Expo's generated project. It is not part of
# the app's original scheme or the device IPA.
require 'xcodeproj'
project_path = 'ios/NodeCast.xcodeproj'
project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |target| target.name == 'NodeCast' }
raise 'NodeCast app target missing' unless app
# The simulator needs an application identifier to access SecureStore/Keychain.
# These settings apply only to simulator SDKs; device builds remain unsigned.
require 'fileutils'
FileUtils.mkdir_p('build')
File.write('build/simulator-keychain.entitlements', <<~PLIST)
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0"><dict>
    <key>application-identifier</key><string>NODECASTQA1.com.nhshajib.nodecast</string>
    <key>keychain-access-groups</key><array><string>NODECASTQA1.com.nhshajib.nodecast</string></array>
    <key>com.apple.developer.team-identifier</key><string>NODECASTQA1</string>
  </dict></plist>
PLIST
app.build_configurations.each do |configuration|
  configuration.build_settings['CODE_SIGN_ENTITLEMENTS[sdk=iphonesimulator*]'] = '$(SRCROOT)/../build/simulator-keychain.entitlements'
  configuration.build_settings['CODE_SIGN_IDENTITY[sdk=iphonesimulator*]'] = '-'
  configuration.build_settings['CODE_SIGNING_ALLOWED[sdk=iphonesimulator*]'] = 'YES'
end

ui = project.new_target(:ui_test_bundle, 'NodeCastResumeUITests', :ios, '17.0')
group = project.main_group.new_group('NodeCastResumeUITests', '../scripts')
file = group.new_file('NodeCastResumeUITests.swift')
ui.source_build_phase.add_file_reference(file)
ui.add_dependency(app)
ui.build_configurations.each do |configuration|
  configuration.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.nhshajib.nodecast.resumetests',
    'PRODUCT_NAME' => 'NodeCastResumeUITests',
    'PRODUCT_MODULE_NAME' => 'NodeCastResumeUITests',
    'EXECUTABLE_NAME' => 'NodeCastResumeUITests',
    'ONLY_ACTIVE_ARCH' => 'YES',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'TEST_TARGET_NAME' => 'NodeCast',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'CODE_SIGNING_ALLOWED' => 'NO'
  })
end
project.root_object.attributes['TargetAttributes'] ||= {}
project.root_object.attributes['TargetAttributes'][ui.uuid] = {'TestTargetID' => app.uuid}
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.add_build_target(ui)
scheme.add_test_target(ui)
scheme.set_launch_target(app)
scheme.test_action.build_configuration = 'Release'
scheme.launch_action.build_configuration = 'Release'
scheme.save_as(project_path, 'NodeCastResume', true)
