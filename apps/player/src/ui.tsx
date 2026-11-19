import { useAnnouncement } from './accessibility';
import { Text } from './Typography';
import Pressable, {isTVBuild} from './FocusPressable';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { AppIcon } from './icons';
import type { IconName } from './icons';
import { space, control, tvType } from './designTokens';
export type { IconName } from './icons';
export { colors } from './theme';
import { colors, themedStyles, isDarkTheme, androidDesign, tvDesign } from './theme';

export function Icon({ name, size = 22, color = colors.text }: { name: IconName; size?: number; color?: string }) { return <AppIcon name={name} size={size} color={color} />; }
export function Button({ title, onPress, variant = 'primary', busy = false, disabled = false, icon, accessibilityLabel, nativeID }: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'mint' | 'ink'; busy?: boolean; disabled?: boolean; icon?: IconName; accessibilityLabel?:string; nativeID?:string;
}) {
  return <Pressable nativeID={nativeID || (isTVBuild ? `tv-preferred:button:${title}` : undefined)} accessibilityRole="button" accessibilityLabel={accessibilityLabel||title} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [u.button, variant === 'secondary' && u.secondaryButton, variant === 'mint' && { backgroundColor: colors.primary }, variant === 'ink' && { backgroundColor: colors.ink }, variant === 'danger' && { backgroundColor: colors.dangerSurface }, (pressed || disabled || busy) && { opacity: .6 }]}>
    {busy ? <ActivityIndicator color={variant === 'ink' ? '#fff' : variant === 'primary' ? colors.primaryText : variant === 'mint' ? colors.primaryText : colors.text} /> : icon && <Icon name={icon} size={19} color={variant === 'danger' ? colors.danger : variant === 'ink' ? '#fff' : variant === 'primary' ? colors.primaryText : variant === 'mint' ? colors.primaryText : colors.text} />}
    <Text style={[u.buttonText, variant !== 'primary' && { color: variant === 'ink' ? '#fff' : variant === 'mint' ? colors.primaryText : colors.text }, variant === 'danger' && { color: colors.danger }]}>{title}</Text>
  </Pressable>;
}
export function IconButton({ name, label, onPress, disabled, dark = false, nativeID }: { nativeID?: string; name: IconName; label: string; onPress: () => void; disabled?: boolean; dark?: boolean }) {
  return <Pressable nativeID={nativeID} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [u.iconButton, dark && { backgroundColor: '#18201C' }, pressed && { opacity: .6 }]}><Icon name={name} color={dark ? '#fff' : colors.text} /></Pressable>;
}
export function Field({ label, hideLabel=false, style, onFocus, onBlur, inputRef, ...props }: React.ComponentProps<typeof TextInput> & { label: string; hideLabel?:boolean; inputRef?: React.Ref<React.ComponentRef<typeof TextInput>> }) {
  const [focused, setFocused] = useState(false);
  const floating = androidDesign && !hideLabel;
  return <View style={{ gap: hideLabel || floating ? 0 : 8, paddingTop: floating ? 8 : 0 }}>
    {!hideLabel && <Text pointerEvents="none" style={[u.fieldLabel, floating && { position: 'absolute', left: 12, top: 0, paddingHorizontal: 8, backgroundColor: colors.bg, zIndex: 1, fontSize: 12, color: focused ? colors.link : colors.secondary }]}>{label}</Text>}
    <TextInput {...props} ref={inputRef} nativeID={props.nativeID||(isTVBuild?`tv-field:${label}`:undefined)} accessibilityLabel={props.accessibilityLabel || label} onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }} autoCapitalize="none" autoCorrect={false} placeholderTextColor={colors.secondary} style={[u.input, floating && { borderRadius: 12, backgroundColor: 'transparent' }, focused && { borderColor: colors.accent, borderWidth:isTVBuild?3:2 }, props.editable === false && { opacity: .65 }, style]} />
  </View>;
}
export function Empty({ icon, title, message, children }: { icon: IconName; title: string; message: string; children?: React.ReactNode }) {
  return <View style={u.empty}><View style={u.emptyIcon}><Icon name={icon} size={30} color={colors.link} /></View><Text accessibilityRole="header" style={[u.h2, { textAlign: 'center' }]}>{title}</Text><Text style={[u.body, { textAlign: 'center', maxWidth: 330 }]}>{message}</Text>{children}</View>;
}
export function H1(props: React.ComponentProps<typeof Text>) {return <Text {...props} accessibilityRole="header" style={[u.h1,props.style]}/>;}
export function H2(props: React.ComponentProps<typeof Text>) {return <Text {...props} accessibilityRole="header" style={[u.h2,props.style]}/>;}
export function Notice({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  const plain = React.Children.toArray(children).filter(child => typeof child === 'string' || typeof child === 'number').join(' ');
  useAnnouncement(plain);
  return <View accessibilityRole={danger?'alert':undefined} accessibilityLiveRegion={danger?'assertive':'polite'} style={[u.notice, danger && { backgroundColor: colors.dangerSurface }]}><Text style={[u.small, danger && { color: colors.danger }]}>{children}</Text></View>;
}
export function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={u.between}><H2>{title}</H2>{action && <Pressable accessibilityRole="button" hitSlop={4} style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 8 }} onPress={onAction}><Text style={u.link}>{action}</Text></Pressable>}</View>;
}
export const u = themedStyles(() => ({
  root: { flex: 1, backgroundColor: colors.bg }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  body: { color: colors.secondary, fontSize: 15, lineHeight: 23 }, small: { color: colors.secondary, fontSize: 13, lineHeight: 20 },
  h1: { fontSize: 32, lineHeight: 38, fontFamily: 'Inter-800', fontWeight: '800', color: colors.text, letterSpacing: -.65 }, h2: { fontSize: 19, lineHeight: 25, color: colors.text, fontWeight: '700', letterSpacing: -.5 },
  label: { fontSize: 16, lineHeight: 22, color: colors.text, fontWeight: '600' }, eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: colors.secondary },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }, row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  section: { gap: space.sm },
  card: { backgroundColor: colors.panel, borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, gap: space.sm },
  button: { minHeight: control.input, paddingVertical: space.sm, paddingHorizontal: space.md, backgroundColor: colors.primary, borderRadius: 999, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: space.xs },
  buttonText: { fontSize: tvDesign ? tvType.button : 15, color: colors.primaryText, fontWeight: '600', textAlign: 'center', flexShrink: 1 }, secondaryButton: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  iconButton: { width: control.touch, height: control.touch, borderRadius: 12, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  input: { outlineWidth: 0, backgroundColor: colors.panel, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, color: colors.text, fontSize: tvDesign?18:16, minHeight: control.input },
  fieldLabel: { fontSize: tvDesign ? tvType.small : 13, fontWeight: '600', color: colors.text }, link: { color: colors.link, fontSize: tvDesign ? tvType.small : 13, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.md, gap: 16 }, emptyIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  notice: { paddingVertical: space.xs, gap: space.xs }, divider: { height: 1, backgroundColor: colors.line },
  modalHeader: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  content: { maxWidth: 720, alignSelf: 'center', width: '100%', paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: 128, gap: 24 }, errorText: { color: colors.danger, fontSize: 13, lineHeight: 20 },
}));
