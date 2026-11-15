import XCTest

final class GlowTVResumeUITests: XCTestCase {
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
    // iOS exposes nested StaticText nodes for styled headings; their hit-test
    // result is not a visibility test. A real action inside Home verifies both
    // visible content and interaction, rather than only the persistent tab bar.
    app.buttons["Search channels, movies and series"]
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
    let visible = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in content.exists && content.isHittable }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [visible], timeout: 15), .completed, "Home content is present but invisible after returning: \(app.debugDescription)")
  }
  func testColdStartsAndBackgroundResumeKeepHomeVisible() {
    continueAfterFailure = false
    app.launch()
    settleHome()
    capture("01-home-cold-start")
    for tab in ["guide", "movies", "series", "search", "guide", "movies"] {
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
    app.buttons["Add playlist"].tap()
    func fill(_ label: String, _ value: String, secure: Bool = false) {
      let field = secure ? app.secureTextFields[label] : app.textFields[label]
      XCTAssertTrue(field.waitForExistence(timeout: 15), app.debugDescription)
      if !field.isHittable { app.scrollViews.firstMatch.swipeUp() }
      field.tap(); field.typeText(value)
    }
    fill("Profile name", "Demo playlist")
    fill("Server address", "http://127.0.0.1:9090")
    fill("Username", "example")
    fill("Password", "example", secure: true)
    app.swipeUp()
    let connect = app.buttons["Connect playlist"]
    XCTAssertTrue(connect.waitForExistence(timeout: 15))
    if !connect.isHittable { app.swipeUp() }
    connect.tap()
    XCTAssertTrue(app.staticTexts["Evening studio"].firstMatch.waitForExistence(timeout: 30))
    capture("ios-home")
    element("navigation-tab-guide").tap()
    app.buttons["Add full TV guide"].tap()
    fill("XMLTV URL", "http://127.0.0.1:9090/guide.xml", secure: true)
    let save = app.buttons["Save and refresh guide"]
    if !save.isHittable { app.swipeUp() }
    save.tap()
    let program = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Evening studio,")).firstMatch
    XCTAssertTrue(program.waitForExistence(timeout: 30), app.debugDescription)
    program.tap()
    capture("ios-guide")
    app.buttons["Watch live"].tap()
    let pause = app.buttons["Pause live TV"]
    XCTAssertTrue(pause.waitForExistence(timeout: 30), app.debugDescription)
    capture("ios-player")
    app.buttons["Back to library"].firstMatch.tap()
    element("navigation-tab-movies").tap()
    XCTAssertTrue(app.buttons["Open Tidewater"].waitForExistence(timeout: 30))
    capture("ios-movies")
    element("navigation-tab-series").tap()
    let series = app.buttons["Open Tidewater Stories"]
    XCTAssertTrue(series.waitForExistence(timeout: 30))
    series.tap()
    XCTAssertTrue(app.buttons["Start series"].waitForExistence(timeout: 30))
    capture("ios-series")
    app.buttons["Go back"].tap()
    element("navigation-tab-search").tap()
    capture("ios-search")
    app.buttons["Settings"].tap()
    XCTAssertTrue(app.buttons["Version history"].waitForExistence(timeout: 15))
    capture("ios-settings")
    app.buttons["Add playlist"].tap()
    XCTAssertTrue(app.textFields["Server address"].waitForExistence(timeout: 15))
    capture("ios-playlists")
  }

}
