import { initials, resolveAssetUrl } from '../lib/api';

type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: 'md' | 'lg';
  className?: string;
};

export function UserAvatar({ name, avatarUrl, size = 'md', className }: Props) {
  const src = resolveAssetUrl(avatarUrl);
  const cls = `${size === 'lg' ? 'avatar avatar-lg' : 'avatar'}${className ? ` ${className}` : ''}`;
  if (src) {
    return <img className={cls} src={src} alt={name} />;
  }
  return <div className={cls}>{initials(name)}</div>;
}
