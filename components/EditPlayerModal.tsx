
import React, { useState, useEffect } from 'react';
import { Player, PlayStyle } from '../types';
import { calculatePointsFromStats, getCategoryFromAge } from '../constants';

interface EditPlayerModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedPlayer: Player) => void;
}

const DEFAULT_PHOTO = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

const STAT_LABELS: Record<string, string> = {
    attack: 'Attaque',
    defense: 'Défense',
    speed: 'Vitesse',
    mental: 'Mental',
    stamina: 'Physique',
    technique: 'Technique',
    tactical: 'Tactique'
};

const EditPlayerModal: React.FC<EditPlayerModalProps> = ({ player, isOpen, onClose, onUpdate }) => {
  const [formData, setFormData] = useState<Player | null>(null);

  useEffect(() => {
    if (player) {
      setFormData({ 
          ...player, 
          stats: { 
              ...player.stats,
              // Fallback pour les vieilles sauvegardes sans ces stats
              technique: player.stats.technique || 50,
              tactical: player.stats.tactical || 50
          } 
      });
    }
  }, [player]);

  if (!isOpen || !formData) return null;

  const handleStatChange = (key: keyof Player['stats'], value: number) => {
    setFormData({
      ...formData,
      stats: { ...formData.stats, [key]: value }
    });
  };

  const handleAgeChange = (newAge: number) => {
      setFormData({
          ...formData,
          age: newAge,
          category: getCategoryFromAge(newAge)
      });
  };

  const autoRank = () => {
    if (!formData) return;
    setFormData({ ...formData, points: calculatePointsFromStats(formData.stats) });
  };

  const generateStatsFromPoints = () => {
      if (!formData) return;
      const targetPoints = formData.points;
      const style = formData.style;
      
      const baseAvg = Math.max(10, Math.min(95, (targetPoints - 200) / 25));
      const v = (mag: number) => Math.floor(Math.random() * mag) - (mag/2);

      const newStats = { ...formData.stats };
      
      // Default
      newStats.attack = baseAvg;
      newStats.defense = baseAvg;
      newStats.speed = baseAvg;
      newStats.mental = baseAvg;
      newStats.stamina = baseAvg;
      newStats.technique = baseAvg;
      newStats.tactical = baseAvg;

      if (style === PlayStyle.Attacker || style === PlayStyle.Pivot) {
          newStats.attack += 15 + v(5);
          newStats.speed += 10 + v(5);
          newStats.technique += 10 + v(5);
          newStats.defense -= 10;
      } else if (style === PlayStyle.Defender || style === PlayStyle.ModernDef) {
          newStats.defense += 20 + v(5);
          newStats.stamina += 15 + v(5);
          newStats.tactical += 10 + v(5);
          newStats.attack -= 15;
      } else if (style === PlayStyle.Blocker || style === PlayStyle.Crabe) {
          newStats.defense += 10 + v(5);
          newStats.tactical += 15 + v(5);
          newStats.mental += 10 + v(5);
          newStats.speed -= 5;
      } else if (style === PlayStyle.Hitter) {
          newStats.attack += 20 + v(5);
          newStats.speed += 15 + v(5);
          newStats.defense -= 15;
          newStats.technique -= 5;
      }

      // Clamp values
      Object.keys(newStats).forEach(key => {
          const k = key as keyof Player['stats'];
          newStats[k] = Math.min(99, Math.max(10, newStats[k]));
      });

      setFormData({ ...formData, stats: newStats });
  };

  const regeneratePhoto = () => {
    if (!formData) return;
    const photoId = Math.floor(Math.random() * 99);
    
    // Logique standardisée : < 18 ans = Avatar, >= 18 ans = Photo
    let newUrl = '';
    if (formData.age < 18) {
        const seed = Math.random().toString(36).substring(7);
        newUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf`;
    } else {
        newUrl = formData.gender === 'M' 
        ? `https://randomuser.me/api/portraits/men/${photoId}.jpg` 
        : `https://randomuser.me/api/portraits/women/${photoId}.jpg`;
    }
    setFormData({ ...formData, photoUrl: newUrl });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="relative">
               <img src={formData.photoUrl || DEFAULT_PHOTO} className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20" alt="" />
               <button type="button" onClick={regeneratePhoto} className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center border-2 border-slate-900">
                  <i className="fa-solid fa-sync text-[10px]"></i>
               </button>
             </div>
             <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Fiche Joueur</h2>
                <p className="text-blue-200 text-xs font-bold uppercase">{formData.name}</p>
             </div>
          </div>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Genre</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setFormData({...formData, gender: 'M'})} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.gender === 'M' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>H</button>
                <button type="button" onClick={() => setFormData({...formData, gender: 'F'})} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${formData.gender === 'F' ? 'bg-pink-600 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>F</button>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nom Complet</label>
              <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" />
            </div>

            <div className="col-span-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Âge</label>
                <input type="number" min="6" max="90" value={formData.age} onChange={(e) => handleAgeChange(parseInt(e.target.value))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" />
                <p className="text-[9px] text-slate-400 font-bold mt-1 text-right">{formData.category}</p>
            </div>

            <div className="col-span-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Style de Jeu</label>
                <select 
                    value={formData.style} 
                    onChange={(e) => setFormData({...formData, style: e.target.value as PlayStyle})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none"
                >
                    {Object.values(PlayStyle).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Points FFTT</label>
              <div className="flex gap-2">
                <input type="number" value={formData.points} onChange={(e) => setFormData({...formData, points: parseInt(e.target.value)})} className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" />
                <button type="button" onClick={autoRank} className="px-4 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase border border-slate-200" title="Calculer les points d'après les stats">Calc. Pts</button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Statistiques</p>
                <button 
                    type="button"
                    onClick={generateStatsFromPoints}
                    className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-purple-100 transition-colors"
                >
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                    Générer Stats Auto
                </button>
            </div>
            
            {Object.entries(formData.stats).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-[11px] mb-1 uppercase font-black text-slate-500">
                  <span>{STAT_LABELS[key] || key}</span>
                  <span>{value}</span>
                </div>
                <input type="range" min="10" max="99" value={value} onChange={(e) => handleStatChange(key as keyof Player['stats'], parseInt(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>
            ))}
          </div>

          <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Enregistrer les modifications</button>
        </form>
      </div>
    </div>
  );
};

export default EditPlayerModal;
