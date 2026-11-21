import Headphones from 'lucide-react-native/icons/headphones';
import React from 'react';
import type { LucideIcon } from 'lucide-react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import Calendar from 'lucide-react-native/icons/calendar';
import Check from 'lucide-react-native/icons/check';
import CheckCircle from 'lucide-react-native/icons/check-circle';
import CheckSquare from 'lucide-react-native/icons/check-square';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Circle from 'lucide-react-native/icons/circle';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleDot from 'lucide-react-native/icons/circle-dot';
import CircleHelp from 'lucide-react-native/icons/circle-help';
import CirclePlay from 'lucide-react-native/icons/circle-play';
import CircleX from 'lucide-react-native/icons/circle-x';
import CloudOff from 'lucide-react-native/icons/cloud-off';
import Coffee from 'lucide-react-native/icons/coffee';
import Download from 'lucide-react-native/icons/download';
import Expand from 'lucide-react-native/icons/expand';
import ExternalLink from 'lucide-react-native/icons/external-link';
import File from 'lucide-react-native/icons/file';
import Film from 'lucide-react-native/icons/film';
import Folder from 'lucide-react-native/icons/folder';
import Grid2X2 from 'lucide-react-native/icons/grid-2x2';
import Heart from 'lucide-react-native/icons/heart';
import House from 'lucide-react-native/icons/house';
import Info from 'lucide-react-native/icons/info';
import Layers from 'lucide-react-native/icons/layers';
import Library from 'lucide-react-native/icons/library';
import List from 'lucide-react-native/icons/list';
import Lock from 'lucide-react-native/icons/lock';
import MapPin from 'lucide-react-native/icons/map-pin';
import Minimize from 'lucide-react-native/icons/minimize';
import Moon from 'lucide-react-native/icons/moon';
import MoreHorizontal from 'lucide-react-native/icons/more-horizontal';
import Palette from 'lucide-react-native/icons/palette';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import Radio from 'lucide-react-native/icons/radio';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Search from 'lucide-react-native/icons/search';
import Server from 'lucide-react-native/icons/server';
import Settings from 'lucide-react-native/icons/settings';
import Shield from 'lucide-react-native/icons/shield';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import SkipBack from 'lucide-react-native/icons/skip-back';
import SkipForward from 'lucide-react-native/icons/skip-forward';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import Smartphone from 'lucide-react-native/icons/smartphone';
import Square from 'lucide-react-native/icons/square';
import Sun from 'lucide-react-native/icons/sun';
import Timer from 'lucide-react-native/icons/timer';
import Tv from 'lucide-react-native/icons/tv';
import Users from 'lucide-react-native/icons/users';
import User from 'lucide-react-native/icons/user';
import Volume2 from 'lucide-react-native/icons/volume-2';
import VolumeX from 'lucide-react-native/icons/volume-x';
import X from 'lucide-react-native/icons/x';
import Plus from 'lucide-react-native/icons/plus';
import Captions from 'lucide-react-native/icons/captions';
import Clock from 'lucide-react-native/icons/clock';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
/** Keep existing semantic names/call sites; every rendered application icon is Lucide. */
const icons = {
 add: Plus, close: X, 'eye-outline': Eye, 'eye-off-outline': EyeOff, 'close-circle': CircleX, 'close-circle-outline': CircleX,
 home: House, 'home-outline': House, tv: Tv, 'tv-outline': Tv,
 film: Film, 'film-outline': Film, albums: Layers, 'albums-outline': Layers,
 library: Library, 'library-outline': Library, grid: Grid2X2, 'grid-outline': Grid2X2,
 search: Search, 'search-outline': Search, settings: Settings, 'settings-outline': Settings,
 'layers-outline': Layers, 'server-outline': Server, 'folder-outline': Folder,
 'people-outline': Users, 'person-outline': User, 'person-circle-outline': User,
 heart: Heart, 'heart-outline': Heart, 'cafe-outline': Coffee,
 'arrow-forward': ArrowRight, 'arrow-back': ArrowLeft, 'swap-horizontal-outline': ArrowLeftRight,
 'chevron-back': ChevronLeft, 'chevron-forward': ChevronRight, 'chevron-up': ChevronUp, 'chevron-down': ChevronDown,
 'ellipsis-horizontal': MoreHorizontal, 'headset-outline': Headphones, 'options-outline': SlidersHorizontal,
 'color-palette-outline': Palette, 'shield-outline': Shield, 'shield-checkmark-outline': ShieldCheck,
 'lock-closed-outline': Lock, 'location-outline': MapPin, 'calendar-outline': Calendar,
 'time-outline': Clock, 'timer-outline': Timer, 'refresh-outline': RefreshCw,
 'information-circle-outline': Info, 'warning-outline': CircleAlert, 'alert-circle-outline': CircleAlert,
 'cloud-offline-outline': CloudOff, 'open-outline': ExternalLink,
 play: Play, pause: Pause, 'play-circle': CirclePlay, 'play-circle-outline': CirclePlay,
 'play-back': SkipBack, 'play-forward': SkipForward, 'play-skip-forward': SkipForward,
 'play-skip-back': SkipBack, 'radio-outline': Radio, 'radio-button-on': CircleDot, 'radio-button-off': Circle,
 'checkmark-circle': CircleCheck, 'checkmark-circle-outline': CheckCircle, checkmark: Check,
 checkbox: CheckSquare, 'checkbox-outline': CheckSquare, 'square-outline': Square, 'ellipse-outline': Circle,
 'expand-outline': Expand, 'contract-outline': Minimize, 'phone-landscape-outline': Smartphone,
 'volume-high': Volume2, 'volume-high-outline': Volume2, 'volume-mute': VolumeX, 'volume-mute-outline': VolumeX,
 'download-outline': Download, 'document-outline': File, 'list-outline': List,
 'sunny-outline': Sun, 'moon-outline': Moon, 'closed-captioning-outline': Captions,
} satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof icons;
export function AppIcon({name,size=22,color}:{name:IconName;size?:number;color:string}) {
 const Glyph:LucideIcon=icons[name] || CircleHelp;
 return <Glyph size={size} color={color} strokeWidth={1.8} fill={name === 'heart' ? color : 'none'} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}
