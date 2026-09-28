import React from 'react';
import {
  Crown,
  ShieldCheck,
  ShieldStar,
  LockKey,
  IdentificationCard,
  Sparkle,
  Headset,
  ChatCircleText,
  Bicycle,
  Truck,
  NavigationArrow,
  Package,
  Coins,
  CurrencyDollar,
  Bank,
  Receipt,
  Wallet,
  Storefront,
  ForkKnife,
  ChefHat,
  CookingPot,
  Megaphone,
  Tag,
  TrendUp,
  ChartLineUp,
  ChartBar,
  Scales,
  Eye,
  UsersThree,
  UserGear,
  Lifebuoy,
  FileText,
} from '@phosphor-icons/react';

export interface RoleSymbolDefinition {
  id: string;
  label: string;
  category: 'Leadership' | 'Support & Ops' | 'Finance' | 'Merchants' | 'Analytics & Growth';
  Icon: React.ComponentType<{ size?: number; weight?: any; className?: string }>;
}

export const ROLE_SYMBOLS: RoleSymbolDefinition[] = [
  // 1. Leadership & Access
  { id: 'Crown', label: 'Crown (Owner / Top Admin)', category: 'Leadership', Icon: Crown },
  { id: 'ShieldCheck', label: 'Security Shield', category: 'Leadership', Icon: ShieldCheck },
  { id: 'ShieldStar', label: 'Star Guardian (Super Admin)', category: 'Leadership', Icon: ShieldStar },
  { id: 'LockKey', label: 'Key (Access & Passwords)', category: 'Leadership', Icon: LockKey },
  { id: 'IdentificationCard', label: 'Staff ID Card', category: 'Leadership', Icon: IdentificationCard },
  { id: 'Sparkle', label: 'Sparkle (Master Admin)', category: 'Leadership', Icon: Sparkle },

  // 2. Support & Operations
  { id: 'Headset', label: 'Customer Support Headset', category: 'Support & Ops', Icon: Headset },
  { id: 'ChatCircleText', label: 'Live Chat Support', category: 'Support & Ops', Icon: ChatCircleText },
  { id: 'Lifebuoy', label: 'Emergency Help', category: 'Support & Ops', Icon: Lifebuoy },
  { id: 'Bicycle', label: 'Bicycle (Rider Dispatch)', category: 'Support & Ops', Icon: Bicycle },
  { id: 'Truck', label: 'Delivery Truck', category: 'Support & Ops', Icon: Truck },
  { id: 'NavigationArrow', label: 'GPS Live Map', category: 'Support & Ops', Icon: NavigationArrow },
  { id: 'Package', label: 'Order Package', category: 'Support & Ops', Icon: Package },

  // 3. Finance & Payouts
  { id: 'Coins', label: 'Coins & Cash', category: 'Finance', Icon: Coins },
  { id: 'CurrencyDollar', label: 'Cash & Payouts', category: 'Finance', Icon: CurrencyDollar },
  { id: 'Bank', label: 'Bank Account', category: 'Finance', Icon: Bank },
  { id: 'Receipt', label: 'Receipt & Invoices', category: 'Finance', Icon: Receipt },
  { id: 'Wallet', label: 'Cash Wallet', category: 'Finance', Icon: Wallet },

  // 4. Merchants & Stores
  { id: 'Storefront', label: 'Restaurant Store', category: 'Merchants', Icon: Storefront },
  { id: 'ForkKnife', label: 'Food & Cutlery', category: 'Merchants', Icon: ForkKnife },
  { id: 'ChefHat', label: 'Chef Hat (Kitchen)', category: 'Merchants', Icon: ChefHat },
  { id: 'CookingPot', label: 'Cooking Pot', category: 'Merchants', Icon: CookingPot },

  // 5. Analytics, Growth & Compliance
  { id: 'ChartLineUp', label: 'Growth Chart', category: 'Analytics & Growth', Icon: ChartLineUp },
  { id: 'ChartBar', label: 'Bar Reports', category: 'Analytics & Growth', Icon: ChartBar },
  { id: 'TrendUp', label: 'Trending Up', category: 'Analytics & Growth', Icon: TrendUp },
  { id: 'Megaphone', label: 'Announcements & News', category: 'Analytics & Growth', Icon: Megaphone },
  { id: 'Tag', label: 'Discounts & Deals', category: 'Analytics & Growth', Icon: Tag },
  { id: 'Scales', label: 'Rules & Compliance', category: 'Analytics & Growth', Icon: Scales },
  { id: 'Eye', label: 'Audit & Review Eye', category: 'Analytics & Growth', Icon: Eye },
  { id: 'UsersThree', label: 'Team & Staff', category: 'Analytics & Growth', Icon: UsersThree },
  { id: 'UserGear', label: 'User Settings', category: 'Analytics & Growth', Icon: UserGear },
  { id: 'FileText', label: 'Documents & Notes', category: 'Analytics & Growth', Icon: FileText },
];

const SYMBOL_MAP: Record<string, React.ComponentType<{ size?: number; weight?: any; className?: string }>> = {
  Crown,
  ShieldCheck,
  ShieldStar,
  LockKey,
  IdentificationCard,
  Sparkle,
  Headset,
  ChatCircleText,
  Lifebuoy,
  Bicycle,
  Truck,
  NavigationArrow,
  Package,
  Coins,
  CurrencyDollar,
  Bank,
  Receipt,
  Wallet,
  Storefront,
  ForkKnife,
  ChefHat,
  CookingPot,
  ChartLineUp,
  ChartBar,
  TrendUp,
  Megaphone,
  Tag,
  Scales,
  Eye,
  UsersThree,
  UserGear,
  FileText,
};

/**
 * Resolve an icon component safely from a symbol ID, falling back to ShieldCheck
 */
export function getRoleSymbolIcon(iconId?: string | null): React.ComponentType<{ size?: number; weight?: any; className?: string }> {
  if (!iconId) return ShieldCheck;
  return SYMBOL_MAP[iconId] || ShieldCheck;
}
