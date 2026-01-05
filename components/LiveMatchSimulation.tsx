
import React, { useState, useEffect, useRef } from 'react';
import { Meeting, Player, PointResult } from '../types';

interface LiveMatchSimulationProps {
  meeting: Meeting;
  homePlayers: Player[];
  awayPlayers: Player[];
  otherMeetings: Meeting[];
  onFinish: () => void;
}

const LiveMatchSimulation: React.FC<LiveMatchSimulationProps> = ({ meeting, homePlayers, awayPlayers, otherMeetings, onFinish }) => {
  // États Globaux Rencontre
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [displayedHomeScore, setDisplayedHomeScore] = useState(0);
  const [displayedAwayScore, setDisplayedAwayScore] = useState(0);
  
  // États Match en cours
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [liveSetScoreA, setLiveSetScoreA] = useState(0);
  const [liveSetScoreB, setLiveSetScoreB] = useState(0);
  const [setsWonA, setSetsWonA] = useState(0);
  const [setsWonB, setSetsWonB] = useState(0);
  
  // Contrôle Simulation
  const [phase, setPhase] = useState<'intro' | 'simulation' | 'outro'>('intro');
  const [isPaused, setIsPaused] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1200); 
  
  // Data Dynamique
  const [commentary, setCommentary] = useState<{text: string, type: string, turn: number}[]>([]);
  const [globalPointCounter, setGlobalPointCounter] = useState(0);
  const [lastScorer, setLastScorer] = useState<'A' | 'B' | null>(null);
  
  const commentaryEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  // --- Helpers ---
  const getPlayerData = (id: string) => {
    if (id.includes('DBL-H')) return { name: "Paire Domicile", photoUrl: "https://ui-avatars.com/api/?name=P+D&background=1e293b&color=fff", points: 0, style: "Double" } as any;
    if (id.includes('DBL-A')) return { name: "Paire Extérieur", photoUrl: "https://ui-avatars.com/api/?name=P+E&background=3b82f6&color=fff", points: 0, style: "Double" } as any;
    return [...homePlayers, ...awayPlayers].find(x => x.id === id);
  };

  const currentMatch = meeting.matches[currentMatchIdx];
  const playerA = currentMatch ? getPlayerData(currentMatch.playerAId) : null;
  const playerB = currentMatch ? getPlayerData(currentMatch.playerBId) : null;

  // Calcul Serveur (change tous les 2 points, ou tous les 1 point si > 10-10)
  const totalPoints = liveSetScoreA + liveSetScoreB;
  const isDeuce = liveSetScoreA >= 10 && liveSetScoreB >= 10;
  
  // Dans le 5ème set, on tourne à 5 points, mais la logique serveur reste :
  // Serveur change tous les 2 pts. 
  // Initialement A sert. A: 0-0, 1-0. B: 0-1, 1-1. 
  // Math.floor(totalPoints / 2) % 2 === 0  => Serveur Initial.
  // Pour simplifier, on dit que A commence toujours.
  const isServerA = isDeuce 
    ? (totalPoints % 2 === 0) 
    : (Math.floor(totalPoints / 2) % 2 === 0);

  // Auto-scroll commentaires
  useEffect(() => {
      if (commentaryEndRef.current) {
          commentaryEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [commentary]);

  // --- Moteur de Simulation ---
  useEffect(() => {
    if (phase !== 'simulation' || isPaused) return;

    if (currentMatchIdx >= meeting.matches.length) {
      setPhase('outro');
      return;
    }

    const matchData = meeting.matches[currentMatchIdx];
    const log = matchData.detailedLog || [];
    
    // Calcul de l'index global du point dans le log
    let currentPointIndex = 0;
    for (let i = 0; i < currentSetIdx; i++) {
        currentPointIndex += (matchData.sets[i].scoreA + matchData.sets[i].scoreB);
    }
    currentPointIndex += (liveSetScoreA + liveSetScoreB);

    const targetSetData = matchData.sets[currentSetIdx];

    const processSimulationStep = () => {
      // 1. Fin du MATCH actuel
      if (!targetSetData) {
        if (matchData.winnerId === matchData.playerAId) setDisplayedHomeScore(s => s + 1);
        else setDisplayedAwayScore(s => s + 1);
        
        setCommentary(prev => [...prev, { text: `Victoire de ${matchData.winnerId === matchData.playerAId ? playerA.name : playerB.name} !`, type: 'MATCH_WIN', turn: globalPointCounter }]);

        timeoutRef.current = window.setTimeout(() => {
          setCurrentMatchIdx(prev => prev + 1);
          setCurrentSetIdx(0);
          setLiveSetScoreA(0);
          setLiveSetScoreB(0);
          setSetsWonA(0);
          setSetsWonB(0);
          setGlobalPointCounter(0);
          setCommentary([]);
        }, 3000);
        return;
      }

      // 2. Simulation POINT par POINT
      // On continue tant qu'on n'a pas atteint le score cible du set pré-calculé
      if (liveSetScoreA < targetSetData.scoreA || liveSetScoreB < targetSetData.scoreB) {
        
        const pointDetail = log[currentPointIndex] || { winner: 'A', type: 'NORMAL', description: 'Point marqué.' };
        
        // Mise à jour Score
        if (pointDetail.winner === 'A') {
            setLiveSetScoreA(s => s + 1);
            setLastScorer('A');
        } else {
            setLiveSetScoreB(s => s + 1);
            setLastScorer('B');
        }
        
        // Reset animation flash après délai
        setTimeout(() => setLastScorer(null), 400);
        setGlobalPointCounter(prev => prev + 1);
        
        // Ajout Commentaire
        setCommentary(prev => {
            const newLog = [...prev, { text: pointDetail.description, type: pointDetail.type, turn: globalPointCounter }];
            if (newLog.length > 5) return newLog.slice(newLog.length - 5);
            return newLog;
        });

        // Délai variable pour le réalisme (plus long si point important)
        const isDramatic = pointDetail.type === 'ACE' || pointDetail.type === 'WINNER' || (liveSetScoreA >= 9 && liveSetScoreB >= 9);
        const delay = isDramatic ? simulationSpeed + 500 : simulationSpeed;
        
        timeoutRef.current = window.setTimeout(processSimulationStep, delay);
      
      } else {
        // 3. Fin du SET
        const setWinnerA = targetSetData.scoreA > targetSetData.scoreB;
        if (setWinnerA) {
            setSetsWonA(s => s + 1);
            setCommentary(prev => [...prev, { text: `MANCHE ${playerA.name} (${targetSetData.scoreA}-${targetSetData.scoreB})`, type: 'SET', turn: globalPointCounter }]);
        } else {
            setSetsWonB(s => s + 1);
            setCommentary(prev => [...prev, { text: `MANCHE ${playerB.name} (${targetSetData.scoreB}-${targetSetData.scoreA})`, type: 'SET', turn: globalPointCounter }]);
        }
        
        timeoutRef.current = window.setTimeout(() => {
          setCurrentSetIdx(prev => prev + 1);
          setLiveSetScoreA(0);
          setLiveSetScoreB(0);
        }, 2000);
      }
    };

    timeoutRef.current = window.setTimeout(processSimulationStep, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [phase, isPaused, currentMatchIdx, currentSetIdx, liveSetScoreA, liveSetScoreB, simulationSpeed]);

  const skipSimulation = () => {
    let finalHome = 0;
    let finalAway = 0;
    meeting.matches.forEach(m => {
        if (m.winnerId === m.playerAId) finalHome++;
        else finalAway++;
    });
    setDisplayedHomeScore(finalHome);
    setDisplayedAwayScore(finalAway);
    setPhase('outro');
  };

  // --- Rendu Visuel ---

  const isMatchPointA = setsWonA === 2 && ((liveSetScoreA >= 10 && liveSetScoreA > liveSetScoreB) || (liveSetScoreA >= 10 && liveSetScoreA >= liveSetScoreB + 1));
  const isMatchPointB = setsWonB === 2 && ((liveSetScoreB >= 10 && liveSetScoreB > liveSetScoreA) || (liveSetScoreB >= 10 && liveSetScoreB >= liveSetScoreA + 1));
  const isSetPointA = !isMatchPointA && ((liveSetScoreA >= 10 && liveSetScoreA > liveSetScoreB));
  const isSetPointB = !isMatchPointB && ((liveSetScoreB >= 10 && liveSetScoreB > liveSetScoreA));

  const progressRatio = Math.min(1, currentMatchIdx / 14);

  const getBadgeForType = (type: string) => {
      switch(type) {
          case 'ACE': return <span className="bg-yellow-400 text-black px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">ACE</span>;
          case 'WINNER': return <span className="bg-green-500 text-white px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">WINNER</span>;
          case 'LUCKY': return <span className="bg-blue-400 text-white px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">LUCKY</span>;
          case 'UNFORCED_ERROR': return <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">FAUTE</span>;
          case 'SET': return <span className="bg-white text-black px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-black/20">MANCHE</span>;
          case 'MATCH_WIN': return <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-white/20">VICTOIRE</span>;
          default: return null;
      }
  };

  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-8 text-white animate-in fade-in">
        <div className="text-center space-y-8 animate-in slide-in-from-bottom-10 duration-700 relative z-10">
            <p className="text-blue-400 font-black uppercase tracking-[0.5em] text-sm mb-4">Broadcast FFTT Official</p>
            <div className="flex items-center gap-8 justify-center">
                <div className="text-right">
                    <h2 className="text-5xl font-black uppercase tracking-tighter">{meeting.homeClubName}</h2>
                </div>
                <div className="text-6xl font-thin text-slate-600">VS</div>
                <div className="text-left">
                    <h2 className="text-5xl font-black uppercase tracking-tighter">{meeting.awayClubName}</h2>
                </div>
            </div>
            <div className="flex gap-6 justify-center pt-12">
            <button onClick={() => setPhase('simulation')} className="px-12 py-5 bg-white text-slate-900 rounded-full font-black uppercase tracking-widest hover:scale-110 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                Lancer le Direct
            </button>
            <button onClick={onFinish} className="px-12 py-5 border border-white/20 text-white rounded-full font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                Simuler (Rapide)
            </button>
            </div>
        </div>
        {/* Background ambience */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black z-0"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col font-sans overflow-hidden text-white">
      
      {/* --- TOP SCOREBOARD --- */}
      <div className="bg-black/80 backdrop-blur-md border-b border-white/10 p-4 shadow-2xl z-20 flex justify-between items-center h-24">
        
        {/* Home Team */}
        <div className="flex items-center gap-6 z-10 w-1/3 pl-8">
            <div className="text-right flex-1">
                <h2 className="font-black text-2xl uppercase tracking-tighter truncate text-white">{meeting.homeClubName}</h2>
                <div className="flex justify-end gap-1 mt-1">
                    {Array.from({length: 7}).map((_, i) => <div key={i} className={`h-1 w-8 rounded-full ${i < displayedHomeScore ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-slate-800'}`}></div>)}
                </div>
            </div>
            <div className="bg-slate-800 w-20 h-14 flex items-center justify-center rounded-lg border border-slate-700 shadow-inner">
                <span className="text-4xl font-black font-mono text-white">{displayedHomeScore}</span>
            </div>
        </div>

        {/* Center Badge */}
        <div className="z-10 px-6 flex flex-col items-center">
            <div className="bg-red-600 text-white px-3 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-lg animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-ping"></span> LIVE
            </div>
            <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-widest">MATCH {currentMatchIdx + 1} / 14</p>
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-6 z-10 w-1/3 pr-8 flex-row-reverse">
            <div className="text-left flex-1">
                <h2 className="font-black text-2xl uppercase tracking-tighter truncate text-white">{meeting.awayClubName}</h2>
                <div className="flex justify-start gap-1 mt-1">
                    {Array.from({length: 7}).map((_, i) => <div key={i} className={`h-1 w-8 rounded-full ${i < displayedAwayScore ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-slate-800'}`}></div>)}
                </div>
            </div>
            <div className="bg-slate-800 w-20 h-14 flex items-center justify-center rounded-lg border border-slate-700 shadow-inner">
                <span className="text-4xl font-black font-mono text-white">{displayedAwayScore}</span>
            </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative bg-gradient-to-b from-slate-900 to-slate-950">
        
        {/* --- MAIN STAGE --- */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
          
          {/* Background Table Decoration */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <div className="w-[60%] h-[40%] bg-blue-900 rounded-[1rem] transform perspective-1000 rotate-x-12 border-4 border-white"></div>
              <div className="absolute w-[2px] h-[30%] bg-white/50"></div>
          </div>

          {phase === 'simulation' && currentMatch && (
            <div className="w-full max-w-6xl z-10 flex flex-col items-center gap-12">
              
              {/* === PLAYER CARDS & MAIN SCORE === */}
              <div className="flex justify-between items-center w-full gap-12 px-12">
                  
                  {/* LEFT PLAYER (A) */}
                  <div className={`flex-1 flex flex-col items-end transition-all duration-300 ${lastScorer === 'A' ? 'scale-105' : 'opacity-90'}`}>
                      <div className="flex items-center gap-6 mb-4">
                          <div className="text-right">
                              <h3 className={`text-4xl font-black uppercase leading-none tracking-tighter ${lastScorer === 'A' ? 'text-white' : 'text-slate-300'}`}>{playerA?.name}</h3>
                              <p className="text-slate-500 font-bold text-xs mt-1 uppercase tracking-wider">{playerA?.style}</p>
                          </div>
                          <div className="relative">
                              <img src={playerA?.photoUrl} className={`w-28 h-28 rounded-full object-cover border-4 ${lastScorer === 'A' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'border-slate-700'}`} alt="" />
                              {isServerA && <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg animate-bounce z-10"><i className="fa-solid fa-table-tennis-paddle-ball text-slate-900 text-xs"></i></div>}
                          </div>
                      </div>
                      {/* Sets won indicators */}
                      <div className="flex gap-2">
                          {Array.from({length: 3}).map((_, i) => (
                              <div key={i} className={`h-2 w-12 rounded-full ${i < setsWonA ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-slate-800'}`}></div>
                          ))}
                      </div>
                  </div>

                  {/* SCORE CENTRAL */}
                  <div className="flex flex-col items-center relative mx-8">
                      {isMatchPointA && <div className="absolute -top-14 left-0 bg-red-600 text-white px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest animate-pulse shadow-lg whitespace-nowrap">Balle de Match</div>}
                      {isMatchPointB && <div className="absolute -top-14 right-0 bg-red-600 text-white px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest animate-pulse shadow-lg whitespace-nowrap">Balle de Match</div>}
                      {!isMatchPointA && isSetPointA && <div className="absolute -top-14 left-0 bg-orange-500 text-white px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest animate-pulse shadow-lg whitespace-nowrap">Balle de Set</div>}
                      {!isMatchPointB && isSetPointB && <div className="absolute -top-14 right-0 bg-orange-500 text-white px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest animate-pulse shadow-lg whitespace-nowrap">Balle de Set</div>}
                      
                      <div className="bg-black/50 backdrop-blur-xl px-12 py-8 rounded-[3rem] border border-white/10 flex items-center gap-8 min-w-[380px] justify-center relative overflow-hidden">
                          {/* Gloss effect */}
                          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5 pointer-events-none"></div>
                          
                          <span className={`text-8xl font-mono font-black tabular-nums w-32 text-center leading-none transition-all duration-100 ${lastScorer === 'A' ? 'text-green-400 scale-110 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'text-white'}`}>
                              {liveSetScoreA}
                          </span>
                          <div className="flex flex-col items-center gap-1">
                              <div className="h-16 w-[1px] bg-slate-700"></div>
                          </div>
                          <span className={`text-8xl font-mono font-black tabular-nums w-32 text-center leading-none transition-all duration-100 ${lastScorer === 'B' ? 'text-green-400 scale-110 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'text-white'}`}>
                              {liveSetScoreB}
                          </span>
                      </div>
                      <div className="mt-4 bg-slate-800 px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Manche {currentSetIdx + 1}
                      </div>
                  </div>

                  {/* RIGHT PLAYER (B) */}
                  <div className={`flex-1 flex flex-col items-start transition-all duration-300 ${lastScorer === 'B' ? 'scale-105' : 'opacity-90'}`}>
                      <div className="flex items-center gap-6 mb-4 flex-row-reverse">
                          <div className="text-left">
                              <h3 className={`text-4xl font-black uppercase leading-none tracking-tighter ${lastScorer === 'B' ? 'text-white' : 'text-slate-300'}`}>{playerB?.name}</h3>
                              <p className="text-slate-500 font-bold text-xs mt-1 uppercase tracking-wider">{playerB?.style}</p>
                          </div>
                          <div className="relative">
                              <img src={playerB?.photoUrl} className={`w-28 h-28 rounded-full object-cover border-4 ${lastScorer === 'B' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'border-slate-700'}`} alt="" />
                              {!isServerA && <div className="absolute -top-1 -left-1 w-8 h-8 bg-yellow-400 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg animate-bounce z-10"><i className="fa-solid fa-table-tennis-paddle-ball text-slate-900 text-xs"></i></div>}
                          </div>
                      </div>
                      {/* Sets won indicators */}
                      <div className="flex gap-2 justify-end w-full">
                          {Array.from({length: 3}).map((_, i) => (
                              <div key={i} className={`h-2 w-12 rounded-full ${i < setsWonB ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-slate-800'}`}></div>
                          ))}
                      </div>
                  </div>

              </div>

              {/* === COMMENTARY BOX === */}
              <div className="w-full max-w-3xl">
                  <div className="h-40 overflow-hidden relative mask-linear-gradient">
                      <div className="absolute bottom-0 w-full flex flex-col gap-2 justify-end">
                          {commentary.map((c, i) => (
                              <div key={i} className="flex items-center gap-4 animate-commentary text-sm py-1">
                                  <span className="text-[10px] font-mono text-slate-500 w-8 text-right">{c.turn}'</span>
                                  {getBadgeForType(c.type)}
                                  <span className={`font-medium ${c.type === 'MATCH_WIN' ? 'text-yellow-400 font-black tracking-wide text-lg' : c.type === 'SET' ? 'text-white font-bold' : 'text-slate-300'}`}>
                                      {c.text}
                                  </span>
                              </div>
                          ))}
                          <div ref={commentaryEndRef} />
                      </div>
                  </div>
              </div>

            </div>
          )}
        </div>

        {/* --- SIDEBAR MULTIPLEX (Hidden on Mobile) --- */}
        {otherMeetings.length > 0 && phase !== 'outro' && (
          <div className="w-72 bg-slate-950 border-l border-white/5 shadow-xl z-20 flex flex-col hidden xl:flex">
            <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                    <h3 className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Multiplex</h3>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {otherMeetings.map(om => {
                    const partialHome = Math.floor(om.homeScore * progressRatio);
                    const partialAway = Math.floor(om.awayScore * progressRatio);
                    return (
                        <div key={om.id} className="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase mb-2">
                                <span>{om.divisionName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-300 text-xs truncate w-20">{om.homeClubName}</span>
                                <span className="bg-black/50 px-2 py-1 rounded text-white font-mono text-xs border border-white/10">{phase === 'outro' ? om.homeScore : partialHome} - {phase === 'outro' ? om.awayScore : partialAway}</span>
                                <span className="font-bold text-slate-300 text-xs truncate w-20 text-right">{om.awayClubName}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>
        )}
      </div>

      {/* --- FOOTER CONTROLS --- */}
      <div className="bg-black border-t border-white/10 p-4 flex justify-center gap-4 z-30">
        <button onClick={() => setIsPaused(!isPaused)} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all text-white">
            <i className={`fa-solid ${isPaused ? 'fa-play' : 'fa-pause'}`}></i>
        </button>
        <button onClick={() => setSimulationSpeed(s => s === 1200 ? 300 : 1200)} className="px-6 rounded-full bg-white/10 text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all w-48 border border-white/5">
            Vitesse : {simulationSpeed === 1200 ? 'Réaliste' : 'Accéléré'}
        </button>
        <button onClick={skipSimulation} className="px-6 rounded-full bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
            Aller au résultat
        </button>
      </div>

      {/* --- ECRAN DE FIN --- */}
      {phase === 'outro' && (
        <div className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-300 text-white">
           <h2 className="text-4xl font-black uppercase mb-12 tracking-widest text-slate-500">Score Final</h2>
           <div className="flex items-center gap-16 mb-16">
               <div className="text-center">
                   <p className="text-8xl font-black text-white">{displayedHomeScore}</p>
                   <p className="text-lg font-bold text-slate-400 uppercase mt-4 tracking-widest">{meeting.homeClubName}</p>
               </div>
               <div className="h-32 w-[1px] bg-white/20"></div>
               <div className="text-center">
                   <p className="text-8xl font-black text-white">{displayedAwayScore}</p>
                   <p className="text-lg font-bold text-slate-400 uppercase mt-4 tracking-widest">{meeting.awayClubName}</p>
               </div>
           </div>
           <button onClick={onFinish} className="px-12 py-5 bg-white text-black rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
               Retour au Vestiaire
           </button>
        </div>
      )}
    </div>
  );
};

export default LiveMatchSimulation;
