// iOS playback crash guards applied before the native compile:
// - VLCMedia(url:) is nullable; force-unwrapping it aborts when a stream URL is rejected.
// - expo-video enables Picture in Picture before the audio session is ready and can raise.
const fs = require('node:fs');
const path = require('node:path');

function patch(file, original, fixed, label) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(fixed)) return;
  if (!source.includes(original)) throw new Error(`${label} patch no longer matches; review before building.`);
  fs.writeFileSync(file, source.replace(original, fixed));
  console.log(`Applied ${label}.`);
}

const vlcRoot = path.dirname(require.resolve('expo-libvlc-player/package.json'));
const vlcPackage = JSON.parse(fs.readFileSync(path.join(vlcRoot, 'package.json'), 'utf8'));
if (vlcPackage.version !== '58.0.4') throw new Error('Review the iOS VLC media patch for this dependency version.');
patch(
  path.join(vlcRoot, 'ios/Player/MediaPlayer.swift'),
  `    let media = VLCMedia(url: url)
    args.forEach { arg in media!.addOption(arg) }
    mediaPlayer!.media = media`,
  `    guard let media = VLCMedia(url: url) else {
      view.onEncounteredError(["message": "Invalid source, media could not be set"])
      return
    }
    args.forEach { arg in media.addOption(arg) }
    mediaPlayer!.media = media`,
  'iOS VLC nil-media guard',
);

const videoRoot = path.dirname(require.resolve('expo-video/package.json'));
const videoFile = path.join(videoRoot, 'ios/VideoView.swift');
const videoSource = fs.readFileSync(videoFile, 'utf8');
if (!videoSource.includes('import AVFoundation\n')) {
  if (!videoSource.includes('import AVKit\n')) throw new Error('expo-video VideoView.swift no longer imports AVKit.');
  fs.writeFileSync(videoFile, videoSource.replace('import AVKit\n', 'import AVFoundation\nimport AVKit\n'));
}
patch(
  videoFile,
  `  var allowPictureInPicture: Bool = false {
    didSet {
      // PiP requires \`.playback\` audio session category in \`.moviePlayback\` mode
      VideoManager.shared.setAppropriateAudioSessionOrWarn()
      playerViewController.allowsPictureInPicturePlayback = allowPictureInPicture
    }
  }`,
  `  var allowPictureInPicture: Bool = false {
    didSet {
      // The stock setter queues the audio session and then enables PiP immediately.
      // AVKit can raise if the session is not already .playback, which kills the process.
      if allowPictureInPicture {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .moviePlayback)
        try? session.setActive(true)
      }
      playerViewController.allowsPictureInPicturePlayback = allowPictureInPicture
    }
  }`,
  'iOS video Picture in Picture session',
);
