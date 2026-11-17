# Android 15 native compatibility audit

The initial API 35 x86 emulator decoded VLC video into a black surface on phone and TV. The same UI passed on API 30. This difference was investigated rather than replacing the captures or changing physical-device playback defaults.

## Decoded video

The API 35 logs selected `c2.goldfish.h264.decoder` and reported surface-allocator queries returning `BAD_INDEX`. Positive native view bounds, SWANGLE/SwiftShader comparisons, disabling Vulkan and a Codec2 property override did not resolve the frame check.

The version-guarded, idempotent `scripts/patch-android-vlc.cjs` patch selects VLC's existing `avcodec` software decoder **only when Android is API 35+ and Build.HARDWARE is Ranchu or Goldfish**. Every physical-device path retains the original VLC constructor and decoding behavior. The engine, provider URLs, headers, credentials and JavaScript playback policy remain unchanged. An obsolete, ignored `avcodec-hw` option from the preview was removed after inspecting the runtime log.

Both native APKs compiled successfully in [44092474689](https://github.com/nhshajib/NodeCast/actions/runs/44092474689). The complete TV API 35 audit passed in [44096346926](https://github.com/nhshajib/NodeCast/actions/runs/44096346926): all eight screens, eight settings destinations, provider import, EPG and real decoded video, using only remote input. [TV result](native/tv-api35-audit.json) and [independent original-scene pixel check](native/tv-api35-frame-audit.json).

The phone also rendered the original video in [44095327813](https://github.com/nhshajib/NodeCast/actions/runs/44095327813), but that overall run failed later on Back navigation. A partial video result is not represented as a full phone audit pass.

## Native Back follow-up

Both legacy Back-key injection and a real system Back gesture returned to the launcher from Series detail on API 35. The logs identified `TYPE_RETURN_TO_HOME`; there was no application crash. RN 0.88's `ReactActivity` registers its dispatcher bridge only when `AndroidVersion.isAtLeastTargetSdk36` is true, leaving the earlier predictive-Back runtimes without that bridge.

The phone-only `withAndroidBackDispatch` config plugin bridges the existing RN Back dispatch on Android 13–15. It preserves the native stack, route definitions and animation options. The root fallback temporarily disables the bridge to avoid recursion, then reenables it for resume. Android 16+, TV and iOS retain their existing paths. The native verification additionally checks gesture Back, key Back, root backgrounding and navigation after resume.

The corrected three-ABI phone build passed in [44100211918](https://github.com/nhshajib/NodeCast/actions/runs/44100211918). The complete API 35 phone audit then passed in [44105553364](https://github.com/nhshajib/NodeCast/actions/runs/44105553364), using that exact APK: all eight screens, all eight settings destinations, actual video, gesture Back, Back keys, root exit, reopening and navigation after reopening. [Phone result](native/android-api35-audit.json) and [independent original-scene pixel check](native/android-api35-frame-audit.json).

The final harness dismisses Search's keyboard before asserting route Back after a cold reopen. Android correctly dismisses an open keyboard before leaving Search; this standard behavior is not treated as a navigation defect. An interrupted Google emulator-image download was retried without changing the APK.

Release packaging also exposed insufficient Gradle metaspace on one runner. The workflow now allocates 3 GiB heap and 1 GiB metaspace and retains stack traces on failure. This affects CI build resources only, not the app's runtime memory or signing.

## Test-environment isolation and limits

A fresh AVD also presented a Pixel Launcher ANR over the TV app. The harness records and clears only that exact system-launcher failure before app launch; it never dismisses a GlowTV ANR. The successful TV artifact retains this evidence.

The selected website galleries remain the fully passing API 30 phone/TV captures. Additional API 35 evidence is stored separately and must pass the same original green-band and dark-scene pixel assertions. Physical Android 15, Hisense Fire TV and 4K hardware behavior still require device testing; emulator success does not establish those results.
