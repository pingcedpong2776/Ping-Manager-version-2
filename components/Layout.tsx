
import React from 'react';
import ClubLogo from './ClubLogo';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasIncomingOffer?: boolean;
  clubName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  seasonLabel?: string;
  onReturnToMenu?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
    children, 
    activeTab, 
    setActiveTab, 
    hasIncomingOffer, 
    clubName, 
    primaryColor = '#1e3a8a', 
    secondaryColor = '#3b82f6', 
    seasonLabel = "Saison 1",
    onReturnToMenu
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: 'fa-chart-line', mobile: true },
    { id: 'players', label: 'Effectif', icon: 'fa-users', mobile: true },
    { id: 'statistics', label: 'Stats', icon: 'fa-chart-simple', mobile: true },
    { id: 'mercato', label: 'Mercato', icon: 'fa-handshake', badge: hasIncomingOffer, mobile: true },
    { id: 'training', label: 'Coach', icon: 'fa-dumbbell', mobile: true },
    { id: 'meetings', label: 'Matchs', icon: 'fa-table-tennis-paddle-ball', mobile: true },
    { id: 'competitions', label: 'Ligue', icon: 'fa-trophy', mobile: false },
    { id: 'settings', label: 'Options', icon: 'fa-cog', mobile: false },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar Desktop */}
      <aside 
        className="w-72 text-white flex flex-col shadow-2xl hidden lg:flex border-r border-white/10"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
      >
        <div className="p-8">
          <div className="flex items-center gap-4 mb-2">
            <ClubLogo primaryColor={primaryColor} secondaryColor={secondaryColor} size="sm" className="bg-white/20 rounded-xl" />
            <h1 className="text-2xl font-black tracking-tighter uppercase line-clamp-1">
              {clubName || 'PingPro'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <p className="text-white/60 text-[9px] uppercase tracking-widest font-black">Simulation FFTT active</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-6 py-4 rounded-[1.25rem] transition-all duration-300 group ${
                activeTab === item.id 
                ? 'bg-white text-slate-900 shadow-xl font-black translate-x-2' 
                : 'hover:bg-white/10 text-white/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <i className={`fa-solid ${item.icon} text-lg w-6 ${activeTab === item.id ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`} style={{ color: activeTab === item.id ? primaryColor : 'inherit' }}></i>
                <span className="text-sm uppercase tracking-tight">{item.label}</span>
              </div>
              {item.badge && (
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-bounce"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 space-y-3">
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-[2rem] border border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-xl shadow-inner">
                {clubName?.charAt(0) || 'M'}
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight leading-none">Manager</p>
                <p className="text-[10px] text-white/60 font-bold uppercase mt-1">{seasonLabel}</p>
              </div>
            </div>
          </div>
          
          {onReturnToMenu && (
              <button 
                onClick={onReturnToMenu}
                className="w-full py-3 bg-black/20 hover:bg-red-500/80 text-white/70 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                  <i className="fa-solid fa-power-off"></i> Menu Principal
              </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header Button (Return to Menu) */}
        {onReturnToMenu && (
            <button 
                onClick={onReturnToMenu}
                className="lg:hidden fixed top-4 right-4 z-[100] w-10 h-10 bg-slate-900/90 text-white rounded-full flex items-center justify-center shadow-xl border border-white/20 backdrop-blur-md active:scale-95 transition-transform"
                title="Menu Principal"
            >
                <i className="fa-solid fa-power-off text-xs"></i>
            </button>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-28 lg:pb-10 bg-[#f8fafc] custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Tab Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-[2.5rem]">
          {navItems.filter(i => i.mobile).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1.5 transition-all ${
                activeTab === item.id ? 'scale-110' : 'text-slate-300'
              }`}
              style={{ color: activeTab === item.id ? primaryColor : '' }}
            >
              <div className={`relative p-2 rounded-xl transition-colors ${activeTab === item.id ? 'bg-slate-50' : ''}`}>
                <i className={`fa-solid ${item.icon} text-xl`}></i>
                {item.badge && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Layout;
