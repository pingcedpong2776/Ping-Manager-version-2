
import React, { useState, useEffect } from 'react';
import { Player, PlayStyle } from '../types';

interface RecruitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecruit: (player: Player, cost: number) => void;
  currentBudget: number;
}

const RecruitModal: React.FC<RecruitModalProps> = ({ isOpen, onClose, onRecruit, currentBudget }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState(20);
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [points, setPoints] = useState(500);
  const [style, setStyle] = useState<PlayStyle>(PlayStyle.Attacker);
  const [stats, setStats] = useState({ attack: 50, defense: 50, speed: 50, mental: 50, stamina: 70 });
  const RECRUITMENT_COST = 250;

  const autoRank = () => {
    const calculated = 500 + (stats.attack * 5) + (stats.defense * 4) + (stats.speed * 4) + (stats.mental * 6);
    setPoints(Math.round(calculated));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentBudget < RECRUITMENT_COST) return;
    const id = `p-custom-${Date.now()}`;
    const photoId = Math.floor(Math.random() * 99);
    
    // Logique de photo standardisée : < 18 ans = Avatar, >= 18 ans = Photo
    let photoUrl = '';
    if (age < 18) {
      const seed = Math.random().toString(36).substring(7);
      photoUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf`;
    } else {
      photoUrl = gender === 'M' 
        ? `https://randomuser.me/api/portraits/men/${photoId}.jpg` 
        : `https://randomuser.me/api/portraits/women/${photoId}.jpg`;
    }

    onRecruit({
      id, 
      name, 
      gender,
      photoUrl,
      age, 
      points, 
      handed: Math.random() > 0.8 ? 'Left' : 'Right', 
      style, 
      stats, 
      fatigue: 0, 
      experience: 0, 
      careerStats: { wins: 0, losses: 0, setsWon: 0, setsLost: 0, bestPerf: 0 }
    }, RECRUITMENT_COST);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="ping-gradient p-8 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Recrutement</h2>
            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">Nouvelle signature FFTT</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all z-10">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="flex gap-2">
            <button type="button" onClick={() => setGender('M')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${gender === 'M' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>Homme</button>
            <button type="button" onClick={() => setGender('F')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${gender === 'F' ? 'bg-pink-600 text-white border-pink-600' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>Femme</button>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Identité du Joueur</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Jean-Michel Saive" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-base" />
          </div>

          <div>
             <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-2">
                <span>Âge</span>
                <span className="text-slate-900">{age} ans</span>
             </div>
             <input 
                type="range" 
                min="6" 
                max="60" 
                value={age} 
                onChange={(e) => setAge(parseInt(e.target.value))} 
                className="w-full h-2.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Classement (Pts)</label>
              <div className="flex gap-2">
                <input type="number" value={points} onChange={(e) => setPoints(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-black text-sm" />
                <button type="button" onClick={autoRank} className="px-3 bg-slate-100 rounded-xl text-[9px] font-black uppercase">IA</button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Style</label>
              <select value={style} onChange={(e) => setStyle(e.target.value as PlayStyle)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-black text-sm appearance-none">
                {Object.values(PlayStyle).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Statistiques Initiales</p>
            {Object.entries(stats).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-[11px] font-black uppercase mb-2 text-slate-600">
                  <span>{key}</span>
                  <span className="text-black">{value}</span>
                </div>
                <input type="range" min="10" max="95" value={value} onChange={(e) => setStats({...stats, [key]: parseInt(e.target.value)})} className="w-full h-2.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600" />
              </div>
            ))}
          </div>

          <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex justify-between items-center mt-8">
            <div><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Coût Signature</p><p className="text-2xl font-black">{RECRUITMENT_COST}€</p></div>
            <button type="submit" disabled={currentBudget < RECRUITMENT_COST || !name} className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${currentBudget < RECRUITMENT_COST || !name ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 hover:opacity-80 shadow-xl'}`}>VALIDER</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecruitModal;
