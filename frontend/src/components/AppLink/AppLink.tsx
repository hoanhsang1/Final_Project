import { Link } from '@astryxdesign/core';
import type { ComponentProps } from 'react';
import { Link as RouterLink } from 'react-router-dom';

type AstryxLinkProps = ComponentProps<typeof Link>;

export interface AppLinkProps extends Omit<AstryxLinkProps, 'as' | 'href'> {
  /** Đường dẫn nội bộ của react-router (đổ vào `to`). */
  to: string;
}

/**
 * Cầu nối giữa `Link` của Astryx và `Link` của react-router.
 *
 * Astryx đổi sang component link của router qua prop `as` và tự truyền `to`
 * bằng `href` (xem `useLinkComponent`). Gói lại một chỗ để mọi màn không phải
 * nhớ cặp `as={RouterLink} href={...}` — và để `href` vẫn đúng khi JS chậm
 * (Astryx render `<a href>` trước, router bắt sự kiện sau).
 */
export function AppLink({ to, ...rest }: AppLinkProps) {
  return <Link as={RouterLink} href={to} {...rest} />;
}
