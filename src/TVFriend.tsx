import React from 'react';
import { View } from 'react-native';
// Original IPTV illustration made from native views; no reference artwork is copied.
export default function TVFriend({ size = 300 }: { size?: number }) {
  const k = size / 300;
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size * .94 }}>
    <View style={{ position: 'absolute', left: '33%', top: '0%', width: '5%', height: '24%', backgroundColor: '#AAA3ED', borderRadius: 10, transform: [{ rotate: '-32deg' }] }} />
    <View style={{ position: 'absolute', left: '58%', top: '0%', width: '5%', height: '24%', backgroundColor: '#AAA3ED', borderRadius: 10, transform: [{ rotate: '32deg' }] }} />
    <View style={{ position: 'absolute', top: '14%', left: 0, width: '100%', height: '83%', backgroundColor: '#FAE7C8', borderTopLeftRadius: 76*k, borderTopRightRadius: 68*k, borderBottomLeftRadius: 59*k, borderBottomRightRadius: 75*k, borderWidth: 5*k, borderColor: '#FFF7E9' }}>
      <View style={{ position: 'absolute', left: '8%', right: '8%', top: '10%', bottom: '14%', backgroundColor: '#FFF0D6', borderRadius: 45*k }}>
        <View style={{ position: 'absolute', left: '24%', top: '27%', width: '20%', height: '37%', backgroundColor: '#FFFFFF', borderRadius: 100 }}><View style={{ position: 'absolute', right: '9%', top: '12%', width: '64%', height: '75%', backgroundColor: '#3E3C41', borderRadius: 100 }}><View style={{ position: 'absolute', left: '12%', top: '7%', width: '23%', height: '24%', backgroundColor: '#fff', borderRadius: 30 }} /></View></View>
        <View style={{ position: 'absolute', right: '24%', top: '27%', width: '20%', height: '37%', backgroundColor: '#FFFFFF', borderRadius: 100 }}><View style={{ position: 'absolute', right: '9%', top: '12%', width: '64%', height: '75%', backgroundColor: '#3E3C41', borderRadius: 100 }}><View style={{ position: 'absolute', left: '12%', top: '7%', width: '23%', height: '24%', backgroundColor: '#fff', borderRadius: 30 }} /></View></View>
        <View style={{ position: 'absolute', width: '23%', height: '18%', top: '60%', left: '39%', borderBottomWidth: 5*k, borderRightWidth: 5*k, borderColor: '#DFBD86', borderBottomLeftRadius: 18*k, borderBottomRightRadius: 26*k, transform: [{ rotate: '15deg' }] }} />
      </View>
      <View style={{ position: 'absolute', bottom: '5%', left: '43%', width: '16%', height: '5%', borderRadius: 10, backgroundColor: '#B9B4F2' }} />
    </View>
    <View style={{ position: 'absolute', width: 12*k, height: 12*k, borderRadius: 7*k, backgroundColor: '#B9B4F2', left: '8%', top: '9%' }} />
    <View style={{ position: 'absolute', width: 8*k, height: 8*k, borderRadius: 5*k, backgroundColor: '#FAE7C8', right: '3%', top: '12%' }} />
  </View>;
}
