
import React, { useState } from 'react';
import { Player, Club } from '../types';

interface StatisticsTabProps {
  players: Player[];
  club?: Club;
}

const StatisticsTab: React.FC<StatisticsTabProps> = ({ players, club }) => {
  const [filter, setFilter] = useState<'points' | 'winrate' | 'activity'>('points');
  const [showHistory, setShowHistory] = useState(false);

  const getSortedPlayers = () => {
    return [...players].sort((a, b) => {
      if (filter === 'points') return b.points - a.points;
      if (filter === 'winrate') {
        const rateA = a.careerStats.wins / (a.careerStats.wins + a.careerStats.losses || 1);
        const rateB = b.careerStats.wins / (b.careerStats.wins + b.careerStats.losses || 1);
        return rateB - rateA;
      }
      if (filter === 'activity') {
        return (b.careerStats.wins + b.careerStats.losses) - (a.careerStats.wins + a.careerStats.losses);
      }
      return 0;
    });
  };

  const topScorer = [...players].sort((a,b) => b.points - a.points)[0];
  const mostActive = [...players].sort((a,b) => (b.careerStats.wins + b.careerStats.losses) - (a.careerStats.wins + a.careerStats.losses))[0];
  const bestPerf = [...players].sort((a,b) => b.careerStats.bestPerf - a.careerStats.bestPerf)[0];

  // Extraction de tous les trophées gagnés
  const allTrophies = club?.history?.flatMap(h => h.trophies || []) || [];

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Statistiques du Club</h2>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Performances individuelles et records</p>
        </div>
        {club && club.history && club.history.length > 0 && (
            <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${showHistory ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50'}`}
            >
                {showHistory ? 'Retour Stats' : 'Voir Palmarès'}
            </button>
        )}
      </div>

      {showHistory && club ? (
          <div className="space-y-8">
              
              {/* Armoire à Trophées */}
              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                      <i className="fa-solid fa-trophy text-9xl"></i>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-widest mb-6 border-b border-white/10 pb-4">Armoire à Trophées</h3>
                  {allTrophies.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {allTrophies.map((trophy, idx) => (
                              <div key={idx} className="bg-white/10 p-4 rounded-2xl backdrop-blur-md flex flex-col items-center text-center animate-in zoom-in duration-300 border border-white/10">
                                  <i className="fa-solid fa-trophy text-yellow-400 text-3xl mb-2 drop-shadow-lg"></i>
                                  <span className="text-[10px] font-black uppercase tracking-tight">{trophy}</span>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="text-center py-8">
                          <p className="text-white/40 font-bold text-sm uppercase">Aucun trophée majeur pour le moment.</p>
                          <p className="text-white/20 text-xs">Continuez à jouer pour remplir cette armoire !</p>
                      </div>
                  )}
              </div>

              {/* Historique Saisons */}
              {club.history.slice().reverse().map((season) => (
                  <div key={season.seasonId} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                      <div className="flex justify-between items-end border-b border-slate-100 pb-4 mb-6">
                          <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Archives</p>
                              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Saison {season.yearLabel}</h3>
                          </div>
                          <div className="text-right">
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget Final</span>
                              <span className="text-xl font-black text-green-600">{season.finalBudget}€</span>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                          <div className="lg:col-span-8 space-y-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 p-2 rounded-lg inline-block">Bilan Sportif</p>
                              {season.teamResults.map(res => (
                                  <div key={res.teamNumber} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                      <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center font-black text-slate-600">E{res.teamNumber}</div>
                                          <div>
                                              <span className="block font-black text-slate-900 text-sm">{res.division}</span>
                                              <span className="text-[10px] text-slate-500 font-bold uppercase">{res.wins} Victoires - {res.losses} Défaites</span>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <span className={`block text-lg font-black ${res.rank === 1 ? 'text-yellow-600' : 'text-slate-900'}`}>
                                              {res.rank}{res.rank === 1 ? 'er' : 'ème'}
                                          </span>
                                          {res.rank === 1 && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-black uppercase">Champion</span>}
                                      </div>
                                  </div>
                              ))}
                          </div>
                          
                          <div className="lg:col-span-4 flex flex-col gap-4">
                              <div className="bg-blue-50 p-6 rounded-3xl flex flex-col items-center text-center h-full justify-center">
                                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm mb-3">
                                      <i className="fa-solid fa-star"></i>
                                  </div>
                                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">MVP Saison</p>
                                  <p className="text-xl font-black text-blue-900">{season.topScorerName}</p>
                                  <p className="text-sm font-bold text-blue-600">{season.topScorerPoints} pts</p>
                              </div>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      ) : (
        <>
            {/* Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400 opacity-10 rounded-bl-[4rem]"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Numéro 1</p>
                {topScorer ? (
                    <div className="flex items-center gap-4">
                    <img src={topScorer.photoUrl} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                    <div>
                        <p className="text-xl font-black text-slate-900">{topScorer.name}</p>
                        <p className="text-yellow-600 font-black">{Math.round(topScorer.points)} pts</p>
                    </div>
                    </div>
                ) : <p>-</p>}
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400 opacity-10 rounded-bl-[4rem]"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Le Stakhanoviste</p>
                {mostActive ? (
                    <div className="flex items-center gap-4">
                    <img src={mostActive.photoUrl} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                    <div>
                        <p className="text-xl font-black text-slate-900">{mostActive.name}</p>
                        <p className="text-blue-600 font-black">{mostActive.careerStats.wins + mostActive.careerStats.losses} Matchs</p>
                    </div>
                    </div>
                ) : <p>-</p>}
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-400 opacity-10 rounded-bl-[4rem]"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Plus Grosse Perf</p>
                {bestPerf && bestPerf.careerStats.bestPerf > 0 ? (
                    <div className="flex items-center gap-4">
                    <img src={bestPerf.photoUrl} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                    <div>
                        <p className="text-xl font-black text-slate-900">{bestPerf.name}</p>
                        <p className="text-green-600 font-black">+{bestPerf.careerStats.bestPerf} pts</p>
                    </div>
                    </div>
                ) : <p className="text-sm font-bold text-slate-400">Aucune perf notable</p>}
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6">
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button onClick={() => setFilter('points')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'points' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>Classement Points</button>
                <button onClick={() => setFilter('winrate')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'winrate' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>% Victoires</button>
                <button onClick={() => setFilter('activity')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'activity' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>Activité</button>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="text-[10px] uppercase font-black text-slate-400 text-left border-b border-slate-100">
                        <th className="pb-4 pl-4">Rang</th>
                        <th className="pb-4">Joueur</th>
                        <th className="pb-4 text-center">Style</th>
                        <th className="pb-4 text-center">Points</th>
                        <th className="pb-4 text-center">Matchs</th>
                        <th className="pb-4 text-center">Victoires</th>
                        <th className="pb-4 text-center">Ratio</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                    {getSortedPlayers().map((p, idx) => {
                        const total = p.careerStats.wins + p.careerStats.losses;
                        const ratio = total > 0 ? Math.round((p.careerStats.wins / total) * 100) : 0;
                        return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 pl-4 font-black text-slate-300 w-12">{idx + 1}</td>
                            <td className="py-4">
                            <div className="flex items-center gap-3">
                                <img src={p.photoUrl} className="w-8 h-8 rounded-full border" alt="" />
                                <span className="font-bold text-slate-900">{p.name}</span>
                            </div>
                            </td>
                            <td className="py-4 text-center"><span className="text-[9px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold uppercase">{p.style}</span></td>
                            <td className="py-4 text-center font-black text-slate-900">{Math.round(p.points)}</td>
                            <td className="py-4 text-center font-medium text-slate-500">{total}</td>
                            <td className="py-4 text-center font-medium text-green-600">{p.careerStats.wins}</td>
                            <td className="py-4 text-center font-black">
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${ratio > 50 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${ratio}%` }}></div>
                                </div>
                                <span className="text-xs">{ratio}%</span>
                            </div>
                            </td>
                        </tr>
                        );
                    })}
                    </tbody>
                </table>
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default StatisticsTab;
