# Android 15 x86 emulator rendering follow-up

The final phone and TV APKs build, install, import the synthetic playlist and load the guide on API 35. Their VLC textures remain black in the headless API 35 x86 emulator. This is an unresolved rendering check, not a passing playback result. Physical Android 15 behavior has not been established.

The same Android app source passes decoded-video, eight-screen and eight-settings checks on API 30. The TV result also uses only D-pad, Select, Back and keyboard text. The passing screenshots are identified in `native/android-audit.json` and `native/tv-audit.json`; failed artifacts are never used in marketing.

Observed evidence:

- Native view bounds are positive, including the phone texture at 1080×630.
- The API 35 logs select `c2.goldfish.h264.decoder` and report surface-allocator queries that return `BAD_INDEX`.
- SWANGLE and SwiftShader comparisons did not produce the original video frame.
- Disabling Vulkan did not resolve the frame check.
- Setting `debug.stagefright.ccodec=0` in the disposable emulator did not change the selected Goldfish decoder.
- The host-video comparison also failed. No production decoder policy was changed to satisfy this test.

Relevant runs: [initial rebuilt APK](https://github.com/nhshajib/NodeCast/actions/runs/44073609602), [GPU comparison](https://github.com/nhshajib/NodeCast/actions/runs/44075193720), [Vulkan comparison](https://github.com/nhshajib/NodeCast/actions/runs/44077958420), [Codec2 property comparison](https://github.com/nhshajib/NodeCast/actions/runs/44079759305), [host video comparison](https://github.com/nhshajib/NodeCast/actions/runs/44083348409).

Before publishing installers, check the original synthetic scene on a physical ARM64 Android 15 device. Compare the existing native and VLC playback choices and inspect whether the decoded frame is absent or only omitted from system screenshots. Reproduce outside the app before attributing the failure to the emulator or a particular library. Preserve Fit/Fill, subtitles, guide previews, the mini player and playback-setting overlays when addressing rendering compatibility. Do not replace captures with reconstructed or black video surfaces.
