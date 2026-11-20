import XCTest
import UIKit

final class GlowTVResumeUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "com.nhshajib.nodecast")

  private func element(_ id: String) -> XCUIElement {
    // UIKit's iPadOS top tab presentation exposes the native button label,
    // while its phone tab bar also forwards the React test identifier.
    // Select the actual visible system tab on both presentations.
    if app.frame.width >= 700 && id.hasPrefix("navigation-tab-") {
      let title = String(id.dropFirst("navigation-tab-".count)).capitalized
      return app.buttons.matching(identifier: title).firstMatch
    }
    return app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func capture(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = app.frame.width >= 700 ? name.replacingOccurrences(of: "ios-", with: "ipad-") : name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  // Native sheets retain the tab content underneath. Only the visible button
  // is a valid interaction target when both layers share an action label.
  private func tapButton(_ label: String, scroll: Bool = false) {
    let deadline = Date().addingTimeInterval(15)
    while Date() < deadline {
      for button in app.buttons.matching(NSPredicate(format: "label == %@ OR label BEGINSWITH %@", label, label + ", ")).allElementsBoundByIndex where button.isHittable {
        button.tap(); return
      }
      if scroll { app.swipeUp() } else { Thread.sleep(forTimeInterval: 0.5) }
    }
    capture("failure-button-" + label)
    XCTFail("No visible button: \(label). \(app.debugDescription)")
  }
  private func tapLibrarySegment(_ label: String) {
    // RN's tab role is an accessible Other on UIKit, not a Button.
    let control = app.otherElements.matching(NSPredicate(format: "label == %@", label)).firstMatch
    XCTAssertTrue(control.waitForExistence(timeout: 15), app.debugDescription)
    XCTAssertTrue(control.isHittable, "Library segment is covered by native chrome: \(label)")
    if let bar = app.navigationBars.allElementsBoundByIndex.first(where: { $0.exists }) {
      XCTAssertGreaterThanOrEqual(control.frame.minY, bar.frame.maxY, "Library filters overlap the native search header")
    }
    control.tap()
  }
  // A playing-state event can precede the simulator's first decoded frame.
  // The original fixture has a leaf-green video band, absent from player chrome.
  private func waitForOriginalVideoFrame() {
    let deadline = Date().addingTimeInterval(30)
    while Date() < deadline {
      if let image = app.screenshot().image.cgImage {
        var pixels = [UInt8](repeating: 0, count: 80 * 80 * 4)
        let matched = pixels.withUnsafeMutableBytes { raw -> Int in
          guard let context = CGContext(data: raw.baseAddress, width: 80, height: 80,
            bitsPerComponent: 8, bytesPerRow: 320, space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGBitmapInfo.byteOrder32Big.rawValue | CGImageAlphaInfo.premultipliedLast.rawValue) else { return 0 }
          context.draw(image, in: CGRect(x: 0, y: 0, width: 80, height: 80))
          let bytes = raw.bindMemory(to: UInt8.self)
          var count = 0
          for i in stride(from: 0, to: bytes.count, by: 4) {
            if bytes[i] < 50 && bytes[i+1] > 150 && bytes[i+1] < 230 && bytes[i+2] > 70 && bytes[i+2] < 160 { count += 1 }
          }
          return count
        }
        if matched > 160 { return }
      }
      Thread.sleep(forTimeInterval: 1)
    }
    XCTFail("The native player did not expose the original decoded video band. Keep this capture out of marketing.")
  }
  private func goBackOnNativePage() {
    for button in app.navigationBars.buttons.allElementsBoundByIndex where button.isHittable {
      button.tap(); return
    }
    XCTFail("Expected the visible system Back button on the current native page")
  }
  private func homeContent() -> XCUIElement {
    // iOS exposes nested StaticText nodes for styled headings; their hit-test
    // result is not a visibility test. A real action inside Home verifies both
    // visible content and interaction, rather than only the persistent tab bar.
    app.buttons.matching(NSPredicate(format: "label == %@ OR label == %@ OR label == %@", "Connect playlist", "Watch live", "Resume")).firstMatch
  }
  private func settleHome() {
    let home = element("navigation-tab-home")
    let start = app.buttons["Get started"]
    let storageError = app.staticTexts["Could not read family protection."]
    let arrived = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
      home.exists || start.exists || storageError.exists
    }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [arrived], timeout: 30), .completed, app.debugDescription)
    XCTAssertFalse(storageError.exists, "Simulator Keychain access failed before Home")
    if start.exists {
      start.tap()
      let skip = app.buttons["Not now"]
      XCTAssertTrue(skip.waitForExistence(timeout: 20))
      skip.tap()
      XCTAssertTrue(app.textFields["Server address"].waitForExistence(timeout: 20))
      // The playlist form is a native form sheet; its Done button closes it.
      tapButton("Done")
      let closed = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
        !self.app.buttons["Done"].exists
      }, object: nil)
      XCTAssertEqual(XCTWaiter.wait(for: [closed], timeout: 15), .completed, "The native sheet did not dismiss")
    }
    let skip = app.buttons["Not now"]
    if skip.exists { skip.tap() }
    XCTAssertTrue(home.waitForExistence(timeout: 20), app.debugDescription)
    home.tap()
    // Inspect content near the top, so small iPhones need no scroll to pass.
    let content = homeContent()
    XCTAssertTrue(content.waitForExistence(timeout: 15), app.debugDescription)
    let visible = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in content.exists && content.isHittable }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [visible], timeout: 15), .completed, "Home content is present but invisible after returning: \(app.debugDescription)")
  }
  func testColdStartsAndBackgroundResumeKeepHomeVisible() {
    continueAfterFailure = false
    app.launch()
    settleHome()
    capture("01-home-cold-start")
    for tab in ["guide", "live", "library", "search", "guide", "library"] {
      element("navigation-tab-\(tab)").tap()
      element("navigation-tab-home").tap()
      settleHome()
    }
    for delay in [1.0, 15.0, 60.0] {
      XCUIDevice.shared.press(.home)
      Thread.sleep(forTimeInterval: delay)
      app.activate()
      // Check before touching navigation: recovery must work without a tap.
      let content = homeContent()
      XCTAssertTrue(content.waitForExistence(timeout: 15))
      XCTAssertTrue(content.isHittable, "Blank Home after background interval \(delay)s")
      capture("home-after-background-\(Int(delay))s")
      settleHome()
    }
    for attempt in 1...3 {
      app.terminate()
      app.launch()
      settleHome()
      capture("home-relaunch-\(attempt)")
    }
  }
  // The local fixture service contains public test data only. No IPTV account is required.
  func testDesignHomeGuideAndPlayer() {
    continueAfterFailure = false
    app.launch()
    settleHome()
    tapButton("Add playlist")
    func fill(_ label: String, _ value: String, secure: Bool = false) {
      let field = secure ? app.secureTextFields[label] : app.textFields[label]
      XCTAssertTrue(field.waitForExistence(timeout: 15), app.debugDescription)
      // Native sheets retain Home's scroll view underneath. Scroll the form
      // that contains this field, then require actual keyboard focus before
      // typing. A keyboard left open by Username does not prove Password focus.
      let form = app.scrollViews.containing(secure ? .secureTextField : .textField, identifier: label).firstMatch
      let focusDeadline = Date().addingTimeInterval(15)
      var focused = false
      while Date() < focusDeadline {
        if !field.isHittable && form.exists { form.swipeUp() }
        if field.isHittable { field.tap() }
        Thread.sleep(forTimeInterval: 0.5)
        focused = (field.value(forKey: "hasKeyboardFocus") as? Bool) == true
        if focused { break }
      }
      XCTAssertTrue(focused, "The foreground field did not acquire keyboard focus: \(label). \(app.debugDescription)")
      // Inject at a human pace so controlled inputs receive every native event.
      for character in value { field.typeText(String(character)) }
      if !secure { XCTAssertEqual(field.value as? String, value, "The entered field value was not retained") }
      // Submit once with the explicit form action; Return is now a real Go action.
    }
    fill("Profile name", "Demo playlist")
    fill("Server address", "http://127.0.0.1:9090")
    fill("Username", "example")
    fill("Password", "example", secure: true)
    app.swipeUp()
    tapButton("Connect playlist", scroll: true)
    XCTAssertTrue(app.staticTexts["Evening studio"].firstMatch.waitForExistence(timeout: 30))
    // Imported content can appear behind a sheet before UIKit finishes dismissal.
    let sheetDeadline = Date().addingTimeInterval(15)
    while app.staticTexts["Add a playlist"].exists && Date() < sheetDeadline { Thread.sleep(forTimeInterval: 0.2) }
    XCTAssertFalse(app.staticTexts["Add a playlist"].exists, "The playlist sheet did not finish dismissing")
    capture("ios-home")
    element("navigation-tab-guide").tap()
    app.buttons["Add full TV guide"].tap()
    fill("XMLTV URL", "http://127.0.0.1:9090/guide.xml", secure: true)
    let save = app.buttons["Save and refresh guide"]
    if !save.isHittable { app.swipeUp() }
    // The first tap can dismiss the secure URL keyboard in a native ScrollView.
    save.tap()
    Thread.sleep(forTimeInterval: 1)
    if save.exists && save.isEnabled { save.tap() }
    let program = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@ AND NOT label CONTAINS %@", "Evening studio,", "No matching guide ID")).firstMatch
    XCTAssertTrue(program.waitForExistence(timeout: 30), app.debugDescription)
    program.tap()
    capture("ios-guide")
    tapButton("Watch live")
    let pause = app.buttons["Pause live TV"]
    XCTAssertTrue(pause.waitForExistence(timeout: 30), app.debugDescription)
    waitForOriginalVideoFrame()
    capture("ios-player")
    tapButton("Player options")
    tapButton("Watch while browsing")
    let mini = app.buttons["Return to Evening studio"]
    XCTAssertTrue(mini.waitForExistence(timeout: 15), app.debugDescription)
    XCTAssertLessThan(mini.frame.width, app.frame.width * 0.8)
    if let bar = app.tabBars.allElementsBoundByIndex.first(where: { $0.exists && $0.frame.minY > app.frame.height * 0.5 }) {
      XCTAssertLessThanOrEqual(mini.frame.maxY, bar.frame.minY, "Mini player overlaps the native tab bar")
    } else { XCTAssertLessThan(mini.frame.maxY, app.frame.maxY) }
    capture("ios-mini-player")
    mini.tap()
    tapButton("Back to library")
    element("navigation-tab-library").tap()
    tapLibrarySegment("Movies")
    XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Open Tidewater,")).firstMatch.waitForExistence(timeout: 30))
    capture("ios-movies")
    tapLibrarySegment("Series")
    let series = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Open Tidewater Stories,")).firstMatch
    XCTAssertTrue(series.waitForExistence(timeout: 30))
    series.tap()
    XCTAssertTrue(app.buttons["Start series"].waitForExistence(timeout: 30))
    capture("ios-series")
    goBackOnNativePage()
    element("navigation-tab-search").tap()
    capture("ios-search")
    tapButton("Settings")
    XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Version history,")).firstMatch.waitForExistence(timeout: 15))
    capture("ios-settings")
    goBackOnNativePage()
    element("navigation-tab-home").tap()
    tapButton("Add playlist")
    XCTAssertTrue(app.textFields["Server address"].waitForExistence(timeout: 15))
    capture("ios-playlists")
  }

}
