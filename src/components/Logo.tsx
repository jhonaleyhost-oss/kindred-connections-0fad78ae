import { Boxes } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo = ({ size = 'md', showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg`}
        style={{ boxShadow: '0 10px 30px -10px hsl(var(--primary) / 0.4)' }}
      >
        <Boxes className={`${iconSizes[size]} text-white`} />
      </div>
      {showText && (
        <div>
          <h1 className="font-bold text-lg leading-none tracking-tight text-foreground">
            Panel Creator
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">v2.0 Stable</p>
        </div>
      )}
    </div>
  );
};

export default Logo;
