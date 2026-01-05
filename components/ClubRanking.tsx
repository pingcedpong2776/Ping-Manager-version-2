
import React from 'react';
import { Player } from '../types';

interface ClubRankingProps {
  players: Player[];
}

const ClubRanking: React.FC<ClubRankingProps> = ({ players }) => {
  // Tri des joueurs par points décroissants
  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col">
      <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
        <div>
           <h3 className="font-black uppercase text-sm tracking-widest">Classement Club</h3>
           <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Interne - Points FFTT</p>
        </div>
        <i className="fa-solid fa-ranking-star text-xl text-yellow-400"></i>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[9px] text-slate-400 uppercase font-black text-left">
              <th className="pb-3 pl-3">Rang</th>
              <th className="pb-3">Joueur</th>
              <th className="pb-3 text-right">Vic./Déf.</th>
              <th className="pb-3 pr-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <tr key={player.id} className="group hover:bg-slate-50 transition-colors rounded-xl">
                <td className="py-3 pl-3 font-black text-slate-900 w-10">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full ${index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
                    {index + 1}
                  </span>
                </td>
                <td className="py-3 font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <img src={player.photoUrl} className="w-6 h-6 rounded-full border border-slate-200" alt="" />
                    <span className="truncate max-w-[100px] md:max-w-full">{player.name}</span>
                  </div>
                </td>
                <td className="py-3 text-right font-medium text-slate-400">
                  {player.careerStats.wins} / {player.careerStats.losses}
                </td>
                <td className="py-3 pr-3 text-right">
                  <span className="font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                    {Math.round(player.points)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClubRanking;
