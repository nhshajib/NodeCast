# GlowTV 0.7.3 release verification

Build source: `7cb5f25733eda05383192fd41b085bcc5c99385a`.

- [Corrected Android phone and TV builds](https://github.com/nhshajib/NodeCast/actions/runs/44633698018), source `c6d9f45f7bd5a3b117bfe0a95e888502150e4a92`.
- The first Android run compiled the phone APK; TV found a nullable Kotlin focus-target variable. The correction explicitly types the non-null target and retains the focus behavior.
- [Preliminary native phone audit](https://github.com/nhshajib/NodeCast/actions/runs/44633792554) uses the first phone APK to catch UI-test issues while the final builds run.
- [iPhone/iPad native audit and ARM64 IPA build](https://github.com/nhshajib/NodeCast/actions/runs/44631335671).

The build and native audit results are pending. No new download has been published yet. Existing website links remain on the last verified public release.

Source checks: TypeScript, 138 tests, all three Expo web exports, spacing grid and protected-source checks passed. Website: 4 tests, Astro check/build and all-page accessibility/HTML/link audit passed. Fresh native captures will replace the previous release screenshots only after successful native audits.

Physical-device follow-ups remain required: Fire TV remote/IME behavior, iPad multitasking/rotation, VoiceOver/TalkBack and the largest native Dynamic Type. Emulator results must not be presented as physical-device results.

## Native findings during release preparation

The preliminary phone emulator audit caught a launch-time Hermes exception: the count formatter constructed `Intl.PluralRules` unconditionally. The formatter now guards its availability and uses English singular/plural fallback rules. A subprocess test reproduces an engine without that constructor; 139 tests pass. New native builds use source `16033c1e091eafd81a215935ad2270c76abd238d`:

- Android: https://github.com/nhshajib/NodeCast/actions/runs/44635308909
- iPhone/iPad and IPA: https://github.com/nhshajib/NodeCast/actions/runs/44635313388

The superseded packages are not published. The homepage platform-detection label no longer expands after hydration; the measured layout shift is zero. Fresh all-page mobile/desktop Lighthouse reports meet 95+ across all categories; see [the scores](../LIGHTHOUSE.md).
