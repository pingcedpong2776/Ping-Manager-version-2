
import React, { useState, useEffect } from 'react';
import { Club, Competition, Meeting, Player } from '../types';
import { getAICompetitionSuggestion, getAICompetitionReport } from '../services/geminiService';
import { simulateInternalTournament } from '../services/simulationService';
import LeagueTable from './LeagueTable';
import { RankingEntry } from '../types';

interface CompetitionsTabProps {
  club: Club;
  competitions: Competition[];
  onRegister: (compId: string, playerIds: string[]) => void;
  onSimulate: (compId: string) => void;
  teamRankings: Record<number, RankingEntry[]>;
  onUpdateDivision?: (teamNum: number, newName: string) => void;
  allMeetings: Meeting[];
  currentPhase: number;
}

const CompetitionsTab: React.FC<CompetitionsTabProps> = ({ 
    club, 
    competitions, 
    onRegister, 
    onSimulate, 
    teamRankings, 
    onUpdateDivision,
    allMeetings,
    currentPhase
}) => {
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  
  // Nouveau state pour gérer les équipes multiples (Ex: 3 équipes de 2 joueurs)
  // [ ["id1", "id2"], ["id3", "id4"] ]
  const [teamComposition, setTeamComposition] = useState<string[][]>([[]]);

  const [viewMode, setViewMode] = useState<'league' | 'tournaments'>('league');
  const [filterStatus, setFilterStatus] = useState<'upcoming' | 'finished'>('upcoming');
  const [selectedLeagueTeam, setSelectedLeagueTeam] = useState(1);
  const [isEditingLeague, setIsEditingLeague] = useState(false);
  const [editLeagueName, setEditLeagueName] = useState('');
  const [leagueViewType, setLeagueViewType] = useState<'ranking' | 'calendar'>('ranking');
  
  const [aiSuggestion, setAiSuggestion] = useState<{ playerIds: string[], reason: string } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [expandedResultsId, setExpandedResultsId] = useState<string | null>(null);
  const [internalTournamentResult, setInternalTournamentResult] = useState<{ rank: number, player: Player, wins: number }[] | null>(null);
  
  const [aiReports, setAiReports] = useState<Record<string, string>>({});
  const [isReportLoading, setIsReportLoading] = useState<string | null>(null);

  const activeComp = competitions.find(c => c.id === selectedCompId);
  const availablePlayers = club.players.sort((a,b) => b.points - a.points);

  useEffect(() => {
    // Reset selection logic when opening modal
    if (activeComp) {
        // Pré-chargement des inscriptions existantes
        if (activeComp.registeredPlayerIds.length > 0) {
            setSelectedPlayerIds(activeComp.registeredPlayerIds);
            
            // Si c'est une compétition par équipes, on reconstruit les bacs
            if (activeComp.teamSize && activeComp.teamSize > 1) {
                const size = activeComp.teamSize;
                const teams: string[][] = [];
                for (let i = 0; i < activeComp.registeredPlayerIds.length; i += size) {
                    teams.push(activeComp.registeredPlayerIds.slice(i, i + size));
                }
                
                // Si c'est le champ jeunes (multi-équipes), on ajoute un bac vide à la fin pour continuer à ajouter
                if (activeComp.name.includes("Champ. Jeunes")) {
                    teams.push([]);
                }
                
                setTeamComposition(teams);
            } else {
                setTeamComposition([[]]); 
            }
        } else {
            // Pas d'inscription, reset total
            setSelectedPlayerIds([]);
            setTeamComposition([[]]); 
            
            // Auto-select logic for Criterium continuation (unchanged)
            if (activeComp.name.includes("Critérium") && activeComp.id !== 'crit-fed-t1') {
                const roundNum = parseInt(activeComp.id.slice(-1));
                const prevRoundId = `crit-fed-t${roundNum - 1}`;
                const prevComp = competitions.find(c => c.id === prevRoundId);
                
                if (prevComp && prevComp.registeredPlayerIds.length > 0) {
                    const validIds = prevComp.registeredPlayerIds.filter(id => club.players.find(p => p.id === id));
                    setSelectedPlayerIds(validIds);
                }
            }
        }
    }
  }, [selectedCompId, competitions, club.players]); // Removed activeComp from dependency to avoid loop, dependent on selectedCompId change

  const getEligiblePlayers = () => {
      if (!activeComp) return [];
      let eligible = availablePlayers;

      // Filtre d'âge pour les compétitions jeunes (maxAge)
      if (activeComp.level === 'Jeunes' || (activeComp.maxAge && activeComp.maxAge <= 18)) {
          eligible = eligible.filter(p => p.age < 18);
      } else if (activeComp.maxAge) {
          eligible = eligible.filter(p => p.age <= activeComp.maxAge!);
      }

      // Filtre d'âge pour les compétitions vétérans (minAge)
      if (activeComp.minAge) {
          eligible = eligible.filter(p => p.age >= activeComp.minAge!);
      }

      if (activeComp.id === 'finales-rank-reg') {
          const depComp = competitions.find(c => c.id === 'finales-rank-dep');
          if (!depComp || !depComp.results) return [];
          const qualifiedIds = depComp.results.filter(r => r.isQualified).map(r => r.playerId);
          return eligible.filter(p => qualifiedIds.includes(p.id));
      }
      if (activeComp.id === 'finales-rank-nat') {
          const regComp = competitions.find(c => c.id === 'finales-rank-reg');
          if (!regComp || !regComp.results) return [];
          const qualifiedIds = regComp.results.filter(r => r.isQualified).map(r => r.playerId);
          return eligible.filter(p => qualifiedIds.includes(p.id));
      }
      return eligible;
  };

  const eligiblePlayersList = getEligiblePlayers();

  const handleTogglePlayer = (id: string, maxSelection: number) => {
    // Cas Tournoi par Équipe (paires définies)
    if (activeComp?.teamSize && activeComp.teamSize > 1) {
        const size = activeComp.teamSize;
        const newCompo = [...teamComposition];
        
        // Check if player is already in a team, if so remove him
        let removed = false;
        newCompo.forEach((team, tIdx) => {
            if (team.includes(id)) {
                newCompo[tIdx] = team.filter(p => p !== id);
                removed = true;
            }
        });

        if (!removed) {
            // Find first team with space
            let added = false;
            for (let i = 0; i < newCompo.length; i++) {
                if (newCompo[i].length < size) {
                    newCompo[i].push(id);
                    added = true;
                    break;
                }
            }
            // If no space, create new team if permitted (e.g. Champ Jeunes allows multiple teams)
            if (!added) {
                // Pour le champ jeunes, on peut ajouter autant d'équipes qu'on veut
                // Pour une Coupe unique, on est limité à 1 équipe normalement, mais on laisse flexible ici
                newCompo.push([id]);
            }
        }
        
        // Clean up empty teams unless it's the only one
        const cleanedCompo = newCompo.filter(t => t.length > 0);
        // Ensure we always have at least one empty bucket at the end for multi-team competitions
        if (activeComp.name.includes("Champ. Jeunes")) {
             // If the last bucket is full, add a new empty one
             if (cleanedCompo.length === 0 || cleanedCompo[cleanedCompo.length-1].length === size) {
                 cleanedCompo.push([]);
             }
        } else {
             // For single team cups, ensure at least one array exists
             if (cleanedCompo.length === 0) cleanedCompo.push([]);
        }

        setTeamComposition(cleanedCompo);
    } else {
        // Cas Individuel Standard
        if (selectedPlayerIds.includes(id)) {
            setSelectedPlayerIds(prev => prev.filter(p => p !== id));
        } else {
            if (selectedPlayerIds.length < maxSelection) {
                setSelectedPlayerIds(prev => [...prev, id]);
            }
        }
    }
  };

  const handleRegister = () => {
    if (!activeComp) return;
    
    let finalIds: string[] = [];

    if (activeComp.teamSize && activeComp.teamSize > 1) {
        // Validation des équipes
        // On filtre les équipes incomplètes sauf si c'est le seul bac et qu'il est vide (cas de désinscription totale)
        const validTeams = teamComposition.filter(t => t.length === activeComp.teamSize);
        
        // S'il reste des bouts d'équipe
        const partialTeams = teamComposition.filter(t => t.length > 0 && t.length < activeComp.teamSize!);
        if (partialTeams.length > 0) {
            alert(`Attention : Certaines équipes sont incomplètes. Il faut ${activeComp.teamSize} joueurs par équipe.`);
            return;
        }

        if (validTeams.length === 0 && teamComposition.flat().length > 0) {
             alert("Veuillez former des équipes complètes.");
             return;
        }
        
        finalIds = validTeams.flat();
    } else {
        finalIds = selectedPlayerIds;
    }

    onRegister(activeComp.id, finalIds);
    setSelectedCompId(null);
    setSelectedPlayerIds([]);
    setTeamComposition([[]]);
    setAiSuggestion(null);
  };

  const handleAskIA = async () => {
    if (!activeComp) return;
    setIsAiLoading(true);
    try {
        const suggestion = await getAICompetitionSuggestion(activeComp, eligiblePlayersList);
        setAiSuggestion(suggestion);
        
        if (activeComp.teamSize && activeComp.teamSize > 1) {
            // Chunk the suggestion into teams
            const size = activeComp.teamSize;
            const newTeams: string[][] = [];
            for (let i = 0; i < suggestion.playerIds.length; i += size) {
                newTeams.push(suggestion.playerIds.slice(i, i + size));
            }
            if(activeComp.name.includes("Champ. Jeunes")) newTeams.push([]);
            else if(newTeams.length === 0) newTeams.push([]);
            
            setTeamComposition(newTeams);
        } else {
            setSelectedPlayerIds(suggestion.playerIds);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleGenerateReport = async (comp: Competition) => {
      if (!comp.results) return;
      setIsReportLoading(comp.id);
      try {
          const report = await getAICompetitionReport(comp, comp.results);
          setAiReports(prev => ({ ...prev, [comp.id]: report }));
      } catch (e) {
          console.error(e);
      } finally {
          setIsReportLoading(null);
      }
  };

  const handleLaunchInternalTournament = () => {
      const result = simulateInternalTournament(club.players);
      setInternalTournamentResult(result);
  };

  const filteredCompetitions = competitions.filter(c => 
    filterStatus === 'upcoming' ? c.status !== 'Terminé' : c.status === 'Terminé'
  );

  const leagueMeetings = allMeetings.filter(m => m.teamNumber === selectedLeagueTeam && m.phaseId === currentPhase && m.type !== 'FRIENDLY');
  
  const meetingsByDay = leagueMeetings.reduce((acc, m) => {
      let day = 'Inconnu';
      if (m.dayNumber !== undefined) {
          day = m.dayNumber.toString();
      } else {
          const parts = m.id.split('-');
          if (parts.length >= 3 && parts[0] === 'league') {
              day = parts[2];
          }
      }
      
      if(!acc[day]) acc[day] = [];
      acc[day].push(m);
      return acc;
  }, {} as Record<string, Meeting[]>);
  
  const sortedDays = Object.keys(meetingsByDay).sort((a, b) => {
      if (a === 'Inconnu') return 1;
      if (b === 'Inconnu') return -1;
      return parseInt(a) - parseInt(b);
  });

  const handleSaveDivisionName = () => {
      if(onUpdateDivision && editLeagueName.trim()) {
          onUpdateDivision(selectedLeagueTeam, editLeagueName);
          setIsEditingLeague(false);
      }
  };

  const getRankBadgeColor = (rank: string) => {
      if (rank.includes('Vainqueur') || rank.includes('1er')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      if (rank.includes('Finaliste') || rank.includes('2ème')) return 'bg-gray-100 text-gray-700 border-gray-200';
      if (rank.includes('Demi') || rank.includes('3ème')) return 'bg-orange-50 text-orange-700 border-orange-100';
      if (rank.includes('4ème')) return 'bg-red-50 text-red-700 border-red-100';
      return 'bg-slate-50 text-slate-600 border-slate-100';
  };

  // Helper to check selection status
  const getPlayerSelectionStatus = (pid: string) => {
      if (activeComp?.teamSize && activeComp.teamSize > 1) {
          for (let i = 0; i < teamComposition.length; i++) {
              if (teamComposition[i].includes(pid)) return { selected: true, teamIndex: i };
          }
          return { selected: false, teamIndex: -1 };
      }
      return { selected: selectedPlayerIds.includes(pid), teamIndex: -1 };
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
       <div className="flex justify-center px-4">
          <div className="bg-slate-200 p-1.5 rounded-2xl flex gap-1 shadow-inner">
             <button 
                onClick={() => setViewMode('league')}
                className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'league' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <i className="fa-solid fa-users-rectangle mr-2"></i> Championnat par Équipe
             </button>
             <button 
                onClick={() => setViewMode('tournaments')}
                className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'tournaments' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <i className="fa-solid fa-trophy mr-2"></i> Tournois & Coupes
             </button>
          </div>
       </div>

       {viewMode === 'league' && (
         <div className="px-4 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div><h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Gestion des Ligues</h2><p className="text-xs text-slate-400 font-bold uppercase">Gérez vos championnats et suivez les résultats</p></div>
                <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl">{Array.from({ length: club.teamCount }).map((_, i) => (<button key={i+1} onClick={() => setSelectedLeagueTeam(i+1)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${selectedLeagueTeam === i+1 ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Équipe {i+1}</button>))}</div>
            </div>
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
                 <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
                    <div className="flex items-center gap-3"><div className="bg-slate-900 text-white w-10 h-10 flex items-center justify-center rounded-xl font-black text-lg shadow-lg">{selectedLeagueTeam}</div><div>{isEditingLeague ? (<div className="flex gap-2"><input autoFocus value={editLeagueName} onChange={(e) => setEditLeagueName(e.target.value)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-black uppercase text-lg w-48" /><button onClick={handleSaveDivisionName} className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600"><i className="fa-solid fa-check"></i></button><button onClick={() => setIsEditingLeague(false)} className="w-8 h-8 bg-slate-200 text-slate-500 rounded-lg flex items-center justify-center hover:bg-slate-300"><i className="fa-solid fa-times"></i></button></div>) : (<div className="flex items-center gap-3"><h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">{club.teamDivisions[selectedLeagueTeam]}</h3>{onUpdateDivision && (<button onClick={() => { setEditLeagueName(club.teamDivisions[selectedLeagueTeam]); setIsEditingLeague(true); }} className="w-6 h-6 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-900 hover:text-white transition-colors text-[10px]"><i className="fa-solid fa-pen"></i></button>)}</div>)}<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phase {currentPhase} • Saison 2025/2026</p></div></div>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl"><button onClick={() => setLeagueViewType('ranking')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leagueViewType === 'ranking' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Classement</button><button onClick={() => setLeagueViewType('calendar')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leagueViewType === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Calendrier</button></div>
                 </div>
                 {leagueViewType === 'ranking' ? (<LeagueTable rankings={teamRankings[selectedLeagueTeam]} title={`Classement Équipe ${selectedLeagueTeam}`} />) : (<div className="grid grid-cols-1 gap-4">{sortedDays.length === 0 ? (<div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-100 text-center"><p className="text-slate-400 font-black uppercase">Aucune rencontre planifiée pour cette phase.</p></div>) : (sortedDays.map(day => { const dayMatches = meetingsByDay[day]; return (<div key={day} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm"><div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center"><h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">Journée {day}</h4><span className="text-[10px] font-bold text-slate-400 uppercase">{dayMatches.length} Rencontres</span></div><div className="divide-y divide-slate-50">{dayMatches.map(m => { const isUserMatch = m.homeClubName === club.name || m.awayClubName === club.name; return (<div key={m.id} className={`p-4 flex justify-between items-center ${isUserMatch ? 'bg-blue-50/30' : ''}`}><div className={`text-xs font-black truncate w-1/3 text-right ${m.homeClubName === club.name ? 'text-blue-700' : 'text-slate-700'}`}>{m.homeClubName}</div><div className="px-4"><span className={`px-3 py-1 rounded-lg font-black text-xs ${isUserMatch ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{m.homeScore} - {m.awayScore}</span></div><div className={`text-xs font-black truncate w-1/3 text-left ${m.awayClubName === club.name ? 'text-blue-700' : 'text-slate-700'}`}>{m.awayClubName}</div></div>); })}</div></div>); }))}</div>)}
            </div>
         </div>
       )}

       {viewMode === 'tournaments' && (
         <>
            {/* Tournoi Interne Banner */}
            <div className="px-4 mb-6">
                <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                    <div className="relative z-10"><div className="flex items-center gap-3 mb-2"><i className="fa-solid fa-medal text-yellow-400 text-2xl"></i><h3 className="text-xl font-black uppercase tracking-tight">Tournoi Interne du Club</h3></div><p className="text-xs text-purple-200 opacity-80 font-medium max-w-md">Organisez un tournoi amical avec l'ensemble des joueurs du club.</p></div>
                    <div className="relative z-10"><button onClick={handleLaunchInternalTournament} className="bg-white text-purple-900 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-lg">Lancer le tournoi</button></div>
                    <div className="absolute -right-10 -bottom-10 text-white opacity-5"><i className="fa-solid fa-trophy text-[10rem]"></i></div>
                </div>
            </div>

            {/* Filtre Statut */}
            <div className="px-4 flex justify-between items-center">
               <h3 className="text-lg font-black text-slate-900 uppercase">Calendrier Individuel</h3>
               <div className="flex gap-2">
                  <button onClick={() => setFilterStatus('upcoming')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${filterStatus === 'upcoming' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>En cours / À venir</button>
                  <button onClick={() => setFilterStatus('finished')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${filterStatus === 'finished' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>Terminés</button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 px-4">
                {filteredCompetitions.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
                        <p className="text-slate-300 font-black uppercase">Aucune compétition trouvée</p>
                    </div>
                ) : (
                    filteredCompetitions.map(comp => {
                        const isRegistered = comp.registeredPlayerIds.length > 0;
                        
                        // Calcul du nombre d'équipes pour les compétitions par équipes
                        const registeredTeamCount = (comp.teamSize && comp.teamSize > 1) 
                            ? Math.floor(comp.registeredPlayerIds.length / comp.teamSize) 
                            : 0;

                        return (
                        <div key={comp.id} className={`bg-white rounded-[2.5rem] border p-8 flex flex-col h-full transition-all relative overflow-hidden group animate-in zoom-in-95 ${isRegistered ? 'border-green-500 shadow-xl ring-1 ring-green-100' : 'border-slate-100 shadow-sm hover:border-slate-300'}`}>
                            <div className="absolute top-6 right-6">
                                {comp.status === 'Terminé' ? (
                                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase">Terminé</span>
                                ) : isRegistered ? (
                                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1">
                                        {registeredTeamCount > 0 ? (
                                            <><i className="fa-solid fa-users-viewfinder mr-1"></i> {registeredTeamCount} Équipes</>
                                        ) : (
                                            <><i className="fa-solid fa-check mr-1"></i> Inscrit</>
                                        )}
                                    </span>
                                ) : (
                                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">Ouvert</span>
                                )}
                            </div>

                            <div className="mb-6">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg mb-3 inline-block ${
                                    comp.level === 'National' ? 'bg-red-50 text-red-600' :
                                    comp.level === 'Jeunes' ? 'bg-yellow-50 text-yellow-700' :
                                    comp.level === 'Régional' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
                                }`}>
                                    {comp.level} • {comp.type}
                                </span>
                                <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-2">{comp.name}</h3>
                                <p className="text-xs text-slate-500 leading-snug">{comp.description}</p>
                                <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase"><i className="fa-regular fa-calendar mr-2"></i> {comp.date}</p>
                            </div>

                            <div className="mt-auto pt-6 border-t border-slate-50">
                                {comp.status === 'Terminé' ? (
                                    <div className="bg-slate-50 rounded-2xl p-4">
                                        <button 
                                        onClick={() => setExpandedResultsId(expandedResultsId === comp.id ? null : comp.id)}
                                        className="w-full flex justify-between items-center text-[10px] font-black uppercase text-slate-600 hover:text-slate-900"
                                        >
                                            <span>Voir les résultats ({comp.results?.length || 0})</span>
                                            <i className={`fa-solid fa-chevron-down transition-transform ${expandedResultsId === comp.id ? 'rotate-180' : ''}`}></i>
                                        </button>
                                        
                                        {expandedResultsId === comp.id && (
                                            <div className="mt-3 space-y-4 animate-in slide-in-from-top-2">
                                                {!aiReports[comp.id] && (
                                                    <button onClick={() => handleGenerateReport(comp)} disabled={!!isReportLoading} className="w-full py-2 bg-purple-100 text-purple-700 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-purple-200 flex items-center justify-center gap-2">
                                                        {isReportLoading === comp.id ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>} Bilan Juge-Arbitre (IA)
                                                    </button>
                                                )}
                                                {aiReports[comp.id] && (<div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-[10px] text-purple-900 font-medium italic relative"><i className="fa-solid fa-quote-left absolute -top-1 -left-1 text-purple-200 text-xl"></i>{aiReports[comp.id]}</div>)}

                                                {comp.results && comp.results.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {comp.results.sort((a,b) => (a.exactRank || 99) - (b.exactRank || 99)).map((res, idx) => (
                                                            <div key={idx} className="bg-white p-3 rounded-lg border border-slate-100 text-xs shadow-sm flex flex-col gap-1">
                                                                <div className="flex justify-between font-black">
                                                                    <div className="flex flex-col">
                                                                        <span>{res.playerName}</span>
                                                                        {res.partnerName && <span className="text-[9px] text-slate-400 font-normal">+ {res.partnerName}</span>}
                                                                    </div>
                                                                    <span className="text-slate-400">{res.playerPoints} pts</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-[10px] uppercase mt-1">
                                                                    <span className={`px-2 py-0.5 rounded border font-bold ${getRankBadgeColor(res.rank)}`}>
                                                                        {res.rank}
                                                                    </span>
                                                                    <div className="flex gap-2">
                                                                        <span className={`px-1.5 rounded ${res.pointChange > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                            {res.pointChange > 0 ? '+' : ''}{res.pointChange}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1 mt-1 justify-end">
                                                                    {res.isPromoted && <span className="text-[8px] bg-green-500 text-white px-1.5 rounded font-black uppercase">Montée</span>}
                                                                    {res.isRelegated && <span className="text-[8px] bg-red-500 text-white px-1.5 rounded font-black uppercase">Descente</span>}
                                                                    {res.isQualified && <span className="text-[8px] bg-blue-500 text-white px-1.5 rounded font-black uppercase">Qualifié</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-xs text-slate-400 italic">Aucun résultat enregistré.</p>}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setSelectedCompId(comp.id)}
                                            className={`flex-1 py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all`}
                                        >
                                            {isRegistered ? 'Modifier Inscription' : "S'inscrire"}
                                        </button>
                                        {isRegistered && (
                                            <button 
                                                onClick={() => onSimulate(comp.id)}
                                                className="flex-1 py-4 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg"
                                            >
                                                Simuler
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        );
                    })
                )}
            </div>
         </>
       )}

       {/* Modal Résultats Tournoi Interne - UNCHANGED */}
       {internalTournamentResult && (
           <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
               <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full text-center animate-in zoom-in-95 relative overflow-hidden flex flex-col h-[80vh]">
                   <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500"></div>
                   <h2 className="text-2xl font-black uppercase mb-2 text-slate-900">Résultats du Tournoi</h2>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Compétition Interne</p>
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6 flex-1 overflow-y-auto custom-scrollbar">
                       {Array.isArray(internalTournamentResult) ? (
                           <div className="space-y-2">
                               {internalTournamentResult.map((res, idx) => (
                                   <div key={res.player.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                                       <div className="flex items-center gap-3">
                                           <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black text-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-slate-200 text-slate-500'}`}>{res.rank}</span>
                                           <span className="text-xs font-bold text-slate-900">{res.player.name}</span>
                                       </div>
                                       <span className="text-[10px] font-black text-slate-400 uppercase">{res.wins} Victoires</span>
                                   </div>
                               ))}
                           </div>
                       ) : ( <p>Erreur d'affichage</p> )}
                   </div>
                   <button onClick={() => setInternalTournamentResult(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Fermer</button>
               </div>
           </div>
       )}

       {/* Modal d'inscription */}
       {selectedCompId && activeComp && (
         <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 shadow-2xl">
               <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="font-black uppercase text-sm tracking-widest">Inscription</h3>
                    <p className="text-blue-200 text-xs font-bold uppercase">{activeComp.name}</p>
                  </div>
                  <button onClick={() => { setSelectedCompId(null); setSelectedPlayerIds([]); setTeamComposition([[]]); setAiSuggestion(null); }} className="text-2xl">&times;</button>
               </div>
               
               <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                  {/* AI Section */}
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-purple-800 uppercase tracking-widest flex items-center gap-2"><i className="fa-solid fa-wand-magic-sparkles"></i> Assistant Sportif</span>
                        {aiSuggestion && <span className="text-[9px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded uppercase font-bold">Suggéré</span>}
                     </div>
                     {aiSuggestion ? (<p className="text-xs text-purple-900 italic leading-relaxed">"{aiSuggestion.reason}"</p>) : (<p className="text-xs text-purple-400">Demandez à l'IA d'analyser la forme de vos joueurs pour optimiser la sélection.</p>)}
                     {!aiSuggestion && eligiblePlayersList.length > 0 && (<button onClick={handleAskIA} disabled={isAiLoading} className="mt-3 w-full py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all flex justify-center items-center gap-2">{isAiLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : "Analyser l'effectif"}</button>)}
                  </div>

                  {/* Section de Composition d'Équipes (Si TeamSize > 1) */}
                  {activeComp.teamSize && activeComp.teamSize > 1 && (
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                          <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-3 flex justify-between items-center">
                              <span>Composition des paires ({activeComp.teamSize} joueurs)</span>
                              <span className="text-[9px] bg-white px-2 py-0.5 rounded text-blue-600">{teamComposition.filter(t => t.length === activeComp.teamSize).length} Équipe(s) complète(s)</span>
                          </h4>
                          <div className="space-y-3">
                              {teamComposition.map((team, idx) => (
                                  <div key={idx} className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm relative group">
                                      <div className="flex justify-between items-center mb-2">
                                          <span className="text-[9px] font-black text-slate-400 uppercase">Équipe {idx + 1}</span>
                                          {team.length > 0 && <button onClick={() => { const newC = [...teamComposition]; newC[idx] = []; setTeamComposition(newC); }} className="text-[8px] text-red-400 hover:text-red-600 font-bold uppercase">Vider</button>}
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                          {Array.from({length: activeComp.teamSize || 2}).map((_, slotIdx) => {
                                              const pId = team[slotIdx];
                                              const p = club.players.find(pl => pl.id === pId);
                                              return (
                                                  <div key={slotIdx} className={`h-8 flex-1 rounded-lg border-2 border-dashed flex items-center justify-center text-[10px] font-bold ${p ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>
                                                      {p ? p.name.split(' ')[0] : 'Vide'}
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  <div className="space-y-2 pr-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{eligiblePlayersList.length > 0 ? `Effectif Éligible (${eligiblePlayersList.length})` : "Aucun joueur éligible (Critères d'âge ou niveau)"}</p>
                     
                     {eligiblePlayersList.length === 0 ? (
                         <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200"><p className="text-xs font-bold text-slate-400">Aucun joueur qualifié pour ce tournoi.</p></div>
                     ) : (
                        eligiblePlayersList.map(p => {
                        const { selected, teamIndex } = getPlayerSelectionStatus(p.id);
                        const isSuggested = aiSuggestion?.playerIds.includes(p.id);
                        const isIndividual = !activeComp.teamSize || activeComp.teamSize === 1;
                        // En mode équipe, on peut sélectionner autant de joueurs qu'on veut tant qu'on crée des équipes
                        // En mode individuel, on peut aussi sélectionner tout le monde.
                        // La limite est gérée par handleTogglePlayer
                        const selectionLimit = 999; 

                        return (
                            <div key={p.id} onClick={() => handleTogglePlayer(p.id, selectionLimit)} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'bg-slate-900 border-slate-900 text-white' : isSuggested ? 'bg-purple-50 border-purple-200 hover:border-purple-300' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                                <div className="flex items-center gap-3"><img src={p.photoUrl} className="w-8 h-8 rounded-full bg-white object-cover" alt="" /><div><p className="text-xs font-black uppercase">{p.name}</p><div className="flex gap-2"><p className={`text-[9px] font-bold uppercase ${selected ? 'text-slate-400' : 'text-slate-500'}`}>{Math.round(p.points)} pts</p><p className={`text-[9px] font-bold uppercase ${selected ? 'text-slate-500' : 'text-slate-400'}`}>{p.category}</p></div></div></div>
                                {selected && (
                                    <div className="flex items-center gap-2">
                                        {!isIndividual && <span className="text-[8px] bg-white text-slate-900 px-2 py-0.5 rounded font-black uppercase">EQ. {teamIndex + 1}</span>}
                                        <i className="fa-solid fa-check text-green-400"></i>
                                    </div>
                                )}
                                {!selected && isSuggested && <i className="fa-solid fa-star text-purple-400 text-[10px]"></i>}
                            </div>
                        );
                        })
                     )}
                  </div>
               </div>

               <div className="p-6 border-t border-slate-100 shrink-0 bg-white">
                  <button 
                     onClick={handleRegister} 
                     disabled={eligiblePlayersList.length === 0} 
                     className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
                         eligiblePlayersList.length > 0 
                         ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200' 
                         : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                     }`}
                  >
                      <i className="fa-solid fa-check-circle"></i>
                      {activeComp.teamSize && activeComp.teamSize > 1 
                         ? (teamComposition.flat().length > 0 ? `Valider l'inscription (${teamComposition.filter(t => t.length === activeComp.teamSize).length} Équipe(s))` : 'Sélection incomplète') 
                         : `Valider l'inscription (${selectedPlayerIds.length} Joueur(s))`
                      }
                  </button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default CompetitionsTab;
