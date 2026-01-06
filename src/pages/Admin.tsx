import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Server,
  HardDrive,
  Settings,
  ArrowLeft,
  Shield,
  Crown,
  UserCog,
  Trash2,
  Edit,
  Plus,
  Save,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  panel_creations_count: number;
  created_at: string;
  role: AppRole;
}

interface PterodactylServer {
  id: string;
  name: string;
  domain: string;
  plta_key: string;
  pltc_key: string;
  server_type: string;
  is_active: boolean;
  location_id: number;
  egg_id: number;
  created_at: string;
}

interface UserPanel {
  id: string;
  username: string;
  email: string;
  login_url: string;
  ram: number;
  cpu: number;
  is_active: boolean;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
}

const Admin = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [servers, setServers] = useState<PterodactylServer[]>([]);
  const [panels, setPanels] = useState<UserPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  // Stats
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalServers, setTotalServers] = useState(0);
  const [totalPanels, setTotalPanels] = useState(0);

  // Edit dialogs
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editingServer, setEditingServer] = useState<PterodactylServer | null>(null);
  const [newServer, setNewServer] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Server form state
  const [serverForm, setServerForm] = useState({
    name: '',
    domain: '',
    plta_key: '',
    pltc_key: '',
    server_type: 'public',
    location_id: 1,
    egg_id: 15,
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user]);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Akses Ditolak',
        description: 'Anda tidak memiliki akses admin.',
      });
      navigate('/');
      return;
    }

    if (!roleLoading && isAdmin) {
      fetchAllData();
    }
  }, [isAdmin, roleLoading]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchServers(), fetchPanels()]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          ...profile,
          role: (userRole?.role as AppRole) || 'free',
        };
      });

      setUsers(usersWithRoles);
      setTotalUsers(usersWithRoles.length);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchServers = async () => {
    try {
      const { data, error } = await supabase
        .from('pterodactyl_servers')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setServers(data || []);
      setTotalServers(data?.length || 0);
    } catch (err) {
      console.error('Error fetching servers:', err);
    }
  };

  const fetchPanels = async () => {
    try {
      // Fetch panels
      const { data: panelsData, error: panelsError } = await supabase
        .from('user_panels')
        .select('*')
        .order('created_at', { ascending: false });

      if (panelsError) throw panelsError;

      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, email, full_name');

      // Merge panels with profiles
      const panelsWithProfiles = (panelsData || []).map(panel => {
        const profile = profilesData?.find(p => p.user_id === panel.user_id);
        return {
          ...panel,
          profiles: profile ? { email: profile.email, full_name: profile.full_name } : null,
        };
      });

      setPanels(panelsWithProfiles);
      setTotalPanels(panelsWithProfiles.length);
    } catch (err) {
      console.error('Error fetching panels:', err);
    }
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Role pengguna berhasil diperbarui.',
      });

      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: err.message,
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Delete from profiles (will cascade to user_roles due to FK)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Pengguna berhasil dihapus.',
      });

      fetchUsers();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: err.message,
      });
    }
  };

  const saveServer = async () => {
    try {
      if (editingServer) {
        const { error } = await supabase
          .from('pterodactyl_servers')
          .update(serverForm)
          .eq('id', editingServer.id);

        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Server berhasil diperbarui.' });
      } else {
        const { error } = await supabase
          .from('pterodactyl_servers')
          .insert(serverForm);

        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Server baru berhasil ditambahkan.' });
      }

      setEditingServer(null);
      setNewServer(false);
      resetServerForm();
      fetchServers();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: err.message,
      });
    }
  };

  const deleteServer = async (serverId: string) => {
    try {
      const { error } = await supabase
        .from('pterodactyl_servers')
        .delete()
        .eq('id', serverId);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: 'Server berhasil dihapus.',
      });

      fetchServers();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: err.message,
      });
    }
  };

  const deletePanel = async (panelId: string) => {
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
        description: err.message,
      });
    }
  };

  const resetServerForm = () => {
    setServerForm({
      name: '',
      domain: '',
      plta_key: '',
      pltc_key: '',
      server_type: 'public',
      location_id: 1,
      egg_id: 15,
    });
  };

  const openEditServer = (server: PterodactylServer) => {
    setEditingServer(server);
    setServerForm({
      name: server.name,
      domain: server.domain,
      plta_key: server.plta_key,
      pltc_key: server.pltc_key,
      server_type: server.server_type,
      location_id: server.location_id,
      egg_id: server.egg_id,
    });
  };

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'bg-amber/20 text-amber border-amber/30';
      case 'reseller':
        return 'bg-purple/20 text-purple border-purple/30';
      case 'premium':
        return 'bg-primary/20 text-primary border-primary/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <VideoBackground />
        <div className="glass-card rounded-2xl p-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Memuat data admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4">
      <VideoBackground />

      <div className="w-full max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <GlassCard className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/" className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber to-amber/50 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-background" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Admin Panel</h1>
                  <p className="text-xs text-muted-foreground">Kelola pengguna & server</p>
                </div>
              </div>
            </div>
            <Logo showText={false} />
          </div>
        </GlassCard>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Users} label="Total User" value={totalUsers} delay={0.1} />
          <StatCard icon={Server} label="Total Server" value={totalServers} delay={0.15} />
          <StatCard icon={HardDrive} label="Total Panel" value={totalPanels} delay={0.2} />
          <StatCard icon={Shield} label="Status" value="Aktif" status="online" delay={0.25} />
        </div>

        {/* Tabs */}
        <GlassCard className="p-6" delay={0.3}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-secondary/50 mb-6">
              <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="w-4 h-4 mr-2" />
                Pengguna
              </TabsTrigger>
              <TabsTrigger value="servers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Server className="w-4 h-4 mr-2" />
                Server
              </TabsTrigger>
              <TabsTrigger value="panels" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <HardDrive className="w-4 h-4 mr-2" />
                Panel
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Email</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Panel</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className="border-border/30">
                        <TableCell className="font-mono text-sm">{u.email}</TableCell>
                        <TableCell>{u.full_name || '-'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(u.role)}`}>
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell>{u.panel_creations_count}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingUser(u)}
                                >
                                  <UserCog className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="glass-card">
                                <DialogHeader>
                                  <DialogTitle>Edit Role Pengguna</DialogTitle>
                                  <DialogDescription>
                                    Ubah role untuk {u.email}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <Label>Role</Label>
                                  <Select
                                    defaultValue={u.role}
                                    onValueChange={(val) => updateUserRole(u.user_id, val as AppRole)}
                                  >
                                    <SelectTrigger className="input-glass mt-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="free">Free</SelectItem>
                                      <SelectItem value="premium">Premium</SelectItem>
                                      <SelectItem value="reseller">Reseller</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="glass-card">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Pengguna?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Yakin hapus {u.email}? Semua panel akan ikut terhapus.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUser(u.user_id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Servers Tab */}
            <TabsContent value="servers">
              <div className="flex justify-end mb-4">
                <Dialog open={newServer || !!editingServer} onOpenChange={(open) => {
                  if (!open) {
                    setNewServer(false);
                    setEditingServer(null);
                    resetServerForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        resetServerForm();
                        setNewServer(true);
                      }}
                      className="btn-primary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Server
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card max-w-lg">
                    <DialogHeader>
                      <DialogTitle>
                        {editingServer ? 'Edit Server' : 'Tambah Server Baru'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nama Server</Label>
                        <Input
                          value={serverForm.name}
                          onChange={(e) => setServerForm({ ...serverForm, name: e.target.value })}
                          className="input-glass"
                          placeholder="Server 1 (Public)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Domain</Label>
                        <Input
                          value={serverForm.domain}
                          onChange={(e) => setServerForm({ ...serverForm, domain: e.target.value })}
                          className="input-glass"
                          placeholder="https://panel.example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>PLTA Key</Label>
                        <Input
                          value={serverForm.plta_key}
                          onChange={(e) => setServerForm({ ...serverForm, plta_key: e.target.value })}
                          className="input-glass"
                          placeholder="ptla_xxx"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>PLTC Key</Label>
                        <Input
                          value={serverForm.pltc_key}
                          onChange={(e) => setServerForm({ ...serverForm, pltc_key: e.target.value })}
                          className="input-glass"
                          placeholder="ptlc_xxx"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Tipe</Label>
                          <Select
                            value={serverForm.server_type}
                            onValueChange={(val) => setServerForm({ ...serverForm, server_type: val })}
                          >
                            <SelectTrigger className="input-glass">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public">Public</SelectItem>
                              <SelectItem value="private">Private</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Location ID</Label>
                          <Input
                            type="number"
                            value={serverForm.location_id}
                            onChange={(e) => setServerForm({ ...serverForm, location_id: parseInt(e.target.value) })}
                            className="input-glass"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Egg ID</Label>
                          <Input
                            type="number"
                            value={serverForm.egg_id}
                            onChange={(e) => setServerForm({ ...serverForm, egg_id: parseInt(e.target.value) })}
                            className="input-glass"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setNewServer(false);
                        setEditingServer(null);
                        resetServerForm();
                      }}>
                        Batal
                      </Button>
                      <Button onClick={saveServer} className="btn-primary">
                        <Save className="w-4 h-4 mr-2" />
                        Simpan
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Nama</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>PLTA Key</TableHead>
                      <TableHead>PLTC Key</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servers.map((server) => (
                      <TableRow key={server.id} className="border-border/30">
                        <TableCell className="font-medium">{server.name}</TableCell>
                        <TableCell className="font-mono text-sm text-primary">{server.domain}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            server.server_type === 'private' 
                              ? 'bg-purple/20 text-purple' 
                              : 'bg-emerald/20 text-emerald'
                          }`}>
                            {server.server_type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs ${showKeys[`plta-${server.id}`] ? '' : 'blur-sm'}`}>
                              {server.plta_key.slice(0, 15)}...
                            </span>
                            <button
                              onClick={() => setShowKeys(prev => ({
                                ...prev,
                                [`plta-${server.id}`]: !prev[`plta-${server.id}`]
                              }))}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {showKeys[`plta-${server.id}`] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs ${showKeys[`pltc-${server.id}`] ? '' : 'blur-sm'}`}>
                              {server.pltc_key.slice(0, 15)}...
                            </span>
                            <button
                              onClick={() => setShowKeys(prev => ({
                                ...prev,
                                [`pltc-${server.id}`]: !prev[`pltc-${server.id}`]
                              }))}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {showKeys[`pltc-${server.id}`] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditServer(server)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="glass-card">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Server?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Yakin hapus "{server.name}"? Ini bisa mempengaruhi panel yang menggunakannya.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteServer(server.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Panels Tab */}
            <TabsContent value="panels">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Username</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Login URL</TableHead>
                      <TableHead>RAM</TableHead>
                      <TableHead>CPU</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {panels.map((panel) => (
                      <TableRow key={panel.id} className="border-border/30">
                        <TableCell className="font-mono">{panel.username}</TableCell>
                        <TableCell>{panel.profiles?.email || '-'}</TableCell>
                        <TableCell className="text-primary text-sm">{panel.login_url}</TableCell>
                        <TableCell>{panel.ram === 0 ? '∞' : `${panel.ram}MB`}</TableCell>
                        <TableCell>{panel.cpu === 0 ? '∞' : `${panel.cpu}%`}</TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="glass-card">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Panel?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Yakin hapus panel "{panel.username}"?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deletePanel(panel.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </GlassCard>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-xs mt-8">
          Admin Panel &copy; 2024 Jhonaley Panel
        </p>
      </div>
    </div>
  );
};

export default Admin;
