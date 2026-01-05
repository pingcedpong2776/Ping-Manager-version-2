
import React from 'react';
import { RankingEntry } from '../types';

interface LeagueTableProps {
  rankings: RankingEntry[];
  title?: string;
}

const LeagueTable: React.FC<LeagueTableProps> = ({ rankings, title = "Classement" }) => {
  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">{title}</h3>
        <span className="text-[9px] bg-blue-600 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest animate-pulse">LIVE</span>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-[11px]">
          <thead className="text-[9px] font-black text-slate-400 uppercase bg-slate-50/50">
            <tr>
              <th className="px-4 py-4 text-center w-10">#</th>
              <th className="px-4 py-4 text-left min-w-[140px]">Club</th>
              <th className="px-2 py-4 text-center" title="Joués">J</th>
              <th className="px-2 py-4 text-center text-green-600" title="Victoires">V</th>
              <th className="px-2 py-4 text-center text-slate-600" title="Nuls">N</th>
              <th className="px-2 py-4 text-center text-red-500" title="Défaites">D</th>
              <th className="px-2 py-4 text-center hidden sm:table-cell" title="Parties Gagnées">pG</th>
              <th className="px-2 py-4 text-center hidden sm:table-cell" title="Parties Perdues">pP</th>
              <th className="px-2 py-4 text-center hidden sm:table-cell" title="Différence">Diff</th>
              <th className="px-4 py-4 text-center">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rankings.map((entry, idx) => {
              const diff = entry.matchesWon - entry.matchesLost;
              return (
                <tr key={entry.clubName} className={`transition-colors ${idx === 0 ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-4 font-black text-slate-900 text-center">{idx + 1}</td>
                  <td className="px-4 py-4 font-black text-slate-900 truncate max-w-[150px] uppercase tracking-tight">{entry.clubName}</td>
                  
                  {/* Stats Matchs */}
                  <td className="px-2 py-4 text-center text-slate-700 font-bold">{entry.played}</td>
                  <td className="px-2 py-4 text-center text-green-600 font-bold">{entry.wins}</td>
                  <td className="px-2 py-4 text-center text-slate-500 font-bold">{entry.draws}</td>
                  <td className="px-2 py-4 text-center text-red-500 font-bold">{entry.losses}</td>
                  
                  {/* Stats Parties (Sets/Matchs individuels) */}
                  <td className="px-2 py-4 text-center text-slate-400 font-medium hidden sm:table-cell">{entry.matchesWon}</td>
                  <td className="px-2 py-4 text-center text-slate-400 font-medium hidden sm:table-cell">{entry.matchesLost}</td>
                  <td className={`px-2 py-4 text-center font-bold hidden sm:table-cell ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </td>

                  {/* Points */}
                  <td className="px-4 py-4 text-center">
                    <span className="font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                        {entry.points}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeagueTable;
