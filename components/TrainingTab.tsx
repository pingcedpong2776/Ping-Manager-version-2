
import React, { useState, useEffect } from 'react';
import { Player, Club } from '../types';
import { getAITrainingAdvice } from '../services/geminiService';

interface TrainingTabProps {
  club: Club;
  onTrainPlayer: (updatedPlayer: Player, cost: number) => void;
}

interface TrainingSession {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  fatigueChange: number; // Négatif pour le repos
  statBonus: Partial<Player['stats']>;
  pointsBonus?: number;
  expBonus: number;
}

const TRAINING_SESSIONS: TrainingSession[] = [
  {
    id: 'physique',
    name: 'Physique Intensif',
    description: 'Améliore la vitesse et l\'endurance. Épuisant mais efficace.',
    icon: 'fa-person-running',
    cost: 50,
    fatigueChange: 25,
    statBonus: { speed: 2, stamina: 3 },
    expBonus: 10
  },
  {
    id: 'panier',
    name: 'Séance de Panier',
    description: 'Répétition intensive de coups d\'attaque.',
    icon: 'fa-table-tennis-paddle-ball',
    cost: 80,
    fatigueChange: 15,
    statBonus: { attack: 4 },
    expBonus: 15
  },
  {
    id: 'kine',
    name: 'Séance de Kiné',
    description: 'Massage et récupération active pour réduire la fatigue.',
    icon: 'fa-hand-holding-medical',
    cost: 100,
    fatigueChange: -40,
    statBonus: {},
    expBonus: 5
  },
  {
    id: 'tactique',
    name: 'Analyse Tactique',
    description: 'Travail sur le placement et la lecture du jeu adverse.',
    icon: 'fa-chess-board',
    cost: 40,
    fatigueChange: 5,
    statBonus: { defense: 3, mental: 2 },
    expBonus: 20
  },
  {
    id: 'stage',
    name: 'Stage National',
    description: 'Un stage d\'élite. Améliore globalement le niveau de jeu.',
    icon: 'fa-ranking-star',
    cost: 500,
    fatigueChange: 45,
    statBonus: { attack: 2, defense: 2, mental: 2, speed: 2 },
    pointsBonus: 15,
    expBonus: 100
  },
  {
    id: 'mental',
    name: 'Préparation Mentale',
    description: 'Techniques de concentration pour les moments clés.',
    icon: 'fa-brain',
    cost: 120,
    fatigueChange: 2,
    statBonus: { mental: 6 },
    expBonus: 30
  }
];

const TrainingTab: React.FC<TrainingTabProps> = ({ club, onTrainPlayer }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<{ analysis: string, recommendedSessionIds: string[] } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const selectedPlayer = club.players.find(p => p.id === selectedPlayerId);

  // Reset AI advice when player changes
  useEffect(() => {
    setAiAdvice(null);
  }, [selectedPlayerId]);

  const handleExecuteTraining = (session: TrainingSession) => {
    if (!selectedPlayer) return;
    if (club.budget < session.cost) {
      alert("Trésorerie insuffisante !");
      return;
    }
    
    // Si c'est un entraînement fatiguant, on vérifie que le joueur peut le supporter
    if (session.fatigueChange > 0 && selectedPlayer.fatigue + session.fatigueChange > 100) {
      alert("Le joueur est à bout de forces ! Une séance de kiné ou du repos est nécessaire.");
      return;
    }

    const updatedPlayer: Player = {
      ...selectedPlayer,
      fatigue: Math.max(0, Math.min(100, selectedPlayer.fatigue + session.fatigueChange)),
      experience: selectedPlayer.experience + session.expBonus,
      points: selectedPlayer.points + (session.pointsBonus || 0),
      stats: {
        attack: Math.min(100, selectedPlayer.stats.attack + (session.statBonus.attack || 0)),
        defense: Math.min(100, selectedPlayer.stats.defense + (session.statBonus.defense || 0)),
        speed: Math.min(100, selectedPlayer.stats.speed + (session.statBonus.speed || 0)),
        mental: Math.min(100, selectedPlayer.stats.mental + (session.statBonus.mental || 0)),
        stamina: Math.min(100, selectedPlayer.stats.stamina + (session.statBonus.stamina || 0)),
      }
    };

    onTrainPlayer(updatedPlayer, session.cost);
    setSuccessMsg(`Session "${session.name}" terminée pour ${selectedPlayer.name} !`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleAskAICoach = async () => {
    if (!selectedPlayer) return;
    setIsAiLoading(true);
    try {
      const advice = await getAITrainingAdvice(selectedPlayer, TRAINING_SESSIONS);
      setAiAdvice(advice);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-black uppercase tracking-tight">Centre de Performance</h2>
          <p className="text-gray-500 font-bold text-sm uppercase">Optimisez votre effectif pour la Phase {club.teamDivisions[1] ? 'en cours' : 'à venir'}</p>
        </div>
        <div className="bg-white border-2 border-blue-100 px-6 py-4 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Trésorerie Club</p>
            <p className="text-2xl font-black text-blue-900">{club.budget}€</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
             <i className="fa-solid fa-vault text-xl"></i>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Liste des joueurs */}
        <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-[700px]">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Sélection du joueur</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {club.players.sort((a,b) => b.points - a.points).map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPlayerId(p.id)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                  selectedPlayerId === p.id 
                  ? 'bg-blue-600 border-blue-600 shadow-blue-200 shadow-lg -translate-y-1' 
                  : 'bg-white border-gray-50 hover:border-blue-100 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={p.photoUrl} className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover" alt="" />
                  <div className="text-left">
                    <p className={`text-xs font-black uppercase tracking-tighter ${selectedPlayerId === p.id ? 'text-white' : 'text-black'}`}>
                      {p.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                       <div className="w-16 h-1.5 bg-black/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${p.fatigue > 70 ? 'bg-red-400' : p.fatigue > 30 ? 'bg-orange-400' : 'bg-green-400'}`} 
                            style={{ width: `${p.fatigue}%` }}
                          ></div>
                       </div>
                       <span className={`text-[8px] font-black uppercase ${selectedPlayerId === p.id ? 'text-blue-100' : 'text-gray-400'}`}>
                         {p.fatigue}% Fat.
                       </span>
                    </div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-[10px] font-black border ${selectedPlayerId === p.id ? 'bg-white/20 text-white border-white/30' : 'bg-blue-50 text-blue-900 border-blue-100'}`}>
                  {Math.round(p.points)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Détails et Sessions */}
        <div className="lg:col-span-8 space-y-6">
          {selectedPlayer ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-right-4">
              {/* Profil Stats */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8 flex flex-col h-full">
                <div className="flex items-center gap-6 pb-6 border-b border-gray-50">
                  <img src={selectedPlayer.photoUrl} className="w-20 h-20 rounded-3xl shadow-xl border-4 border-white object-cover" alt="" />
                  <div>
                    <h3 className="text-2xl font-black text-black uppercase tracking-tighter">{selectedPlayer.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-blue-900 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">{selectedPlayer.style}</span>
                      <span className="text-gray-400 text-[10px] font-bold">{selectedPlayer.age} ans</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Capacités actuelles</p>
                    <button 
                      onClick={handleAskAICoach}
                      disabled={isAiLoading}
                      className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-purple-200 transition-all disabled:opacity-50"
                    >
                      {isAiLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                      Coach IA
                    </button>
                  </div>
                  
                  {aiAdvice && (
                    <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 relative animate-in zoom-in-95 duration-300">
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center border-2 border-white">
                        <i className="fa-solid fa-quote-left text-[10px]"></i>
                      </div>
                      <p className="text-xs text-purple-900 font-bold leading-relaxed italic">
                        "{aiAdvice.analysis}"
                      </p>
                    </div>
                  )}

                  {Object.entries(selectedPlayer.stats).map(([stat, value]) => (
                    <div key={stat}>
                      <div className="flex justify-between text-[10px] font-black uppercase mb-1.5">
                        <span className="text-gray-500">{stat}</span>
                        <span className="text-black">{value}</span>
                      </div>
                      <div className="w-full bg-gray-50 h-2.5 rounded-full overflow-hidden border border-gray-100">
                        <div 
                          className={`h-full transition-all duration-1000 ${
                            stat === 'attack' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 
                            stat === 'defense' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 
                            stat === 'speed' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 
                            stat === 'mental' ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                          }`}
                          style={{ width: `${value}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-10">
                     <i className="fa-solid fa-medal text-8xl"></i>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Expérience de Carrière</span>
                    <span className="text-lg font-black">{selectedPlayer.experience} <span className="text-xs text-blue-300">XP</span></span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-400 h-full transition-all" style={{ width: `${(selectedPlayer.experience % 200) / 2}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Liste des entraînements */}
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Programmes disponibles</h3>
                {TRAINING_SESSIONS.map(session => {
                  const isAffordable = club.budget >= session.cost;
                  const isRecovering = session.fatigueChange < 0;
                  const canSupportFatigue = session.fatigueChange <= 0 || selectedPlayer.fatigue + session.fatigueChange <= 100;
                  const isRecommended = aiAdvice?.recommendedSessionIds.includes(session.id);

                  return (
                    <div 
                      key={session.id} 
                      className={`bg-white p-6 rounded-3xl border transition-all relative overflow-hidden group ${
                        isRecommended ? 'border-purple-500 shadow-xl ring-2 ring-purple-100' :
                        !isAffordable || !canSupportFatigue ? 'opacity-60 border-gray-100 grayscale-[0.5]' : 'border-gray-100 hover:border-blue-300 hover:shadow-xl'
                      }`}
                    >
                      {isRecommended && (
                        <div className="absolute top-0 right-0 bg-purple-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-2xl">
                          Recommandé
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            isRecovering ? 'bg-green-50 text-green-600 group-hover:bg-green-600' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600'
                          } group-hover:text-white`}>
                            <i className={`fa-solid ${session.icon} text-xl`}></i>
                          </div>
                          <div>
                            <h4 className="font-black text-black uppercase text-sm tracking-tight">{session.name}</h4>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{session.cost}€</p>
                          </div>
                        </div>
                        {isRecovering && (
                          <span className="text-[8px] font-black text-green-600 bg-green-50 px-2 py-1 rounded uppercase">Récupération</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
                        {Object.entries(session.statBonus).map(([s, b]) => (
                          <span key={s} className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded">
                            <i className="fa-solid fa-plus-circle"></i> {s} +{b}
                          </span>
                        ))}
                        {session.pointsBonus && (
                          <span className="text-[9px] font-black text-yellow-600 uppercase flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded">
                             <i className="fa-solid fa-star"></i> Points +{session.pointsBonus}
                          </span>
                        )}
                        <span className={`text-[9px] font-black uppercase flex items-center gap-1 px-2 py-0.5 rounded ${isRecovering ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                          <i className={`fa-solid ${isRecovering ? 'fa-battery-full' : 'fa-battery-half'}`}></i> Fatigue {session.fatigueChange > 0 ? '+' : ''}{session.fatigueChange}%
                        </span>
                      </div>

                      <button
                        onClick={() => handleExecuteTraining(session)}
                        disabled={!isAffordable || !canSupportFatigue}
                        className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                          !isAffordable ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                          !canSupportFatigue ? 'bg-red-50 text-red-300 cursor-not-allowed' :
                          isRecovering ? 'bg-green-600 text-white hover:bg-black shadow-lg shadow-green-100' :
                          'bg-blue-900 text-white hover:bg-black shadow-lg shadow-blue-100'
                        }`}
                      >
                        {!isAffordable ? "Trésorerie insuffisante" : 
                         !canSupportFatigue ? "Épuisement critique" : "Lancer le programme"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] border-4 border-dashed border-gray-100 h-full flex flex-col items-center justify-center p-16 text-center">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8">
                <i className="fa-solid fa-dumbbell text-5xl text-gray-200"></i>
              </div>
              <h3 className="text-2xl font-black text-gray-300 uppercase tracking-tighter">Prêt pour l'entraînement ?</h3>
              <p className="text-sm text-gray-400 font-bold uppercase mt-2 max-w-xs mx-auto leading-relaxed">
                Sélectionnez un membre de votre effectif à gauche pour définir son programme personnalisé.
              </p>
            </div>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
          <div className="bg-green-600 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 border-2 border-green-400">
            <i className="fa-solid fa-circle-check text-xl"></i>
            <span className="text-sm font-black uppercase tracking-widest">{successMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingTab;
