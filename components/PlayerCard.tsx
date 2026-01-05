
import React, { useState } from 'react';
import { Player } from '../types';
import { simulateMatch } from '../services/simulationService';
import { generateRandomPlayer } from '../constants';

interface PlayerCardProps {
  player: Player;
  onSelect?: (p: Player) => void;
  onDelete?: (id: string) => void;
  onEdit?: (p: Player) => void;
  selected?: boolean;
}

const DEFAULT_PHOTO = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onSelect, onDelete, onEdit, selected }) => {
  const [quickMatchResult, setQuickMatchResult] = useState<{ winsA: number, winsB: number, win: boolean } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleQuickMatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSimulating) return;

    setIsSimulating(true);
    setTimeout(() => {
      const opponentPoints = Math.round(player.points + (Math.random() * 200 - 100));
      const opponent = generateRandomPlayer(`opp-${Date.now()}`, opponentPoints);
      const match = simulateMatch(player, opponent);
      let winsA = 0, winsB = 0;
      match.sets.forEach(s => s.scoreA > s.scoreB ? winsA++ : winsB++);
      setQuickMatchResult({ winsA, winsB, win: winsA > winsB });
      setIsSimulating(false);
      setTimeout(() => setQuickMatchResult(null), 4000);
    }, 600);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(player.id);
    setShowDeleteConfirm(false);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  // Logique "IA" simplifiée pour les insights
  const getAIInsight = () => {
      if (player.injuryStatus === 'SERIOUS') return { label: `Blessé (${player.injuryDuration}j)`, color: 'bg-red-100 text-red-700', icon: 'fa-crutch' };
      if (player.fatigue > 60) return { label: 'Épuisé', color: 'bg-red-100 text-red-700', icon: 'fa-battery-empty' };
      if (player.fatigue > 40) return { label: 'Fatigué', color: 'bg-orange-100 text-orange-700', icon: 'fa-battery-quarter' };
      
      const potential = (95 - player.age) + (player.stats.mental * 0.5);
      if (player.age < 18 && potential > 90) return { label: 'Pépite', color: 'bg-purple-100 text-purple-700', icon: 'fa-gem' };
      
      const winRate = player.careerStats.wins / (player.careerStats.wins + player.careerStats.losses || 1);
      if (winRate > 0.7 && player.careerStats.wins > 5) return { label: 'En Feu', color: 'bg-green-100 text-green-700', icon: 'fa-fire' };
      if (winRate < 0.3 && player.careerStats.losses > 5) return { label: 'En Doute', color: 'bg-slate-100 text-slate-600', icon: 'fa-cloud-rain' };

      if (player.points > 2000) return { label: 'Leader', color: 'bg-yellow-100 text-yellow-800', icon: 'fa-crown' };
      
      return { label: 'Prêt', color: 'bg-blue-50 text-blue-600', icon: 'fa-check' };
  };

  const insight = getAIInsight();
  const isInjured = player.injuryStatus === 'SERIOUS';

  const winRatio = player.careerStats.wins + player.careerStats.losses > 0 
    ? Math.round((player.careerStats.wins / (player.careerStats.wins + player.careerStats.losses)) * 100) 
    : 0;

  return (
    <div 
      onClick={() => { if(!isInjured) onSelect?.(player); }}
      className={`bg-white rounded-[2rem] shadow-sm border p-5 transition-all relative group overflow-hidden flex flex-col h-full ${
        selected ? 'border-blue-600 ring-4 ring-blue-50' : isInjured ? 'border-red-200 opacity-90' : 'border-slate-100 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
      }`}
    >
      {/* Overlay de Confirmation de Suppression */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mb-3 text-red-500 animate-bounce">
                <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h4 className="text-sm font-black text-slate-900 uppercase leading-tight mb-4">Supprimer le joueur ?</h4>
            <div className="flex gap-2 w-full">
                <button onClick={cancelDelete} className="flex-1 py-2 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-colors">
                    Annuler
                </button>
                <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 rounded-lg text-[10px] font-black uppercase text-white hover:bg-red-700 shadow-md">
                    Confirmer
                </button>
            </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex justify-between items-start mb-4">
        <div className="relative">
          <img 
            src={player.photoUrl || DEFAULT_PHOTO} 
            alt={player.name}
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PHOTO; }}
            className={`w-14 h-14 rounded-2xl object-cover border shadow-sm ${isInjured ? 'border-red-300 grayscale' : 'border-slate-100'}`}
          />
          {isInjured && (
              <div className="absolute -top-2 -left-2 bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-full shadow-md animate-pulse">
                  <i className="fa-solid fa-user-injured text-[10px]"></i>
              </div>
          )}
          {quickMatchResult && (
            <div className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-[8px] font-black text-white shadow-lg animate-bounce ${quickMatchResult.win ? 'bg-green-500' : 'bg-red-500'}`}>
              {quickMatchResult.win ? 'V' : 'D'} {quickMatchResult.winsA}-{quickMatchResult.winsB}
            </div>
          )}
        </div>
        
        {/* Badges IA */}
        <div className={`px-2 py-1 rounded-lg flex items-center gap-1.5 ${insight.color}`}>
            <i className={`fa-solid ${insight.icon} text-[10px]`}></i>
            <span className="text-[9px] font-black uppercase tracking-wide">{insight.label}</span>
        </div>
      </div>

      <div className="mb-4">
          <h3 className="font-black text-slate-900 leading-tight tracking-tight text-base truncate">{player.name}</h3>
          <div className="flex items-center flex-wrap gap-2 mt-1">
             <span className="text-[9px] text-slate-400 font-bold uppercase">{player.age} ans</span>
             <span className="w-1 h-1 rounded-full bg-slate-300"></span>
             <span className="text-[9px] text-slate-600 font-black uppercase bg-slate-100 px-1.5 rounded">{player.category}</span>
             <span className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[100px]">{player.style}</span>
          </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
         <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
            <span className="block text-[8px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Points</span>
            <span className="block text-lg font-black text-slate-900">{Math.round(player.points)}</span>
         </div>
         <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
            <span className="block text-[8px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Technique</span>
            <span className="block text-lg font-black text-purple-600">{player.stats.technique || 50}</span>
         </div>
      </div>

      {/* Footer Actions & Fatigue */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-slate-50">
        <div className="flex-1">
            <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-400 mb-1">
                <span>Fatigue</span>
                <span>{player.fatigue}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-700 ${player.fatigue > 70 ? 'bg-red-500' : player.fatigue > 30 ? 'bg-orange-400' : 'bg-green-500'}`} 
                    style={{ width: `${player.fatigue}%` }}
                ></div>
            </div>
        </div>

        <div className="flex gap-1">
            <button 
                onClick={handleQuickMatch} 
                disabled={isSimulating || isInjured} 
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-sm ${isSimulating || isInjured ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white'}`}
                title="Match Rapide"
            >
                {isSimulating ? <i className="fa-solid fa-spinner fa-spin text-[10px]"></i> : <i className="fa-solid fa-bolt text-[10px]"></i>}
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onEdit?.(player); }} 
                className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                title="Éditer"
            >
                <i className="fa-solid fa-pen text-[10px]"></i>
            </button>
            {onDelete && (
                <button 
                    onClick={handleDeleteClick}
                    className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    title="Supprimer"
                >
                    <i className="fa-solid fa-trash text-[10px]"></i>
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
