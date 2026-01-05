
import React, { useState } from 'react';
import { Club } from '../types';
import { generateRandomPlayer, OFFICIAL_DIVISIONS, DIVISION_SCALING } from '../constants';
import { getZoneBasedAdversaries, getZoneSuggestions } from '../services/geminiService';

interface ClubSetupProps {
  onComplete: (club: Club, zone: string, adversariesByTeam: Record<number, Club[]>, isUnlimitedBudget: boolean) => void;
}

const ClubSetup: React.FC<ClubSetupProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const [suggestedZones, setSuggestedZones] = useState<string[]>([]);
  const [isSuggestingZone, setIsSuggestingZone] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#1e3a8a');
  const [secondaryColor, setSecondaryColor] = useState('#3b82f6');
  const [initialTeams, setInitialTeams] = useState(1);
  const [selectedDivision, setSelectedDivision] = useState('Départementale 1');
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleZoneSuggestion = async () => {
      if (!city) return;
      setIsSuggestingZone(true);
      try {
          const suggestions = await getZoneSuggestions(city);
          setSuggestedZones(suggestions);
          if (suggestions.length > 0 && !zone) setZone(suggestions[0]);
      } catch (e) {
          console.error(e);
      } finally {
          setIsSuggestingZone(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !city || !managerName || !zone) return;

    setIsLoading(true);
    
    const teams = Math.max(1, Math.min(12, initialTeams));
    const divs: Record<number, string> = {};
    const adversariesByTeam: Record<number, Club[]> = {};

    const startIdx = OFFICIAL_DIVISIONS.indexOf(selectedDivision);

    for (let i = 1; i <= teams; i++) {
      const teamDivIdx = Math.min(OFFICIAL_DIVISIONS.length - 1, startIdx + (i - 1));
      const divName = OFFICIAL_DIVISIONS[teamDivIdx];
      divs[i] = divName;
      
      const targetPoints = DIVISION_SCALING[divName] || 800;
      
      let advNames = await getZoneBasedAdversaries(zone, divs[i]);
      while (advNames.length < 7) {
         advNames.push(`Club Adverse ${advNames.length + 1}`);
      }
      advNames = advNames.slice(0, 7);

      adversariesByTeam[i] = advNames.map((advName, idx) => ({
        id: `adv-${i}-${idx}-${Date.now()}`,
        name: advName,
        managerName: 'Coach IA',
        city: zone,
        primaryColor: '#1e293b',
        secondaryColor: '#475569',
        players: Array.from({ length: 4 }, (_, j) => {
            let pts = targetPoints;
            if (j === 2) { 
                const spread = 100 + Math.random() * 200;
                pts += spread * (Math.random() > 0.5 ? 1 : -1);
            } else if (j === 3) {
                const spread = 100 + Math.random() * 200;
                pts += spread * (Math.random() > 0.5 ? 1 : -1);
            }
            return generateRandomPlayer(`p-adv-${i}-${idx}-${j}`, pts);
        }),
        budget: 0,
        teamCount: 1,
        teamDivisions: { 1: divs[i] },
        history: []
      }));
    }

    const basePoints = DIVISION_SCALING[selectedDivision] || 800;
    const initialPlayers = Array.from({ length: teams * 6 }, (_, i) => 
      generateRandomPlayer(`p-${i}`, basePoints)
    );

    const newClub: Club = {
      id: `club-${Date.now()}`,
      name,
      managerName,
      city,
      primaryColor,
      secondaryColor,
      players: initialPlayers,
      budget: 1500 + (teams * 500),
      teamCount: teams,
      teamDivisions: divs,
      history: []
    };

    onComplete(newClub, zone, adversariesByTeam, isUnlimited);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-[200]">
      <div className="bg-white rounded-[3.5rem] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col md:flex-row border border-white/10 animate-in fade-in zoom-in duration-500">
        <div className="md:w-1/3 p-12 flex flex-col justify-center items-center text-center relative overflow-hidden bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
             <i className="fa-solid fa-table-tennis-paddle-ball text-[15rem] -rotate-12 translate-x-1/2 text-black"></i>
          </div>
          <div 
            className="w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl relative z-10 text-white"
            style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
          >
            <i className="fa-solid fa-user-tie text-5xl"></i>
          </div>
          
          <div className="relative z-10 w-full">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Futur Manager</p>
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-tight text-slate-900 break-words drop-shadow-sm">
              {managerName || "Votre Nom"}
            </h1>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-4"></div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
              {name || "Votre Club"}
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-12 md:w-2/3 space-y-6 bg-white max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Manager</label>
                <input required value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Jean-Pierre Ping" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-900 transition-all focus:ring-4 focus:ring-slate-100" />
             </div>
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Club</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="TT ACADEMY" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-900 transition-all focus:ring-4 focus:ring-slate-100" />
             </div>
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Ville</label>
                <div className="relative">
                    <input 
                        required 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                        onBlur={() => { if(city && !zone) handleZoneSuggestion(); }}
                        placeholder="Ville..." 
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-900 transition-all focus:ring-4 focus:ring-slate-100" 
                    />
                    {city && (
                        <button 
                            type="button"
                            onClick={handleZoneSuggestion}
                            disabled={isSuggestingZone}
                            className="absolute right-2 top-2 bottom-2 w-10 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center hover:bg-purple-200 transition-colors"
                            title="Suggérer une zone"
                        >
                            {isSuggestingZone ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                        </button>
                    )}
                </div>
             </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Zone de compétition</label>
            {suggestedZones.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-2">
                    {suggestedZones.map(s => (
                        <button 
                            key={s} 
                            type="button" 
                            onClick={() => setZone(s)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${zone === s ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            ) : null}
            <input required value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex: Gironde, Bretagne..." className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-900 transition-all focus:ring-4 focus:ring-slate-100" />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Division Équipe 1</label>
            <select 
              value={selectedDivision} 
              onChange={(e) => setSelectedDivision(e.target.value)} 
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none font-black text-slate-900 appearance-none"
            >
              {OFFICIAL_DIVISIONS.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1 italic">Niveau moyen estimé : {DIVISION_SCALING[selectedDivision]} pts</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Couleur Primaire</label>
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                <span className="text-[10px] font-black text-slate-500 uppercase">{primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Couleur Secondaire</label>
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                <span className="text-[10px] font-black text-slate-500 uppercase">{secondaryColor}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <input type="checkbox" id="unlimited" checked={isUnlimited} onChange={(e) => setIsUnlimited(e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
             <label htmlFor="unlimited" className="text-xs font-black text-slate-900 uppercase tracking-widest cursor-pointer select-none">
                Budget Illimité <span className="text-slate-400 font-normal normal-case ml-1">(Mode Bac à sable)</span>
             </label>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest text-center">Équipes ({initialTeams})</label>
            <div className="flex items-center gap-6">
              <button type="button" onClick={() => setInitialTeams(Math.max(1, initialTeams - 1))} className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 font-black flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all"><i className="fa-solid fa-minus"></i></button>
              <div className="flex-1 bg-slate-50 border border-slate-100 py-4 rounded-[1.5rem] text-center text-xl font-black text-slate-900">{initialTeams}</div>
              <button type="button" onClick={() => setInitialTeams(Math.min(12, initialTeams + 1))} className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 font-black flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all"><i className="fa-solid fa-plus"></i></button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading || !name || !city || !managerName || !zone}
            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-2xl disabled:bg-slate-100"
            style={{ backgroundColor: primaryColor }}
          >
            {isLoading ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : null}
            Créer ma carrière
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClubSetup;
