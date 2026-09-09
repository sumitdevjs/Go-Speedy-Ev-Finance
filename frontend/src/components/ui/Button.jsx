import React, { useRef } from 'react';
import Spinner from './Spinner';
import { gsap } from '../../lib/gsap';

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) {
  const btnRef = useRef(null);
  const isInert = disabled || loading;

  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer select-none';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  }[size] || 'px-4 py-2 text-sm gap-2';

  const variantClasses = {
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow focus:ring-blue-500 border border-transparent',
    secondary:
      'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-slate-400 border border-slate-200 dark:border-slate-700',
    outline:
      'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 shadow-sm focus:ring-blue-500',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow focus:ring-emerald-500 border border-transparent',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-sm hover:shadow focus:ring-rose-500 border border-transparent',
    ghost:
      'bg-transparent hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent focus:ring-slate-400',
  }[variant] || 'bg-blue-600 hover:bg-blue-700 text-white';

  // Tactile press-in / spring-back feedback — every button in the app gets a small,
  // consistent "give" so clicking feels physical instead of a flat CSS state swap.
  const pressDown = () => {
    if (isInert || !btnRef.current) return;
    gsap.to(btnRef.current, { scale: 0.96, y: 1, duration: 0.12, ease: 'power2.out' });
  };
  const pressUp = () => {
    if (isInert || !btnRef.current) return;
    gsap.to(btnRef.current, { scale: 1, y: 0, duration: 0.4, ease: 'elastic.out(1, 0.45)' });
  };

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseDown={pressDown}
      onMouseUp={pressUp}
      onMouseLeave={pressUp}
      onTouchStart={pressDown}
      onTouchEnd={pressUp}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" className="text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
