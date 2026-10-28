import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Pressable from './FocusPressable';
import { useThemeChoice } from './theme';
import type { ThemeChoice } from './theme';
import { colors, u } from './ui';
export default function AppearanceSettings({ onSave }: { onSave: (theme: ThemeChoice) => Promise<void> }) {
  const { choice } = useThemeChoice(); const [error, setError] = React.useState('');
  return <ScrollView contentContainerStyle={u.content}><Text style={u.h1}>Appearance</Text><Text style={u.body}>The same calm space, in your preferred light.</Text><View style={u.card}>{(['light','dark','system'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} appearance`} accessibilityState={{ checked: choice === value }} onPress={() => { void onSave(value).catch(() => setError('Could not save appearance.')); }} style={{ minHeight: 56, justifyContent: 'center' }}><Text style={[u.label, choice === value && { color: colors.accent }]}>{choice === value ? '● ' : '○ '}{value === 'system' ? 'Follow device' : value === 'dark' ? 'Dark' : 'Light'}</Text></Pressable>)}</View>{!!error && <Text style={u.errorText}>{error}</Text>}</ScrollView>;
}
