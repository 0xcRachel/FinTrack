import {
  Baby, BookOpen, Briefcase, Bus, Car, CircleDot, Clapperboard, Coffee, Dumbbell,
  Fuel, Gamepad2, Gift, GraduationCap, HeartPulse, Home, Laptop, Music, PawPrint,
  PiggyBank, Plane, PlugZap, Shirt, ShoppingBag, Tag, TrendingUp, Utensils, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  tag: Tag,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  wallet: Wallet,
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  home: Home,
  'plug-zap': PlugZap,
  'heart-pulse': HeartPulse,
  clapperboard: Clapperboard,
  'graduation-cap': GraduationCap,
  'circle-dot': CircleDot,
  coffee: Coffee,
  plane: Plane,
  gift: Gift,
  'book-open': BookOpen,
  music: Music,
  'gamepad-2': Gamepad2,
  'piggy-bank': PiggyBank,
  dumbbell: Dumbbell,
  'paw-print': PawPrint,
  baby: Baby,
  shirt: Shirt,
  bus: Bus,
  fuel: Fuel,
};

export const categoryIcon = (name?: string | null): LucideIcon => ICONS[name ?? ''] ?? Tag;

export const CATEGORY_ICON_OPTIONS = Object.entries(ICONS).map(([name, Icon]) => ({ name, Icon }));
