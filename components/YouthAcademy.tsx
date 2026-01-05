
import React, { useState } from 'react';
import { Player, PlayStyle, Competition } from '../types';
import { generateRandomPlayer, getCategoryFromAge, REAL_COMPETITIONS } from '../constants';
import { getYouthPotentialAnalysis } from '../services/geminiService';
import EditPlayerModal from './EditPlayerModal';

interface YouthAcademyProps {
  youthPlayers: Player[];
  onAddYouth: (players: Player[]) => void;
  onSignPlayer: (player: Player) => void;
  onRemovePlayer: (playerId: string) => void;
  onUpdatePlayer: (player: Player) => void;
  onTrainYouth: (player: Player, type: 'basic' | 'stage') => void;
  budget: number;
}

const YouthAcademy: React.FC<YouthAcademyProps> = ({ 
    youthPlayers, 
    onAddYouth, 
    onSignPlayer, 
    onRemovePlayer,
    onUpdatePlayer,
    onTrainYouth,
    budget 
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'competitions'>('roster');
  const [isScouting, setIsScouting] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);
  const [aiInsights, setAiInsights] = useState<Record<string, { potential: string, competitionSuggestion: string }>>({});
  const [editingYouth, setEditingYouth] = useState<Player | null>(null);
  const [trainingMsg, setTrainingMsg] = useState<string | null>(null);

  const DETECTION_COST = 200;
  const BASIC_TRAINING_COST = 50;
  const STAGE_COST = 200;

  // Filtrer uniquement les compétitions Jeunes, en excluant les championnats par équipe pour l'affichage liste simple
  const otherYouthCompetitions = REAL_COMPETITIONS.filter(c => (c.level === 'Jeunes' || (c.maxAge && c.maxAge <= 18)) && !c.name.includes("Champ. Jeunes"));
  const teamYouthCompetitions = REAL_COMPETITIONS.filter(c => c.name.includes("Champ. Jeunes")).sort((a,b) => a.id.localeCompare(b.id));

  const handleScout = () => {
      if (budget < DETECTION_COST) {
          alert("Budget insuffisant pour lancer une détection.");
          return;
      }
      setIsScouting(true);
      setTimeout(() => {
          const newTalents = Array.from({ length: 3 }, (_, i) => {
              // Age 6 à 14 ans max pour la détection
              const age = 6 + Math.floor(Math.random() * 9); 
              const points = 500 + Math.floor(Math.random() * 100) + (age - 6) * 15; 
              // On force l'âge dans generateRandomPlayer pour avoir la bonne photo (avatar)
              return generateRandomPlayer(`youth-${Date.now()}-${i}`, points, age);
          });
          onAddYouth(newTalents);
          setIsScouting(false);
      }, 1500);
  };

  const triggerTraining = (player: Player, type: 'basic' | 'stage') => {
      const cost = type === 'basic' ? BASIC_TRAINING_COST : STAGE_COST;
      if (budget < cost) {
          alert("Budget insuffisant.");
          return;
      }
      
      onTrainYouth(player, type);
      
      setTrainingMsg(type === 'basic' ? `Entraînement terminé pour ${player.name}` : `Stage intensif validé pour ${player.name}`);
      setTimeout(() => setTrainingMsg(null), 2500);
  };

  const handleAnalyze = async (player: Player) => {
      if (analyzingIds.includes(player.id)) return;
      setAnalyzingIds(prev => [...prev, player.id]);
      try {
          const analysis = await getYouthPotentialAnalysis(player);
          setAiInsights(prev => ({ ...prev, [player.id]: analysis }));
      } catch (e) {
          console.error(e);
      } finally {
          setAnalyzingIds(prev => prev.filter(id => id !== player.id));
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
        {/* Header Section */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <i className="fa-solid fa-graduation-cap text-3xl text-yellow-400"></i>
                    <h2 className="text-3xl font-black uppercase tracking-tight">Académie Jeunes</h2>
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-md">
                    Détectez et formez les stars de demain (dès 6 ans).
                </p>
                <div className="flex gap-2 mt-4">
                    <button onClick={() => setActiveTab('roster')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'roster' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400'}`}>Effectif</button>
                    <button onClick={() => setActiveTab('competitions')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'competitions' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400'}`}>Filière Compétition</button>
                </div>
            </div>
            {activeTab === 'roster' && (
                <div className="relative z-10 flex flex-col items-end gap-3">
                    <div className="text-right">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Coût Détection</span>
                        <p className="text-xl font-black text-white">{DETECTION_COST}€</p>
                    </div>
                    <button 
                        onClick={handleScout}
                        disabled={isScouting || budget < DETECTION_COST}
                        className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 ${isScouting ? 'bg-slate-700 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 shadow-lg hover:scale-105'}`}
                    >
                        {isScouting ? <><i className="fa-solid fa-spinner fa-spin"></i> Recherche...</> : <><i className="fa-solid fa-binoculars"></i> Lancer une détection</>}
                    </button>
                </div>
            )}
            
            {/* Decoration */}
            <div className="absolute -bottom-10 -right-10 opacity-10 pointer-events-none">
                <i className="fa-solid fa-child-reaching text-[12rem]"></i>
            </div>
        </div>

        {trainingMsg && (
            <div className="bg-green-100 text-green-700 px-6 py-3 rounded-xl text-center font-black text-xs animate-pulse border border-green-200">
                <i className="fa-solid fa-check-circle mr-2"></i>
                {trainingMsg}
            </div>
        )}

        {activeTab === 'roster' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {youthPlayers.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-4 border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <i className="fa-solid fa-school text-3xl"></i>
                        </div>
                        <p className="text-slate-400 font-black uppercase tracking-widest">Aucun jeune en formation</p>
                        <p className="text-slate-300 text-xs mt-2">Lancez une détection pour trouver des talents.</p>
                    </div>
                ) : (
                    youthPlayers.map(p => {
                        const insight = aiInsights[p.id];
                        const isAnalyzing = analyzingIds.includes(p.id);

                        return (
                            <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <img src={p.photoUrl} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-50" alt="" />
                                        <div>
                                            <h4 className="font-black text-slate-900 uppercase text-sm">{p.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-black uppercase">{p.category}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">{p.age} ans</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setEditingYouth(p)}
                                        className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white flex items-center justify-center transition-all"
                                    >
                                        <i className="fa-solid fa-pen text-[10px]"></i>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-slate-50 p-2 rounded-xl text-center">
                                        <span className="block text-[8px] font-black uppercase text-slate-400">Points</span>
                                        <span className="block text-lg font-black text-slate-900">{Math.round(p.points)}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-xl text-center">
                                        <span className="block text-[8px] font-black uppercase text-slate-400">Technique</span>
                                        <span className="block text-[9px] font-black text-purple-600 uppercase mt-1">{p.stats.technique || 50}</span>
                                    </div>
                                </div>

                                {/* AI Insights Area */}
                                <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100 mb-4 min-h-[80px] relative">
                                    {isAnalyzing ? (
                                        <div className="flex items-center justify-center h-full text-purple-400 gap-2">
                                            <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                                            <span className="text-[9px] font-black uppercase">Analyse IA...</span>
                                        </div>
                                    ) : insight ? (
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-purple-800"><i className="fa-solid fa-star mr-1"></i> {insight.potential}</p>
                                            <p className="text-[9px] font-bold text-purple-600"><i className="fa-solid fa-trophy mr-1"></i> {insight.competitionSuggestion}</p>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleAnalyze(p)}
                                            className="w-full h-full flex flex-col items-center justify-center text-purple-400 hover:text-purple-600 transition-colors"
                                        >
                                            <i className="fa-solid fa-wand-magic-sparkles text-lg mb-1"></i>
                                            <span className="text-[9px] font-black uppercase">Analyser Potentiel</span>
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <button 
                                        onClick={() => triggerTraining(p, 'basic')}
                                        disabled={budget < BASIC_TRAINING_COST}
                                        className="py-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-black uppercase text-[8px] hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                                        title="Entraînement Technique (+Stats)"
                                    >
                                        <i className="fa-solid fa-table-tennis-paddle-ball text-sm"></i>
                                        <span>Entraînement ({BASIC_TRAINING_COST}€)</span>
                                    </button>
                                    <button 
                                        onClick={() => triggerTraining(p, 'stage')}
                                        disabled={budget < STAGE_COST}
                                        className="py-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-black uppercase text-[8px] hover:bg-slate-50 hover:border-purple-300 hover:text-purple-600 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                                        title="Stage Intensif (+XP, +Stats)"
                                    >
                                        <i className="fa-solid fa-plane-departure text-sm"></i>
                                        <span>Stage ({STAGE_COST}€)</span>
                                    </button>
                                </div>

                                <button 
                                    onClick={() => onSignPlayer(p)}
                                    className="w-full py-3 mb-2 rounded-xl bg-slate-900 text-white font-black uppercase text-[9px] hover:bg-green-600 transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-signature"></i> Signer Pro
                                </button>
                                
                                <button 
                                    onClick={() => onRemovePlayer(p.id)}
                                    className="w-full py-2 rounded-lg text-red-300 font-black uppercase text-[8px] hover:text-red-500 transition-all"
                                >
                                    Renvoyer du centre
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        )}

        {activeTab === 'competitions' && (
            <div className="space-y-8">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-[2.5rem] border border-blue-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Championnat Jeunes par Équipes</h3>
                        <p className="text-xs text-slate-500 mb-6 max-w-2xl">
                            La compétition reine pour former vos jeunes. Formule <b>Coupe Davis</b> (2 Joueurs : 4 Simples + 1 Double).
                            Structure pyramidale à 4 niveaux.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {teamYouthCompetitions.map(comp => (
                                <div key={comp.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded text-white ${
                                            comp.id.includes('niv1') ? 'bg-purple-600' :
                                            comp.id.includes('niv2') ? 'bg-blue-600' :
                                            comp.id.includes('niv3') ? 'bg-green-600' : 'bg-slate-500'
                                        }`}>
                                            {comp.name.split(' - ')[1] || 'Niveau ?'}
                                        </span>
                                        <i className="fa-solid fa-users text-slate-300"></i>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                                        {comp.minPoints ? `> ${comp.minPoints} pts` : '< 550 pts'}
                                    </p>
                                    <div className="mt-auto pt-2">
                                        <span className="block text-[8px] font-black text-slate-300 uppercase tracking-widest text-right">Inscription via Ligue</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Background Icon */}
                    <div className="absolute -right-6 -bottom-6 opacity-5">
                        <i className="fa-solid fa-trophy text-[10rem]"></i>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 px-2">Autres Compétitions Jeunes</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {otherYouthCompetitions.map(comp => (
                            <div key={comp.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center group hover:border-blue-300 transition-all">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black uppercase">{comp.level}</span>
                                        <h4 className="font-black text-slate-900 text-sm uppercase">{comp.name}</h4>
                                    </div>
                                    <p className="text-xs text-slate-500">{comp.description}</p>
                                    <div className="flex gap-4 mt-2">
                                        {comp.maxPoints && <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 rounded">Max {comp.maxPoints} pts</span>}
                                        {comp.teamSize && <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 rounded">Équipe de {comp.teamSize}</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase">{comp.date}</span>
                                    <span className="block text-xl font-black text-slate-900">{comp.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {editingYouth && (
            <EditPlayerModal 
                player={editingYouth} 
                isOpen={!!editingYouth} 
                onClose={() => setEditingYouth(null)} 
                onUpdate={(updated) => {
                    onUpdatePlayer(updated);
                    setEditingYouth(null);
                }} 
            />
        )}
    </div>
  );
};

export default YouthAcademy;