import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, LogIn, UserPlus, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import VideoBackground from '@/components/VideoBackground';
import GlassCard from '@/components/GlassCard';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'Login Gagal',
            description: error.message,
          });
        } else {
          toast({
            title: 'Berhasil Login',
            description: 'Selamat datang kembali!',
          });
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'Registrasi Gagal',
            description: error.message,
          });
        } else {
          toast({
            title: 'Berhasil Daftar',
            description: 'Akun Anda telah dibuat. Silakan login.',
          });
          setIsLogin(true);
        }
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Terjadi kesalahan. Silakan coba lagi.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <VideoBackground />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <Logo size="lg" />
        </motion.div>

        {/* Auth Card */}
        <GlassCard className="p-8" delay={0.1}>
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isLogin
                ? 'Masuk untuk mengelola panel bot Anda'
                : 'Daftar untuk mulai membuat panel bot WhatsApp'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="fullName" className="text-sm font-medium text-muted-foreground">
                  Nama Lengkap
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-glass pl-10"
                  />
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-glass pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input-glass pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-spin">⏳</span>
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Daftar</span>
                </>
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {isLogin ? 'Daftar Sekarang' : 'Masuk'}
              </button>
            </p>
          </div>
        </GlassCard>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-3 gap-4"
        >
          {[
            { icon: Zap, label: 'Deploy Cepat' },
            { icon: Lock, label: 'Aman 100%' },
            { icon: User, label: 'Multi User' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="glass-card rounded-xl p-4 text-center"
            >
              <item.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-xs mt-8">
          &copy; 2024 Jhonaley Panel. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default Auth;
