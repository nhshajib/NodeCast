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
  private func homeContent() -> XCUIElement {
    app.staticTexts.matching(NSPredicate(format: "label == %@ OR label == %@", "Your TV, beautifully simple.", "Your TV, together.")).firstMatch
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
      app.buttons["Go back"].tap()
    }
    let skip = app.buttons["Not now"]
    if skip.exists { skip.tap() }
    XCTAssertTrue(home.waitForExistence(timeout: 20), app.debugDescription)
    home.tap()
    // Inspect content near the top, so small iPhones need no scroll to pass.
    let content = homeContent()
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
}
