import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  animate?: boolean;
  delay?: number;
}

const GlassCard = ({ children, className, hover = false, animate = true, delay = 0 }: GlassCardProps) => {
  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className={cn(
          hover ? 'glass-card-hover' : 'glass-card',
          'rounded-2xl',
          className
        )}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        hover ? 'glass-card-hover' : 'glass-card',
        'rounded-2xl',
        className
      )}
    >
      {children}
    </div>
  );
};

export default GlassCard;
