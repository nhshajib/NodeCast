import AppShell from '../src/navigation/AppShell';
import { RootNavigator } from '../src/navigation/navigation';

export default function RootLayout() {
  return <AppShell><RootNavigator /></AppShell>;
}
