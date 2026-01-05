
import React, { useRef, useState, useEffect } from 'react';
import { Club } from '../types';

interface HomeMenuProps {
  onNewGame: () => void;
  onContinue: () => void;
  onImport: (jsonData: any) => void;
  hasSave: boolean;
  savedClubName?: string;
}

const HomeMenu: React.FC<HomeMenuProps> = ({ onNewGame, onContinue, onImport, hasSave, savedClubName }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json: any = JSON.parse(event.target?.result as string);
        // Validation basique
        if (!json.club || !json.club.players) {
          throw new Error("Format de sauvegarde invalide");
        }
        onImport(json);
      } catch (err) {
        alert("Erreur lors de la lecture du fichier de sauvegarde. Assurez-vous qu'il s'agit d'un fichier .json valide généré par PingManager.");
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
           <i className="fa-solid fa-table-tennis-paddle-ball text-[30vw] absolute -top-20 -left-20 text-white animate-pulse"></i>
        </div>
        <div className="absolute bottom-0 right-0 w-full h-full opacity-5 flex justify-end items-end">
           <i className="fa-solid fa-trophy text-[40vw] absolute -bottom-40 -right-20 text-white"></i>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row relative z-10 animate-in zoom-in-95 duration-500 border-4 border-white/10">
        
        {/* Left Panel : Hero */}
        <div className="md:w-5/12 ping-gradient p-12 text-white flex flex-col justify-between relative overflow-hidden">
           <div className="relative z-10">
             <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/20">
               <i className="fa-solid fa-table-tennis-paddle-ball text-3xl"></i>
             </div>
             <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">Ping<br/>Manager<br/><span className="text-blue-200">Pro</span></h1>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">FFTT Edition</p>
           </div>
           
           <div className="relative z-10 mt-12">
             <p className="text-xs font-medium opacity-80 leading-relaxed">
               Gérez votre club, recrutez des talents, établissez des stratégies et montez jusqu'en Pro A. La simulation de tennis de table ultime.
             </p>
           </div>
        </div>

        {/* Right Panel : Actions */}
        <div className="md:w-7/12 p-12 bg-white flex flex-col justify-center space-y-6">
          
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">Menu Principal</h2>

          <div className="space-y-4">
            {hasSave && (
              <button 
                onClick={onContinue}
                className="w-full py-5 px-6 bg-slate-900 text-white rounded-2xl flex items-center justify-between group hover:scale-[1.02] transition-all shadow-xl shadow-slate-200"
              >
                <div className="text-left">
                  <span className="block text-sm font-black uppercase tracking-widest">Continuer</span>
                  <span className="block text-[10px] font-bold text-slate-400 mt-1 uppercase">
                    {savedClubName || 'Sauvegarde Auto'}
                  </span>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-slate-900 transition-colors">
                  <i className="fa-solid fa-play"></i>
                </div>
              </button>
            )}

            <button 
              onClick={onNewGame}
              className={`w-full py-5 px-6 rounded-2xl flex items-center justify-between group hover:scale-[1.02] transition-all border-2 ${hasSave ? 'bg-white border-slate-100 text-slate-900 hover:border-slate-900' : 'bg-slate-900 text-white shadow-xl'}`}
            >
              <div className="text-left">
                <span className="block text-sm font-black uppercase tracking-widest">Nouvelle Carrière</span>
                <span className="block text-[10px] font-bold opacity-50 mt-1 uppercase">Commencer à zéro</span>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${hasSave ? 'bg-slate-50 group-hover:bg-slate-900 group-hover:text-white' : 'bg-white/10 group-hover:bg-white group-hover:text-slate-900'}`}>
                <i className="fa-solid fa-plus"></i>
              </div>
            </button>

            <div className="pt-6 border-t border-slate-100 grid grid-cols-1 gap-4">
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isImporting}
                 className="w-full py-4 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-slate-100 flex items-center justify-center gap-2"
               >
                 {isImporting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-file-import"></i>}
                 Charger une sauvegarde (JSON)
               </button>
               <input 
                 type="file" 
                 accept=".json" 
                 ref={fileInputRef} 
                 className="hidden" 
                 onChange={handleFileChange}
               />
            </div>
          </div>
          
          <div className="mt-auto pt-6 text-center">
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Version 1.2 • PingManager</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomeMenu;
