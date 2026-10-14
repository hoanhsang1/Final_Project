import type { ReactNode } from 'react';

export type AuthTab = 'login' | 'register';

export interface AuthCardProps {
  activeTab: AuthTab;
  title: string;
  subtitle: string;
  children: ReactNode;
}
