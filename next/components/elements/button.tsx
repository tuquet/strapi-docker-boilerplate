import { LinkProps } from 'next/link';
import React from 'react';

import { themeConfig } from '@/lib/theme.config';
import { cn } from '@/lib/utils';

interface ButtonProps {
  variant?: 'simple' | 'outline' | 'primary' | 'muted' | 'neon-glow';
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
  href?: LinkProps['href'];
  onClick?: () => void;
  [key: string]: any;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  as: Tag = 'button',
  className,
  children,
  ...props
}) => {
  // Tự động ghi đè variant 'primary' bằng cấu hình trung tâm (ví dụ: 'neon-glow') nếu có cấu hình
  const activeVariant =
    variant === 'primary' ? themeConfig.primaryButton.variant : variant;

  const variantClass =
    activeVariant === 'simple'
      ? 'bg-secondary relative z-10 bg-transparent hover:border-secondary/50 hover:bg-secondary/10 border border-transparent text-white text-sm md:text-sm transition font-medium duration-200 rounded-md px-4 py-2 flex items-center justify-center'
      : activeVariant === 'outline'
        ? 'bg-white relative z-10 hover:bg-secondary/90 hover:shadow-xl text-black border border-black hover:text-black text-sm md:text-sm transition font-medium duration-200 rounded-md px-4 py-2 flex items-center justify-center'
        : activeVariant === 'neon-glow'
          ? cn(
              'bg-neutral-950 relative z-10 text-white border text-sm md:text-sm transition-all duration-300 font-medium rounded-md px-4 py-2 flex items-center justify-center hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shadow-[0_0_15px_var(--glow-color)] hover:shadow-[0_0_25px_var(--hover-glow-color)]',
              themeConfig.primaryButton.borderColorClass || 'border-violet-500/50 hover:border-violet-400'
            )
          : activeVariant === 'primary'
            ? 'bg-secondary relative z-10 hover:bg-secondary/90 border border-secondary text-black text-sm md:text-sm transition font-medium duration-200 rounded-md px-4 py-2 flex items-center justify-center shadow-[0px_-1px_0px_0px_#FFFFFF60_inset,_0px_1px_0px_0px_#FFFFFF60_inset] hover:-translate-y-1 active:-translate-y-0'
            : activeVariant === 'muted'
              ? 'bg-neutral-800 relative z-10 hover:bg-neutral-900 border border-transparent text-white text-sm md:text-sm transition font-medium duration-200 rounded-md px-4 py-2 flex items-center justify-center shadow-[0px_1px_0px_0px_#FFFFFF20_inset]'
              : '';

  const Element = Tag as any;

  const inlineStyles = activeVariant === 'neon-glow' ? {
    '--glow-color': themeConfig.primaryButton.glowColor || 'rgba(139, 92, 246, 0.3)',
    '--hover-glow-color': themeConfig.primaryButton.hoverGlowColor || 'rgba(139, 92, 246, 0.65)',
    ...props.style,
  } as React.CSSProperties : props.style;

  return (
    <Element
      className={cn(
        'bg-secondary relative z-10 bg-transparent hover:border-secondary hover:bg-secondary/50 border border-transparent text-white text-sm md:text-sm transition font-medium duration-200 rounded-md px-4 py-2 flex items-center justify-center',
        variantClass,
        themeConfig.primaryButton.customClass,
        className
      )}
      style={inlineStyles}
      {...props}
      suppressHydrationWarning
    >
      {children ?? `Get Started`}
    </Element>
  );
};
