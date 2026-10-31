import XCTest

final class NodeCastResumeUITests: XCTestCase {
  private let app = XCUIApplication(bundleIdentifier: "com.nhshajib.nodecast")

  private func element(_ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }
  private func capture(_ name: String) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  private func settleHome() {
    let start = app.buttons["Get started"]
    if start.waitForExistence(timeout: 3) {
      start.tap()
      let skip = app.buttons["Not now"]
      XCTAssertTrue(skip.waitForExistence(timeout: 20))
      skip.tap()
      let back = app.buttons["Go back"]
      if back.waitForExistence(timeout: 5) { back.tap() }
    }
    let skip = app.buttons["Not now"]
    if skip.waitForExistence(timeout: 2) { skip.tap() }
    let home = element("navigation-tab-home")
    XCTAssertTrue(home.waitForExistence(timeout: 20), app.debugDescription)
    home.tap()
    // The header alone is insufficient: the original failure retained it and
    // the tab bar while the complete content surface stayed transparent.
    let content = app.buttons.matching(NSPredicate(format: "label == %@ OR label == %@", "Open library", "Add your first playlist")).firstMatch
    XCTAssertTrue(content.waitForExistence(timeout: 15), app.debugDescription)
    XCTAssertTrue(content.isHittable, "Home content is present but invisible after returning")
  }
  func testColdStartsAndBackgroundResumeKeepHomeVisible() {
    continueAfterFailure = false
    app.launch()
    settleHome()
    capture("01-home-cold-start")
    for tab in ["you", "watch", "saved", "you", "watch", "saved"] {
      element("navigation-tab-\(tab)").tap()
      element("navigation-tab-home").tap()
      settleHome()
    }
    for delay in [1.0, 15.0, 60.0] {
      XCUIDevice.shared.press(.home)
      Thread.sleep(forTimeInterval: delay)
      app.activate()
      // Check before touching navigation: recovery must work without a tap.
      let content = app.buttons.matching(NSPredicate(format: "label == %@ OR label == %@", "Open library", "Add your first playlist")).firstMatch
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
}
