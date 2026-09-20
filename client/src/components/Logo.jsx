import { useTheme } from '../context/ThemeContext';

export default function Logo({ size = 'md', showText = false, variant, className = '' }) {
  const { theme } = useTheme();

  const sizes = {
    sm: 'h-7',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-12',
  };

  const height = sizes[size] || sizes.md;

  // variant="dark" → white text for dark/blue backgrounds
  // variant="light" → dark text for light backgrounds
  // If no variant, auto-detect from theme
  const useDarkBg = variant === 'dark' || (!variant && theme === 'dark');
  const logoSrc = useDarkBg ? '/logo-dark-bg.png' : '/logo-transparent.png';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={logoSrc}
        alt="Contextify"
        className={`${height} w-auto object-contain`}
        draggable={false}
      />
      {showText && (
        <span className="font-bold tracking-tight text-[var(--app-text)]" style={{ fontSize: size === 'xl' ? '1.5rem' : size === 'lg' ? '1.25rem' : '1rem' }}>
          Contextify
        </span>
      )}
    </div>
  );
}
