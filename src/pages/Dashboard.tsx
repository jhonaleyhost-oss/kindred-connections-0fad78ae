import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Server,
  Users,
  Cpu,
  HardDrive,
  LogOut,
  List,
  Crown,
  Star,
  Check,
  Zap,
  ShieldCheck,
  Code,
  Terminal,
  Globe,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import VideoBackground from '@/components/VideoBackground';
import GlassCard from '@/components/GlassCard';
import StatCard from '@/components/StatCard';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PterodactylServer {
  id: string;
  name: string;
  domain: string;
  server_type: string;
  is_active: boolean;
}

interface UserProfile {
  panel_creations_count: number;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { role, isAdmin, isPremium, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [servers, setServers] = useState<PterodactylServer[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [panelCount, setPanelCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Form state
  const [username, setUsername] = useState('');
  const [selectedServer, setSelectedServer] = useState('');
  const [ram, setRam] = useState('1');
  const [cpu, setCpu] = useState('40');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch servers
      const { data: serversData } = await supabase
        .from('pterodactyl_servers')
        .select('*')
        .eq('is_active', true);
      
      if (serversData) {
        setServers(serversData);
        if (serversData.length > 0) {
          setSelectedServer(serversData[0].id);
        }
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('panel_creations_count')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch user's panels count
      const { count } = await supabase
        .from('user_panels')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      setPanelCount(count || 0);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedServer || !username) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Lengkapi semua field yang diperlukan.',
      });
      return;
    }

    // Validate for free users
    if (role === 'free') {
      if (panelCount >= 1) {
        toast({
          variant: 'destructive',
          title: 'Batas Tercapai',
          description: 'Upgrade ke Premium untuk membuat lebih banyak panel.',
        });
        return;
      }
      if (ram !== '1' || cpu !== '40') {
        toast({
          variant: 'destructive',
          title: 'Akses Ditolak',
          description: 'User gratis hanya bisa menggunakan 1GB RAM dan 40% CPU.',
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      const selectedServerData = servers.find(s => s.id === selectedServer);
      if (!selectedServerData) throw new Error('Server tidak ditemukan');

      // Check if free user trying to use private server
      if (role === 'free' && selectedServerData.server_type === 'private') {
        toast({
          variant: 'destructive',
          title: 'Akses Ditolak',
          description: 'User gratis hanya bisa menggunakan server public.',
        });
        setSubmitting(false);
        return;
      }

      const panelEmail = `${username}@valtp.net`;
      const panelPassword = `${username}2323`;

      // Insert panel to database
      const { error } = await supabase.from('user_panels').insert({
        user_id: user.id,
        server_id: selectedServer,
        username: username,
        email: panelEmail,
        password: panelPassword,
        login_url: selectedServerData.domain,
        ram: ram === 'unli' ? 0 : parseInt(ram) * 1024,
        cpu: cpu === 'unli' ? 0 : parseInt(cpu),
        disk: ram === 'unli' ? 0 : parseInt(ram) * 1024,
      });

      if (error) throw error;

      // Update panel count in profile
      await supabase
        .from('profiles')
        .update({ panel_creations_count: (profile?.panel_creations_count || 0) + 1 })
        .eq('user_id', user.id);

      toast({
        title: 'Berhasil!',
        description: 'Panel berhasil dibuat. Cek di List Panel.',
      });

      setUsername('');
      fetchData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Membuat Panel',
        description: err.message || 'Terjadi kesalahan.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'reseller': return 'Reseller';
      case 'premium': return 'Premium';
      default: return 'Free';
    }
  };

  const getMaxPanels = () => {
    switch (role) {
      case 'admin': return '∞';
      case 'reseller': return '∞';
      case 'premium': return '10';
      default: return '1';
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <VideoBackground />
        <div className="glass-card rounded-2xl p-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4">
      <VideoBackground />

      <div className="w-full max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <GlassCard className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                to="/panels"
                className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-2"
              >
                <List className="w-4 h-4" />
                <span>List Panel</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="btn-secondary flex items-center gap-2 bg-amber/10 border-amber/20 text-amber hover:bg-amber/20"
                >
                  <Crown className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="p-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-lg transition-all"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={Server}
            label="Server Tersedia"
            value={servers.length}
            status="online"
            delay={0.1}
          />
          <StatCard
            icon={HardDrive}
            label="Panel Anda"
            value={panelCount}
            delay={0.15}
          />
          <StatCard
            icon={Users}
            label="Role"
            value={getRoleLabel()}
            delay={0.2}
          />
          <StatCard
            icon={Cpu}
            label="Kuota"
            value={`${panelCount}/${getMaxPanels()}`}
            delay={0.25}
          />
        </div>

        {/* Admin Link */}
        {isAdmin && (
          <Link
            to="/admin"
            className="mb-6 block w-full p-3 bg-gradient-to-r from-amber/20 to-amber/10 border border-amber/30 rounded-xl text-center text-amber font-semibold hover:scale-[1.01] transition-transform"
          >
            <Crown className="w-5 h-5 inline mr-2" />
            Akses Panel Admin
          </Link>
        )}

        {/* User Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 bg-gradient-to-r from-secondary to-secondary/50 border border-border rounded-xl p-5"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">
                Halo, {user?.email?.split('@')[0]}!
              </h3>
              <p className="text-sm text-muted-foreground">
                Status: <span className="font-medium text-primary">{getRoleLabel()}</span> • 
                Panel: {panelCount}/{getMaxPanels()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Upgrade Banner for Free Users */}
        {role === 'free' && (
          <Collapsible open={upgradeOpen} onOpenChange={setUpgradeOpen}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mb-6"
            >
              <CollapsibleTrigger asChild>
                <div className="relative overflow-hidden rounded-xl p-[1px] bg-gradient-to-r from-primary to-accent cursor-pointer hover:shadow-lg transition-all">
                  <div className="bg-background rounded-[11px] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber/10 rounded-lg text-amber">
                        <Star className="w-5 h-5 fill-current" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">Upgrade ke Premium</p>
                        <p className="text-xs text-muted-foreground">Buka akses Unlimited & Server Private</p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: upgradeOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </motion.div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4 p-5 bg-secondary/50 rounded-xl border border-border animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald" /> Unlimited RAM & CPU</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald" /> Create Panel Tanpa Batas</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald" /> Akses 2 Type Panel</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald" /> Akses Permanen</li>
                    </ul>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald" /> Anti-Intip & Aman 100%</li>
                      <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-emerald" /> Server Private Ram 32 Core 16</li>
                      <li className="flex items-center gap-2"><Code className="w-4 h-4 text-emerald" /> Support Python & Node.js</li>
                    </ul>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                    <div className="text-center sm:text-left">
                      <p className="text-xs text-muted-foreground">Harga Spesial</p>
                      <p className="text-xl font-bold text-amber">
                        Rp 35.000 <span className="text-xs font-normal text-muted-foreground">/lifetime</span>
                      </p>
                    </div>
                    <Button className="w-full sm:w-auto bg-amber hover:bg-amber/90 text-background font-bold">
                      Buy? Langsung ke @upgradeuser_bot
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </motion.div>
          </Collapsible>
        )}

        {/* Create Panel Form */}
        <GlassCard className="p-6 sm:p-8" delay={0.4}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Buat Server Baru</h2>
            <p className="text-muted-foreground text-sm">
              Konfigurasikan spesifikasi server bot Anda di bawah ini.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Nama Server / User
              </Label>
              <div className="relative">
                <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Contoh: my-bot-v1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="input-glass pl-10"
                />
              </div>
            </div>

            {/* Server Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Lokasi Server
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Select value={selectedServer} onValueChange={setSelectedServer}>
                  <SelectTrigger className="input-glass pl-10">
                    <SelectValue placeholder="Pilih server" />
                  </SelectTrigger>
                  <SelectContent>
                    {servers.map((server) => (
                      <SelectItem
                        key={server.id}
                        value={server.id}
                        disabled={role === 'free' && server.server_type === 'private'}
                      >
                        {server.name}
                        {server.server_type === 'private' && role === 'free' && ' (VIP Only)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Resources */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">RAM (GB)</Label>
                <Select
                  value={ram}
                  onValueChange={setRam}
                  disabled={role === 'free'}
                >
                  <SelectTrigger className="input-glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 GB</SelectItem>
                    <SelectItem value="2" disabled={role === 'free'}>2 GB</SelectItem>
                    <SelectItem value="3" disabled={role === 'free'}>3 GB</SelectItem>
                    <SelectItem value="4" disabled={role === 'free'}>4 GB</SelectItem>
                    <SelectItem value="unli" disabled={!isPremium}>Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">CPU (%)</Label>
                <Select
                  value={cpu}
                  onValueChange={setCpu}
                  disabled={role === 'free'}
                >
                  <SelectTrigger className="input-glass">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="40">40%</SelectItem>
                    <SelectItem value="100" disabled={role === 'free'}>100%</SelectItem>
                    <SelectItem value="200" disabled={role === 'free'}>200%</SelectItem>
                    <SelectItem value="unli" disabled={!isPremium}>Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Deploy Server Sekarang</span>
                </>
              )}
            </Button>
          </form>
        </GlassCard>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-xs mt-8">
          &copy; 2024 Jhonaley Panel. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
