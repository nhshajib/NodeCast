import BrandMark from './BrandMark';
import { Text } from './Typography';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Icon, colors, u } from './ui';
export default function WelcomeScreen({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  return <SafeAreaView style={u.root}><ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 28, justifyContent: 'space-between' }}><View style={[u.row, { gap: 10 }]}><BrandMark size={36} /><Text style={[u.h2, { fontSize: 22 }]}>GlowTV</Text></View><View style={{ gap: 20 }}><View style={{ backgroundColor: colors.featured, borderRadius: 16, aspectRatio: 1.5, alignItems: 'center', justifyContent: 'center', gap: 16 }}><Icon name="tv-outline" size={76} color="#E8EEEA" /><Text style={{ color: '#D0E9DB', fontSize: 14 }}>LIVE TV  ·  MOVIES  ·  SERIES</Text></View><Text style={[u.h1, { fontSize: 40, lineHeight: 45 }]}>Your TV,{'\n'}beautifully lit.</Text><Text style={u.body}>Your playlists, favorite channels and next great series. All together in a player made for you.</Text></View><View style={{ gap: 12 }}><Button title="Get started" icon="arrow-forward" onPress={onStart} /><Button title="Explore demo" variant="secondary" onPress={onDemo} /><Text style={[u.small, { textAlign: 'center' }]}>Free. No account needed. Bring your own content.</Text></View></ScrollView></SafeAreaView>;
}
