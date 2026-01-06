import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  status?: 'online' | 'offline' | 'loading';
  iconColor?: string;
  delay?: number;
}

const StatCard = ({ icon: Icon, label, value, status, iconColor = 'text-primary', delay = 0 }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="stat-card"
    >
      <div className="flex flex-col items-center justify-center h-full min-h-[96px]">
        <div className={cn('p-2 rounded-lg mb-2', 'bg-primary/10')}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {status && (
          <div className="flex items-center gap-1 mt-1">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                status === 'online' && 'bg-emerald animate-pulse-slow',
                status === 'offline' && 'bg-destructive',
                status === 'loading' && 'bg-amber animate-pulse'
              )}
            />
            <span className="text-xs text-muted-foreground capitalize">{status}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;
