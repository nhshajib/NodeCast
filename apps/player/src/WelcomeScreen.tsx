import { PlainSection } from './AuditPrimitives';
import BrandMark from './BrandMark';
import { Text } from './Typography';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Icon, colors, u } from './ui';
export default function WelcomeScreen({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  return <SafeAreaView style={u.root}><ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 32, justifyContent: 'space-between' }}><View style={[u.row, { gap: 8 }]}><BrandMark size={36} /><Text style={[u.h2, { fontSize: 22 }]}>GlowTV</Text></View><PlainSection><Icon name="tv-outline" size={48} color={colors.secondary} /><Text style={[u.h1, { fontSize: 40, lineHeight: 45 }]}>Your TV,{'\n'}beautifully lit.</Text><Text style={u.body}>Your playlists, favorite channels and next great series. All together in a player made for you.</Text></PlainSection><View style={{ gap: 16 }}><Button title="Get started" icon="arrow-forward" onPress={onStart} /><Button title="Explore demo" variant="secondary" onPress={onDemo} /><Text style={[u.small, { textAlign: 'center' }]}>Free. No account needed. Bring your own content.</Text></View></ScrollView></SafeAreaView>;
}
