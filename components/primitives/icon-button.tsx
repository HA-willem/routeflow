import { Button } from '@/components/primitives/button';

import type { ComponentProps } from 'react';

/**
 * IconButton — 26_ComponentLibrary.md § 2. `aria-label` is verplicht (geen optionele
 * prop) zodat een icoon-only knop nooit zonder toegankelijke naam gemerged kan worden.
 */
type IconButtonProps = Omit<ComponentProps<typeof Button>, 'size' | 'aria-label'> & {
  'aria-label': string;
  size?: 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg';
};

export function IconButton({ size = 'icon', ...props }: IconButtonProps) {
  return <Button size={size} {...props} />;
}
