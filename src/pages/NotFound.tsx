import { Link } from "react-router-dom";
import { Home, Ghost } from "lucide-react";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <VideoBackground />
      
      <GlassCard className="text-center p-12 max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Ghost className="w-10 h-10 text-primary" />
        </div>
        
        <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
        <p className="text-xl text-foreground mb-2">Halaman Tidak Ditemukan</p>
        <p className="text-muted-foreground mb-8">
          Halaman yang Anda cari tidak ada.
        </p>
        
        <Link to="/">
          <Button className="btn-primary">
            <Home className="w-4 h-4 mr-2" />
            Kembali ke Beranda
          </Button>
        </Link>
      </GlassCard>
    </div>
  );
};

export default NotFound;
