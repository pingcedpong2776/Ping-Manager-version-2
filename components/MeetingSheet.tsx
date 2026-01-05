
import React from 'react';
import { Meeting, Club, Player } from '../types';
import ClubLogo from './ClubLogo';

interface MeetingSheetProps {
  meeting: Meeting;
  homeClub: Club;
  awayClub: Club;
  homePlayers: Player[];
  awayPlayers: Player[];
}

const MeetingSheet: React.FC<MeetingSheetProps> = ({ meeting, homeClub, awayClub, homePlayers, awayPlayers }) => {
  // Fonction de fallback améliorée pour trouver les joueurs même s'ils ne sont pas dans les listes principales
  const getPlayerData = (id: string) => {
    let p = [...homePlayers, ...awayPlayers].find(x => x.id === id);
    if (!p) {
       // On essaie de chercher dans l'effectif complet des clubs
       const fromHome = homeClub.players.find(x => x.id === id);
       const fromAway = awayClub.players.find(x => x.id === id);
       
       // Si c'est un amical avec des données générées
       let fromFriendly = null;
       if (meeting.friendlyData && meeting.friendlyData.advPlayers) {
           fromFriendly = meeting.friendlyData.advPlayers.find(x => x.id === id);
       }

       p = fromHome || fromAway || fromFriendly;
    }
    if (!p) {
       return { name: "Joueur Inconnu", points: 500 } as Player;
    }
    return p;
  };

  // Récupération des 4 joueurs de la compo d'équipe (s'ils existent)
  const homeCompo = meeting.homePlayers.slice(0, 4).map(id => getPlayerData(id));
  const awayCompo = meeting.awayPlayers.slice(0, 4).map(id => getPlayerData(id));
  const homeLabels = ['A', 'B', 'C', 'D'];
  const awayLabels = ['W', 'X', 'Y', 'Z'];

  const isDouble = (idx: number) => idx === 8 || idx === 9;

  const renderPointChange = (calculation: { gain: number, loss: number } | undefined, isWinner: boolean) => {
    if (!calculation) return null;
    const value = isWinner ? calculation.gain : calculation.loss; // loss est déjà négatif dans la simulation
    if (value === 0) return null;
    
    // Le 'loss' venant de simulationService est négatif (ex: -5), donc on l'affiche directement
    return (
        <span className={`text-[9px] font-black flex items-center gap-0.5 ml-1.5 ${isWinner ? 'text-green-600' : 'text-red-500'}`}>
            <i className={`fa-solid ${isWinner ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
            {value > 0 ? `+${value}` : value}
        </span>
    );
  };

  const renderMatchParticipants = (match: any, matchIdx: number, side: 'home' | 'away', isWinner: boolean) => {
    const playerIds = side === 'home' ? meeting.homePlayers : meeting.awayPlayers;
    const labels = side === 'home' ? ['A', 'B', 'C', 'D'] : ['W', 'X', 'Y', 'Z'];
    const textColor = isWinner ? 'text-green-700' : 'text-black';
    const subTextColor = isWinner ? 'text-green-600/70' : 'text-slate-500';
    
    const playerSideEvents = match.events?.filter((e: string) => {
        const pId = side === 'home' ? match.playerAId : match.playerBId;
        const pName = getPlayerData(pId)?.name;
        return pName && e.includes(pName);
    }) || [];

    if (matchIdx === 8) {
      const p1 = getPlayerData(playerIds[2]);
      const p2 = getPlayerData(playerIds[3]);
      const avg = Math.round(((p1?.points || 0) + (p2?.points || 0)) / 2);
      return (
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-black flex items-center justify-center text-[8px] font-black text-white">{labels[2]}</span>
            <span className={`truncate font-bold text-[11px] ${textColor}`}>{p1?.name || 'Joueur C'} <span className={subTextColor}>({p1?.points || '?'} pts)</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-black flex items-center justify-center text-[8px] font-black text-white">{labels[3]}</span>
            <span className={`truncate font-bold text-[11px] ${textColor}`}>{p2?.name || 'Joueur D'} <span className={subTextColor}>({p2?.points || '?'} pts)</span></span>
          </div>
          <div className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ml-6 ${textColor} flex items-center`}>
            Paire : {avg} pts
            {renderPointChange(match.pointCalculation, isWinner)}
          </div>
        </div>
      );
    }
    
    if (matchIdx === 9) {
      const p1 = getPlayerData(playerIds[0]);
      const p2 = getPlayerData(playerIds[1]);
      const avg = Math.round(((p1?.points || 0) + (p2?.points || 0)) / 2);
      return (
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-black flex items-center justify-center text-[8px] font-black text-white">{labels[0]}</span>
            <span className={`truncate font-bold text-[11px] ${textColor}`}>{p1?.name || 'Joueur A'} <span className={subTextColor}>({p1?.points || '?'} pts)</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-black flex items-center justify-center text-[8px] font-black text-white">{labels[1]}</span>
            <span className={`truncate font-bold text-[11px] ${textColor}`}>{p2?.name || 'Joueur B'} <span className={subTextColor}>({p2?.points || '?'} pts)</span></span>
          </div>
          <div className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ml-6 ${textColor} flex items-center`}>
            Paire : {avg} pts
            {renderPointChange(match.pointCalculation, isWinner)}
          </div>
        </div>
      );
    }

    const pId = side === 'home' ? match.playerAId : match.playerBId;
    const p = getPlayerData(pId);
    const pIdx = playerIds.indexOf(pId);
    
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
            {pIdx !== -1 && (
            <span className="w-4 h-4 rounded bg-black flex items-center justify-center text-[8px] font-black text-white">
                {labels[pIdx]}
            </span>
            )}
            <span className={`truncate font-bold text-xs ${textColor}`}>{p ? `${p.name} (${Math.round(p.points)} pts)` : 'Inconnu'}</span>
            {renderPointChange(match.pointCalculation, isWinner)}
        </div>
        {playerSideEvents.length > 0 && (
            <div className="ml-7 mt-1 flex flex-col gap-0.5">
                {playerSideEvents.map((evt: string, i: number) => (
                    <span key={i} className="text-[8px] text-red-500 font-bold flex items-center gap-1">
                        <i className="fa-solid fa-triangle-exclamation"></i> {evt.replace(p.name, '').trim()}
                    </span>
                ))}
            </div>
        )}
      </div>
    );
  };

  const getSetDisplay = (matchIndex: number) => {
    const match = meeting.matches[matchIndex];
    if (!match) return '-';
    let setsA = 0;
    let setsB = 0;
    match.sets.forEach(s => {
      if (s.scoreA > s.scoreB) setsA++;
      else setsB++;
    });
    return (
      <div className="flex flex-col items-center">
        <span className="text-sm font-black text-black">{setsA} - {setsB}</span>
        <div className="flex gap-1 mt-1">
          {match.sets.map((s, idx) => (
            <span key={idx} className="text-[9px] text-black bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 font-bold">
              {s.scoreA}:{s.scoreB}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const homeWin = meeting.homeScore > meeting.awayScore;
  const awayWin = meeting.awayScore > meeting.homeScore;

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-black animate-in zoom-in-95 duration-300">
      <div className="bg-black p-8 text-white flex items-center justify-between">
        <div className="flex items-center gap-6">
          <ClubLogo primaryColor={homeClub.primaryColor} secondaryColor={homeClub.secondaryColor} size="md" clubName={homeClub.name} />
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight leading-tight text-white">Feuille de Match FFTT</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-white font-black text-[10px] uppercase tracking-widest">{meeting.divisionName}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-200 font-bold text-[10px] uppercase">{meeting.date}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
           <span className="bg-white text-black px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white">Officiel</span>
        </div>
      </div>

      <div className="flex items-stretch text-center border-b border-black">
        <div className={`flex-1 p-8 ${homeWin ? 'bg-green-50' : 'bg-gray-50'}`}>
          <p className="text-[10px] text-black font-black uppercase tracking-[0.2em] mb-2">Domicile</p>
          <h3 className={`text-xl font-black line-clamp-1 ${homeWin ? 'text-green-800' : 'text-black'}`}>{homeClub.name}</h3>
          <div className={`mt-4 text-6xl font-black drop-shadow-sm ${homeWin ? 'text-green-600' : 'text-black'}`}>{meeting.homeScore}</div>
        </div>
        <div className="flex items-center px-6 bg-white border-x border-black">
          <span className="text-lg font-black text-black italic">VS</span>
        </div>
        <div className={`flex-1 p-8 ${awayWin ? 'bg-green-50' : 'bg-gray-50'}`}>
          <p className="text-[10px] text-black font-black uppercase tracking-[0.2em] mb-2">Extérieur</p>
          <h3 className={`text-xl font-black line-clamp-1 ${awayWin ? 'text-green-800' : 'text-black'}`}>{awayClub.name}</h3>
          <div className={`mt-4 text-6xl font-black drop-shadow-sm ${awayWin ? 'text-green-600' : 'text-black'}`}>{meeting.awayScore}</div>
        </div>
      </div>
      
      {/* Composition des Équipes (4 Joueurs Sélectionnés) */}
      <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200">
         <div className="p-6 border-r border-slate-200">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Composition {homeClub.name}</h4>
            <div className="space-y-2">
                {homeCompo.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-black text-white rounded flex items-center justify-center text-[10px] font-black">
                                {homeLabels[idx]}
                            </span>
                            <span className="text-xs font-black text-slate-900">{p?.name || 'Absent'}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{Math.round(p?.points || 500)} pts</span>
                    </div>
                ))}
            </div>
         </div>
         <div className="p-6">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Composition {awayClub.name}</h4>
            <div className="space-y-2">
                {awayCompo.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-black text-white rounded flex items-center justify-center text-[10px] font-black">
                                {awayLabels[idx]}
                            </span>
                            <span className="text-xs font-black text-slate-900">{p?.name || 'Absent'}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{Math.round(p?.points || 500)} pts</span>
                    </div>
                ))}
            </div>
         </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-black text-white border-b border-black uppercase text-[10px] font-black">
            <tr>
              <th className="px-6 py-4 text-center w-12 italic text-white">N°</th>
              <th className="px-6 py-4 text-left text-white">Joueur(s) Domicile</th>
              <th className="px-6 py-4 text-left text-white">Joueur(s) Extérieur</th>
              <th className="px-6 py-4 text-center text-white">Score</th>
              <th className="px-6 py-4 text-center text-white">Résultat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {meeting.matches.map((match, idx) => {
              const isHomeWinner = match.winnerId === match.playerAId;
              const isMatchDouble = isDouble(idx);
              const rowClass = isHomeWinner ? (isMatchDouble ? 'bg-green-50/50' : 'bg-green-50/30') : (isMatchDouble ? 'bg-gray-50' : 'bg-white');
              
              return (
                <tr key={idx} className={`hover:bg-gray-100 transition-colors ${rowClass}`}>
                  <td className="px-6 py-4 text-black font-black text-center border-r border-gray-100">{idx + 1}</td>
                  <td className={`px-6 py-4 border-r border-gray-100 ${isHomeWinner ? 'bg-green-100/30' : ''}`}>
                    {renderMatchParticipants(match, idx, 'home', isHomeWinner)}
                  </td>
                  <td className={`px-6 py-4 border-r border-gray-100 ${!isHomeWinner ? 'bg-green-100/30' : ''}`}>
                    {renderMatchParticipants(match, idx, 'away', !isHomeWinner)}
                  </td>
                  <td className="px-6 py-4 text-center font-black text-black bg-gray-50 border-r border-gray-100">
                    {getSetDisplay(idx)}
                  </td>
                  <td className="px-6 py-4 text-center">
                     <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center text-[10px] font-black border-2 ${isHomeWinner ? 'bg-black text-white border-black' : 'bg-white text-black border-black'}`}>
                        {isHomeWinner ? 'V' : 'D'}
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

export default MeetingSheet;
