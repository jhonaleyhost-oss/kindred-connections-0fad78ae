import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Calendar,
  Copy,
  Trash2,
  Send,
  ChevronDown,
  Plus,
  Ghost,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import VideoBackground from '@/components/VideoBackground';
import GlassCard from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserPanel {
  id: string;
  username: string;
  email: string;
  password: string;
  login_url: string;
  ram: number;
  cpu: number;
  is_active: boolean;
  created_at: string;
  pterodactyl_servers: {
    name: string;
  };
}

const Panels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [panels, setPanels] = useState<UserPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [waNumbers, setWaNumbers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchPanels();
  }, [user]);

  const fetchPanels = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_panels')
        .select(`
          *,
          pterodactyl_servers (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPanels(data || []);
    } catch (err) {
      console.error('Error fetching panels:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Tersalin!',
      description: `${label} berhasil disalin ke clipboard.`,
    });
  };

  const handleSendWA = (panel: UserPanel) => {
    const waNumber = waNumbers[panel.id];
    if (!waNumber) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Isi nomor WhatsApp terlebih dahulu.',
      });
      return;
    }

    const message = `*ACCESS DETAILS*
━━━━━━━━━━━━━━━━
Username: ${panel.username}
Password: ${panel.password}
Login URL: ${panel.login_url}
━━━━━━━━━━━━━━━━
*DILARANG PERJUALBELIKAN!*`;

    window.open(
      `https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  const handleDelete = async (panelId: string) => {
    try {
      const { error } = await supabase
        .from('user_panels')
        .delete()
        .eq('id', panelId);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Panel berhasil dihapus.',
      });

      fetchPanels();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: err.message || 'Gagal menghapus panel.',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <VideoBackground />
        <div className="glass-card rounded-2xl p-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Memuat panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <VideoBackground />

      <div className="w-full max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">List Panel Anda</h1>
            <p className="text-sm text-muted-foreground">
              Kelola semua server bot yang aktif
            </p>
          </div>
          <Link
            to="/"
            className="btn-secondary flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Buat Baru</span>
          </Link>
        </motion.div>

        {/* Panels List */}
        <div className="space-y-4">
          {panels.length === 0 ? (
            <GlassCard className="text-center py-12 border-dashed border-2 border-border">
              <Ghost className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground">Belum ada panel</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Anda belum membuat server apapun.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 btn-primary"
              >
                Buat Panel Sekarang
              </Link>
            </GlassCard>
          ) : (
            panels.map((panel, index) => (
              <motion.div
                key={panel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="overflow-hidden" animate={false}>
                  {/* Header */}
                  <div
                    className="panel-card-header p-4 cursor-pointer flex items-center justify-between group"
                    onClick={() =>
                      setExpandedPanel(expandedPanel === panel.id ? null : panel.id)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center text-primary">
                        <Terminal className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm sm:text-base">
                          {panel.username}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(panel.created_at)}
                          </span>
                          <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                          <span className="text-emerald flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald rounded-full animate-pulse-slow" />
                            Active
                          </span>
                        </div>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedPanel === panel.id ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </motion.div>
                  </div>

                  {/* Content */}
                  <AnimatePresence>
                    {expandedPanel === panel.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-border/30"
                      >
                        <div className="p-4 space-y-3">
                          {/* Info Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Login URL */}
                            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                              <p className="text-xs text-muted-foreground mb-1">Login URL</p>
                              <div className="flex items-center justify-between">
                                <a
                                  href={panel.login_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:text-primary/80 truncate max-w-[150px] flex items-center gap-1"
                                >
                                  {panel.login_url}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  onClick={() => copyToClipboard(panel.login_url, 'URL')}
                                  className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Username */}
                            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                              <p className="text-xs text-muted-foreground mb-1">Username</p>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-foreground font-mono">{panel.username}</span>
                                <button
                                  onClick={() => copyToClipboard(panel.username, 'Username')}
                                  className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Password */}
                            <div className="p-3 bg-background/50 rounded-lg border border-border/50 col-span-1 sm:col-span-2">
                              <p className="text-xs text-muted-foreground mb-1">Password</p>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-foreground font-mono blur-sm hover:blur-none transition-all cursor-help">
                                  {panel.password}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(panel.password, 'Password')}
                                  className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="pt-3 mt-2 border-t border-border/50 flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                              <Input
                                type="tel"
                                placeholder="No. WhatsApp (628xx)"
                                value={waNumbers[panel.id] || ''}
                                onChange={(e) =>
                                  setWaNumbers((prev) => ({
                                    ...prev,
                                    [panel.id]: e.target.value,
                                  }))
                                }
                                className="input-glass pr-10"
                              />
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => handleSendWA(panel)}
                              className="flex-1 bg-emerald/10 hover:bg-emerald/20 text-emerald border-emerald/30"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Kirim
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="glass-card">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Panel?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Yakin ingin menghapus panel "{panel.username}" secara permanen?
                                    Aksi ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(panel.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            ))
          )}
        </div>

        {/* Back to Dashboard */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <Link to="/" className="text-primary hover:text-primary/80 text-sm font-medium">
            ← Kembali ke Dashboard
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Panels;
