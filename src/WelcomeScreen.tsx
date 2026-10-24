import React from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, colors } from './ui';
import TVFriend from './TVFriend';
export default function WelcomeScreen({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  const { width, height } = useWindowDimensions();
  const compact = height < 740;
  return <LinearGradient colors={['#D5D1F4', '#F7F6FA', '#FAE7C8']} locations={[0, .46, 1]} style={{ flex: 1 }}><SafeAreaView style={{ flex: 1 }}>
    <View style={{ paddingHorizontal: 24, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontSize: 18, fontWeight: '700', letterSpacing: -.8, color: colors.text }}>nodecast.</Text><Pressable accessibilityRole="button" onPress={onDemo} style={{ padding: 10 }}><Text style={{ color: '#625C78', fontSize: 12 }}>Explore demo</Text></Pressable></View>
    <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 25, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 13, alignItems: 'center', marginBottom: 24 }}><Text style={{ fontFamily: 'CrimsonText', fontSize: compact ? 39 : 46, lineHeight: compact ? 42 : 49, color: '#090124', textAlign: 'center', letterSpacing: -.7 }}>{'Good TV.\nMade simple.'}</Text><Text style={{ fontSize: 14, lineHeight: 22, color: colors.secondary, textAlign: 'center', maxWidth: 290 }}>Your live channels, films, and favorite series. A little less searching. A lot more watching.</Text></View>
      <TVFriend size={Math.min(width - 64, compact ? 220 : 284)} />
      <Text style={{ marginTop: 22, color: colors.secondary, fontSize: 11, letterSpacing: 1.5 }}>LIVE TV  ·  MOVIES  ·  SERIES</Text>
    </ScrollView>
    <View style={{ paddingHorizontal: 24, paddingBottom: 13, gap: 12 }}><Pressable accessibilityRole="button" accessibilityLabel="Get started" onPress={onStart} style={({ pressed }) => ({ backgroundColor: '#111111', borderRadius: 34, paddingLeft: 25, paddingRight: 7, paddingVertical: 7, minHeight: 62, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: pressed ? .8 : 1 })}><Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Get started</Text><View style={{ backgroundColor: '#fff', width: 46, height: 46, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-forward" size={23} color="#090124" /></View></Pressable><Text style={{ fontSize: 12, textAlign: 'center', color: colors.secondary }}>Bring your own playlist. No account needed.</Text></View>
  </SafeAreaView></LinearGradient>;
}
