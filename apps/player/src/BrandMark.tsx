import React from 'react';
import { Image } from 'react-native';
/** Original supplied GlowTV mark; explicit dimensions keep headers stable. */
export default function BrandMark({ size = 36 }: { size?: number }) {
  return <Image source={require('../assets/brand/glowtv-mark.png')} resizeMode="contain" accessible={false} style={{ width: size, height: size }} />;
}
