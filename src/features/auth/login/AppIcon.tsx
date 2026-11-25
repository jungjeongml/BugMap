import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Bug,
  Camera,
  Compass,
  Handshake,
  MessageCircle,
  Navigation,
  Search,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { Platform } from 'react-native';
import { colors } from '../../../theme/tokens';

const icons = {
  beetle: Bug,
  compass: Compass,
  navigation: Navigation,
  camera: Camera,
  sparkle: Sparkles,
  psychology: Brain,
  handshake: Handshake,
  verified: BadgeCheck,
  community: UsersRound,
  kakao: MessageCircle,
  naver: Search,
  apple: Smartphone,
  arrow: ArrowRight,
  security: ShieldCheck,
  shield: Shield,
  bolt: Zap,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export function AppIcon({
  name,
  size,
  color = colors.primary,
  strokeWidth = 2,
}: {
  name: IconName;
  size: number;
  color?: string;
  strokeWidth?: number;
}) {
  const Icon = icons[name];
  const accessibilityProps = Platform.OS === 'web'
    ? { 'aria-hidden': true as const }
    : { accessible: false };
  return <Icon {...accessibilityProps} size={size} color={color} strokeWidth={strokeWidth} />;
}
