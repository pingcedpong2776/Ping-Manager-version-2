import React, { useState, useEffect, useRef } from 'react';
import { Player, Club, Meeting, RankingEntry, TransferOffer, Competition, CompetitionResult, SeasonArchive } from './types';
import { generateRandomPlayer, OFFICIAL_DIVISIONS, REAL_COMPETITIONS, DIVISION_SCALING, getCategoryFromAge } from './constants';
import { simulateLeagueDay, simulateMeeting, simulateCompetitionFullEvent, getDayMatchups } from './services/simulationService';
import { getAIStrategicSelection, getAdversaryNameSuggestions, getZoneBasedAdversaries } from './services/geminiService';
import Layout from './components/Layout';
import PlayerCard from './components/PlayerCard';
import MeetingSheet from './components/MeetingSheet';
import RecruitModal from './components/RecruitModal';
import EditPlayerModal from './components/EditPlayerModal';
import ClubSetup from './components/ClubSetup';
import LeagueTable from './components/LeagueTable';
import LiveMatchSimulation from './components/LiveMatchSimulation';
import TrainingTab from './components/TrainingTab';
import ClubLogo from './components/ClubLogo';
import TransferMarket from './components/TransferMarket';
import ManualMeetingModal from './components/ManualMeetingModal';
import HomeMenu from './components/HomeMenu';
import ClubRanking from './components/ClubRanking';
import CompetitionsTab from './components/CompetitionsTab';
import StatisticsTab from './components/StatisticsTab';

const SAVE_KEY = 'ping_manager_save_v19_phases';

const App: React.FC = () => {
  // App Navigation States
  const [showMenu, setShowMenu] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Game Data States
  const [club, setClub] = useState<Club | null>(null);
  const [youthPlayers, setYouthPlayers] = useState<Player[]>([]);
  const [isUnlimitedBudget, setIsUnlimitedBudget] = useState(false);
  const [adversariesByTeam, setAdversariesByTeam] = useState<Record<number, Club[]>>({});
  const [geographicalZone, setGeographicalZone] = useState('Île-de-France');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<Record<number, string[]>>({});
  const [viewingMeetingId, setViewingMeetingId] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentPhase, setCurrentPhase] = useState(1); // Phase 1 or 2
  const [marketPlayers, setMarketPlayers] = useState<Player[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<TransferOffer[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>(REAL_COMPETITIONS);
  const [season, setSeason] = useState(1);
  const [startYear, setStartYear] = useState(2025);
  const [isMercatoOpen, setIsMercatoOpen] = useState(false);

  // Logic States for Transitions
  const [pendingDivisionUpdates, setPendingDivisionUpdates] = useState<Record<number, string>>({});

  // UI States
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState<{
    meeting: Meeting, 
    homePlayers: Player[], 
    awayPlayers: Player[],
    otherMeetings: Meeting[]
  } | null>(null);
  const [isRecruitModalOpen, setIsRecruitModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedRankingTeam, setSelectedRankingTeam] = useState(1);
  const [isAssigningPlayer, setIsAssigningPlayer] = useState<{team: number, slot: number} | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [isManualMeetingOpen, setIsManualMeetingOpen] = useState(false);
  const [saveExists, setSaveExists] = useState(false);
  const [savedClubName, setSavedClubName] = useState<string>('');
  const [showPhaseEndModal, setShowPhaseEndModal] = useState<{promotions: string[], relegations: string[]} | null>(null);
  const [isGeneratingSeason, setIsGeneratingSeason] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Player Sort State
  const [playerSort, setPlayerSort] = useState<'points' | 'age'>('points');

  // Settings UI States
  const [editingAdversariesTeam, setEditingAdversariesTeam] = useState<number | null>(null);
  const [isAiGeneratingNames, setIsAiGeneratingNames] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs
  const compositionSectionRef = useRef<HTMLDivElement>(null);

  // Computed State
  const isMercatoActive = isMercatoOpen || currentDay <= 2;

  // Check for save on mount
  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data && data.club) {
          setSaveExists(true);
          setSavedClubName(data.club.name);
        }
      } catch (e) {
        setSaveExists(false);
      }
    }
  }, []);

  // Persistence
  useEffect(() => {
    if (!showMenu && club) {
      const dataToSave = { 
        club, 
        youthPlayers, 
        isUnlimitedBudget, 
        meetings, 
        adversariesByTeam, 
        geographicalZone, 
        currentDay, 
        currentPhase, 
        selectedHomePlayers, 
        marketPlayers, 
        incomingOffers, 
        competitions, 
        season, 
        startYear, 
        isMercatoOpen, 
        pendingDivisionUpdates 
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave));
      
      document.documentElement.style.setProperty('--club-primary', club.primaryColor);
      document.documentElement.style.setProperty('--club-secondary', club.secondaryColor);
    }
  }, [club, youthPlayers, isUnlimitedBudget, meetings, adversariesByTeam, geographicalZone, currentDay, currentPhase, selectedHomePlayers, marketPlayers, incomingOffers, showMenu, competitions, season, startYear, isMercatoOpen, pendingDivisionUpdates]);

  // Initial Market Gen
  useEffect(() => {
    if (!showMenu && marketPlayers.length === 0) {
      const newMarket: Player[] = [];
      for (let i = 0; i < 20; i++) {
         let targetPts = 500;
         const rand = Math.random();
         if (rand > 0.9) targetPts = 2200 + Math.random() * 800; 
         else if (rand > 0.7) targetPts = 1500 + Math.random() * 500;
         else if (rand > 0.4) targetPts = 1000 + Math.random() * 500;
         else targetPts = 500 + Math.random() * 500;
         newMarket.push(generateRandomPlayer(`mkt-${Date.now()}-${i}`, targetPts));
      }
      setMarketPlayers(newMarket);
    }
  }, [marketPlayers.length, showMenu]);

  // Check for competition unlocks based on date/phase/day
  useEffect(() => {
      if(!showMenu) {
          checkCompetitionUnlocks();
      }
  }, [currentDay, currentPhase, season, showMenu]);

  // Phase End Check
  useEffect(() => {
    if (currentDay > 7 && !isMercatoOpen && !showPhaseEndModal) {
      handlePhaseEnd();
    }
  }, [currentDay]);

  const checkCompetitionUnlocks = () => {
      const updates = competitions.map(c => {
          let shouldOpen = false;
          if (c.status !== 'Ouvert' && c.status !== 'Terminé' && c.status !== 'Fermé') return c; 
          
          if (currentPhase === 1) {
              if (currentDay >= 1 && (c.id === 'tournoi-national-rentree' || c.id === 'tournoi-dep-automne' || c.id === 'champ-jeunes-t1')) shouldOpen = true;
              if (currentDay >= 2 && (c.id === 'crit-fed-t1' || c.id === 'premier-pas-pongiste' || c.id === 'challenge-500-t1')) shouldOpen = true;
              if (currentDay >= 3 && (c.id === 'champ-jeunes-t2')) shouldOpen = true;
              if (currentDay >= 4 && (c.id === 'top-detection-dep')) shouldOpen = true;
              if (currentDay >= 5 && (c.id === 'crit-fed-t2' || c.id === 'challenge-500-t2')) shouldOpen = true;
              if (currentDay >= 6 && (c.id === 'coupe-france-dep')) shouldOpen = true;
          }
          else if (currentPhase === 2) {
              if (currentDay >= 1 && (c.id === 'champ-jeunes-t3' || c.id === 'tournoi-reg-hiver')) shouldOpen = true;
              
              if (currentDay >= 1 && c.id === 'top-detection-reg') {
                  const dep = competitions.find(x => x.id === 'top-detection-dep');
                  if (dep && dep.results && dep.results.some(r => r.isQualified)) shouldOpen = true;
              }

              if (currentDay >= 2 && (c.id === 'crit-fed-t3' || c.id === 'challenge-500-t3' || c.id === 'finales-rank-dep')) shouldOpen = true;
              if (currentDay >= 3 && (c.id === 'champ-jeunes-t4')) shouldOpen = true;
              if (currentDay >= 4 && (c.id === 'crit-fed-t4' || c.id === 'coupe-veterans' || c.id === 'tournoi-nat-printemps')) shouldOpen = true;
              if (currentDay >= 5 && (c.id === 'champ-jeunes-t5' || c.id === 'finales-rank-reg')) shouldOpen = true;
              
              if (currentDay >= 6 && c.id === 'top-detection-nat') {
                  const reg = competitions.find(x => x.id === 'top-detection-reg');
                  if (reg && reg.results && reg.results.some(r => r.isQualified)) shouldOpen = true;
              }

              if (currentDay >= 6 && (c.id === 'euro-mini-champs' || c.id === 'champ-jeunes-finales')) shouldOpen = true;
              if (currentDay >= 7 && (c.id === 'champ-france-jeunes' || c.id === 'challenge-500-t4' || c.id === 'finales-rank-nat')) shouldOpen = true;
          }

          if (shouldOpen && c.status === 'Ouvert') return c;
          if (shouldOpen) return { ...c, status: 'Ouvert' };
          return c;
      });
      
      if (JSON.stringify(updates) !== JSON.stringify(competitions)) {
          setCompetitions(updates as Competition[]);
      }
  };

  const loadGameData = () => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        setClub(data.club);
        setYouthPlayers(data.youthPlayers || []);
        setIsUnlimitedBudget(data.isUnlimitedBudget || false);
        setMeetings(data.meetings || []);
        setAdversariesByTeam(data.adversariesByTeam || {});
        setGeographicalZone(data.geographicalZone || 'France');
        setCurrentDay(data.currentDay || 1);
        setCurrentPhase(data.currentPhase || 1);
        setSelectedHomePlayers(data.selectedHomePlayers || {});
        setMarketPlayers(data.marketPlayers || []);
        setIncomingOffers(data.incomingOffers || []);
        setCompetitions(data.competitions || REAL_COMPETITIONS);
        setSeason(data.season || 1);
        setStartYear(data.startYear || 2025);
        setIsMercatoOpen(data.isMercatoOpen || false);
        setPendingDivisionUpdates(data.pendingDivisionUpdates || {});
    }
  };

  const handleNewGame = () => {
    setClub(null);
    setMeetings([]);
    setAdversariesByTeam({});
    setIsFirstSetup(true);
    setShowMenu(false);
  };

  const handleContinueGame = () => {
    if (saveExists) {
      loadGameData();
    }
    setShowMenu(false);
  };

  const handleResetGame = () => {
      setShowResetConfirm(true);
  };

  const confirmReset = () => {
      localStorage.removeItem(SAVE_KEY);
      // Reset all states to initial values
      setClub(null);
      setYouthPlayers([]);
      setIsUnlimitedBudget(false);
      setAdversariesByTeam({});
      setGeographicalZone('Île-de-France');
      setMeetings([]);
      setSelectedHomePlayers({});
      setViewingMeetingId(null);
      setCurrentDay(1);
      setCurrentPhase(1);
      setMarketPlayers([]);
      setIncomingOffers([]);
      setCompetitions(REAL_COMPETITIONS);
      setSeason(1);
      setStartYear(2025);
      setIsMercatoOpen(false);
      setPendingDivisionUpdates({});
      setIsFirstSetup(false);
      setActiveSimulation(null);
      setIsRecruitModalOpen(false);
      setEditingPlayer(null);
      setSelectedRankingTeam(1);
      setIsAssigningPlayer(null);
      setIsOptimizing(false);
      setShowSaveToast(false);
      setIsManualMeetingOpen(false);
      setSaveExists(false);
      setSavedClubName('');
      setShowPhaseEndModal(null);
      setIsGeneratingSeason(false);
      setEditingAdversariesTeam(null);
      setIsAiGeneratingNames(false);
      
      setShowResetConfirm(false);
      setShowMenu(true);
  };

  const handleImportSave = (data: any) => {
    setClub(data.club);
    setYouthPlayers(data.youthPlayers || []);
    setIsUnlimitedBudget(data.isUnlimitedBudget || false);
    setMeetings(data.meetings || []);
    setAdversariesByTeam(data.adversariesByTeam || {});
    setGeographicalZone(data.geographicalZone || 'France');
    setCurrentDay(data.currentDay || 1);
    setCurrentPhase(data.currentPhase || 1);
    setSelectedHomePlayers(data.selectedHomePlayers || {});
    setMarketPlayers(data.marketPlayers || []);
    setIncomingOffers(data.incomingOffers || []);
    setCompetitions(data.competitions || REAL_COMPETITIONS);
    setSeason(data.season || 1);
    setStartYear(data.startYear || 2025);
    setIsMercatoOpen(data.isMercatoOpen || false);
    setPendingDivisionUpdates(data.pendingDivisionUpdates || {});
    setShowMenu(false);
  };

  const getAllPlayers = () => {
      if (!club) return [];
      let all = [...club.players];
      (Object.values(adversariesByTeam).flat() as Club[]).forEach(c => {
          all = [...all, ...c.players];
      });
      return all;
  };

  const handleManualSave = () => {
      if (!club) return;
      const dataToSave = { 
          club, youthPlayers, isUnlimitedBudget, meetings, adversariesByTeam, 
          geographicalZone, currentDay, currentPhase, selectedHomePlayers, 
          marketPlayers, incomingOffers, competitions, season, startYear, isMercatoOpen, pendingDivisionUpdates 
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave));
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2000);
  };

  const handleReturnToMenu = () => {
      if (club) handleManualSave();
      setShowMenu(true);
  };

  const handleExportSave = () => {
      const dataToSave = { 
          club, youthPlayers, isUnlimitedBudget, meetings, adversariesByTeam, 
          geographicalZone, currentDay, currentPhase, selectedHomePlayers, 
          marketPlayers, incomingOffers, competitions, season, startYear, isMercatoOpen, pendingDivisionUpdates 
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToSave));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `ping_manager_save_${new Date().toISOString()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleSettingsFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              handleImportSave(json);
          } catch (err) {
              console.error(err);
          }
      };
      reader.readAsText(file);
  };

  const handleQuickStart = () => {
      if(compositionSectionRef.current) {
          compositionSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  };

  const deletePlayer = (id: string) => {
      if (!club) return;
      setClub({
          ...club,
          players: club.players.filter(p => p.id !== id)
      });
  };

  const triggerAIOptimization = async (currentClub: Club) => {
      setIsOptimizing(true);
      try {
          const ambition = currentPhase === 1 ? 'PROMOTION' : 'MAINTENANCE';
          const { selection, report } = await getAIStrategicSelection(currentClub, ambition);
          setSelectedHomePlayers(selection);
          alert(`Rapport IA: ${report}`);
      } catch (e) {
          console.error(e);
      } finally {
          setIsOptimizing(false);
      }
  };

  const handleFinishSimulation = () => {
    if (!activeSimulation || !club) return;

    const finishedMeeting = { ...activeSimulation.meeting, isCompleted: true };
    const allNewMeetings = [finishedMeeting, ...activeSimulation.otherMeetings];
    
    // Determine all meetings completed today to update stats
    const userMatches = finishedMeeting.matches;
    const finalClubPlayers = club.players.map(p => {
        let newP = { ...p };
        
        // Update based on user meeting
        userMatches.forEach(m => {
            if (m.playerAId === p.id || m.playerBId === p.id) {
                const isA = m.playerAId === p.id;
                const isWinner = m.winnerId === p.id;
                let sWon = 0, sLost = 0;
                m.sets.forEach(s => {
                    if (isA) { s.scoreA > s.scoreB ? sWon++ : sLost++; }
                    else { s.scoreB > s.scoreA ? sWon++ : sLost++; }
                });
                
                newP.careerStats.wins += isWinner ? 1 : 0;
                newP.careerStats.losses += isWinner ? 0 : 1;
                newP.careerStats.setsWon += sWon;
                newP.careerStats.setsLost += sLost;
                
                const ptChange = isWinner ? (m.pointCalculation?.gain || 0) : (m.pointCalculation?.loss || 0);
                newP.points += ptChange;
                newP.fatigue = Math.min(100, newP.fatigue + (sWon + sLost) * 3);
                newP.experience += 15;
            }
        });
        return newP;
    });

    setClub({ ...club, players: finalClubPlayers });
    setMeetings(prev => [...prev, ...allNewMeetings]);
    setCurrentDay(d => d + 1);
    setActiveSimulation(null);
  };

  const calculateRankingsForTeam = (teamNum: number, phase: number) => {
      const relevantMeetings = meetings.filter(m => m.teamNumber === teamNum && m.phaseId === phase && m.type !== 'FRIENDLY');
      const rankings: Record<string, any> = {};
      if (!club) return [];

      rankings[club.name] = { clubName: club.name, played: 0, wins: 0, draws: 0, losses: 0, points: 0, matchesWon: 0, matchesLost: 0 };
      
      const advs = adversariesByTeam[teamNum] || [];
      advs.forEach(a => {
          rankings[a.name] = { clubName: a.name, played: 0, wins: 0, draws: 0, losses: 0, points: 0, matchesWon: 0, matchesLost: 0 };
      });

      relevantMeetings.forEach(m => {
          if (!m.isCompleted) return;
          const home = rankings[m.homeClubName];
          const away = rankings[m.awayClubName];
          
          if (home && away) {
              home.played++; away.played++;
              home.matchesWon += m.homeScore; home.matchesLost += m.awayScore;
              away.matchesWon += m.awayScore; away.matchesLost += m.homeScore;
              
              if (m.homeScore > m.awayScore) {
                  home.wins++; home.points += 3;
                  away.losses++; away.points += 1;
              } else if (m.awayScore > m.homeScore) {
                  away.wins++; away.points += 3;
                  home.losses++; home.points += 1;
              } else {
                  home.draws++; home.points += 2;
                  away.draws++; away.points += 2;
              }
          }
      });

      return Object.values(rankings).sort((a: any, b: any) => b.points - a.points || (b.matchesWon - b.matchesLost) - (a.matchesWon - a.matchesLost));
  };

  const handlePhaseEnd = () => {
      const promotions: string[] = [];
      const relegations: string[] = [];
      const pendingUpdates: Record<number, string> = {};
      
      if (club) {
        for (let i = 1; i <= club.teamCount; i++) {
           const ranks = calculateRankingsForTeam(i, currentPhase);
           const myRankIdx = ranks.findIndex(r => r.clubName === club.name);
           const currentDivision = club.teamDivisions[i];
           const currentDivIndex = OFFICIAL_DIVISIONS.indexOf(currentDivision);
           
           // Montée : Si 1er et pas déjà en Pro A
           if (myRankIdx === 0 && currentDivIndex > 0) {
               const nextDiv = OFFICIAL_DIVISIONS[currentDivIndex - 1];
               promotions.push(`Équipe ${i} : Champion de ${currentDivision} ➔ ${nextDiv}`);
               pendingUpdates[i] = nextDiv;
           } 
           // Descente : Si dans les 2 derniers et pas en D4
           else if (myRankIdx >= ranks.length - 2 && currentDivIndex < OFFICIAL_DIVISIONS.length - 1) {
               const lowerDiv = OFFICIAL_DIVISIONS[currentDivIndex + 1];
               relegations.push(`Équipe ${i} : Relégation de ${currentDivision} ➔ ${lowerDiv}`);
               pendingUpdates[i] = lowerDiv;
           } else {
               // Maintien
               pendingUpdates[i] = currentDivision;
           }
        }
      }
      
      setPendingDivisionUpdates(pendingUpdates);
      setShowPhaseEndModal({ promotions, relegations });
      setIsMercatoOpen(true);
  };

  const handleCloseMercatoAndStartPhase = () => {
      if (!club) return;
      setIsMercatoOpen(false);
      setIsGeneratingSeason(true); // Petit effet de chargement

      setTimeout(() => {
          // 1. Appliquer les montées/descentes
          const newDivisions = { ...club.teamDivisions, ...pendingDivisionUpdates };
          const updatedClub = { ...club, teamDivisions: newDivisions };

          // 2. Gestion de la transition de phase
          if (currentPhase === 1) {
              // Passage Phase 1 -> Phase 2 (Même saison)
              setCurrentPhase(2);
              setCurrentDay(1);
              setMeetings([]); // Reset du calendrier pour la nouvelle phase
              setClub(updatedClub);
          } else {
              // Passage Phase 2 -> Saison suivante (Phase 1)
              // Archiver la saison
              const newHistory: SeasonArchive = {
                  seasonId: Date.now(),
                  yearLabel: `${startYear}/${startYear + 1}`,
                  finalBudget: club.budget,
                  teamResults: Array.from({ length: club.teamCount }).map((_, i) => {
                      const ranks = calculateRankingsForTeam(i+1, 2);
                      const myRankIdx = ranks.findIndex(r => r.clubName === club.name);
                      return {
                          teamNumber: i+1,
                          division: club.teamDivisions[i+1],
                          rank: myRankIdx + 1,
                          wins: ranks[myRankIdx]?.wins || 0,
                          losses: ranks[myRankIdx]?.losses || 0
                      };
                  }),
                  topScorerName: club.players.sort((a,b) => b.points - a.points)[0].name,
                  topScorerPoints: Math.round(club.players.sort((a,b) => b.points - a.points)[0].points),
                  trophies: showPhaseEndModal?.promotions.map(p => p.split(':')[1].trim()) || []
              };

              updatedClub.history = [...updatedClub.history, newHistory];
              
              setSeason(prev => prev + 1);
              setStartYear(prev => prev + 1);
              setCurrentPhase(1);
              setCurrentDay(1);
              setMeetings([]);
              setClub(updatedClub);
          }
          
          setPendingDivisionUpdates({});
          setShowPhaseEndModal(null);
          setIsGeneratingSeason(false);
          // Auto rename new adversaries for new divisions
          Object.keys(newDivisions).forEach(teamNum => {
              handleAutoRenameAdversaries(parseInt(teamNum));
          });

      }, 2000);
  };

  const handleUpdateAdversaryName = (teamNum: number, advId: string, newName: string) => {
      setAdversariesByTeam(prev => ({
          ...prev,
          [teamNum]: prev[teamNum].map(a => a.id === advId ? { ...a, name: newName } : a)
      }));
  };

  const handleAutoRenameAdversaries = async (teamNum: number) => {
      if(!club) return;
      setIsAiGeneratingNames(true);
      try {
          // On utilise pendingUpdates si disponible (pour la prochaine phase), sinon la division actuelle
          const targetDivision = pendingDivisionUpdates[teamNum] || club.teamDivisions[teamNum];
          const newNames = await getZoneBasedAdversaries(geographicalZone, targetDivision);
          setAdversariesByTeam(prev => ({
              ...prev,
              [teamNum]: prev[teamNum].map((a, idx) => ({ ...a, name: newNames[idx] || a.name }))
          }));
      } catch (e) {
          console.error(e);
      } finally {
          setIsAiGeneratingNames(false);
      }
  };

  const handleCompetitionRegister = (compId: string, playerIds: string[]) => {
      setCompetitions(prev => prev.map(c => c.id === compId ? { ...c, registeredPlayerIds: playerIds } : c));
  };

  const handleBuyPlayer = (player: Player, price: number) => {
      if (!club) return;
      setClub({ ...club, budget: club.budget - price, players: [...club.players, player] });
      setMarketPlayers(prev => prev.filter(p => p.id !== player.id));
  };

  const handleSellPlayer = (offerId: string) => {
      if (!club) return;
      const offer = incomingOffers.find(o => o.id === offerId);
      if (!offer) return;
      setClub({
          ...club,
          budget: club.budget + offer.amount,
          players: club.players.filter(p => p.id !== offer.playerId)
      });
      setIncomingOffers(prev => prev.filter(o => o.id !== offerId));
  };

  const handleRefuseOffer = (offerId: string) => {
      setIncomingOffers(prev => prev.filter(o => o.id !== offerId));
  };

  const handleToggleListing = (playerId: string) => {
      if (!club) return;
      setClub({
          ...club,
          players: club.players.map(p => p.id === playerId ? { ...p, isTransferListed: !p.isTransferListed } : p)
      });
  };

  const handleCreateNewTeam = () => {
      if (!club) return;
      const cost = 500;
      if (club.budget < cost && !isUnlimitedBudget) return;
      
      const newTeamNum = (club.teamCount || 0) + 1;
      
      const newAdversaries = Array.from({length: 7}).map((_, idx) => ({
          id: `adv-${newTeamNum}-${idx}-${Date.now()}`,
          name: `Adversaire ${newTeamNum}-${idx+1}`,
          managerName: 'IA',
          city: geographicalZone,
          primaryColor: '#333',
          secondaryColor: '#666',
          players: Array.from({length: 4}).map((__, j) => generateRandomPlayer(`adv-p-${newTeamNum}-${idx}-${j}`, 500)),
          budget: 0,
          teamCount: 1,
          teamDivisions: { 1: 'Départementale 4' },
          history: []
      }));

      setAdversariesByTeam(prev => ({...prev, [newTeamNum]: newAdversaries}));

      setClub({
          ...club,
          teamCount: newTeamNum,
          budget: isUnlimitedBudget ? club.budget : club.budget - cost,
          teamDivisions: { ...club.teamDivisions, [newTeamNum]: 'Départementale 4' }
      });
  };

  const handleAddYouth = (players: Player[]) => {
      setYouthPlayers(prev => [...prev, ...players]);
      if (club && !isUnlimitedBudget) setClub({ ...club, budget: club.budget - 200 });
  };

  const handleSignYouth = (player: Player) => {
      if (!club) return;
      setClub({ ...club, players: [...club.players, player] });
      setYouthPlayers(prev => prev.filter(p => p.id !== player.id));
  };

  const handleRemoveYouth = (id: string) => {
      setYouthPlayers(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateYouth = (updated: Player) => {
      setYouthPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleTrainYouth = (player: Player, type: 'basic' | 'stage') => {
      const cost = type === 'basic' ? 50 : 200;
      if (club && !isUnlimitedBudget && club.budget < cost) return;
      
      const updated = { ...player };
      if (type === 'basic') {
          updated.points += 10;
          updated.stats.technique += 2;
      } else {
          updated.points += 40;
          updated.stats.technique += 5;
          updated.experience += 50;
      }
      
      setYouthPlayers(prev => prev.map(p => p.id === player.id ? updated : p));
      if (club && !isUnlimitedBudget) setClub({ ...club, budget: club.budget - cost });
  };

  const handleTrainPlayer = (player: Player, cost: number) => {
      if (!club) return;
      setClub({
          ...club,
          budget: isUnlimitedBudget ? club.budget : club.budget - cost,
          players: club.players.map(p => p.id === player.id ? player : p)
      });
  };

  // IMPORTANT: Updated simulation handler for competitions
  const handleSimulateCompetition = (compId: string) => {
    if (!club) return;
    const comp = competitions.find(c => c.id === compId);
    if (!comp) return;
    
    // Récupérer tous les joueurs inscrits (objets Player complets)
    const registeredPlayers = comp.registeredPlayerIds
        .map(pid => club.players.find(x => x.id === pid))
        .filter((p): p is Player => !!p);

    if (registeredPlayers.length === 0) return;

    // Simulation groupée
    const results = simulateCompetitionFullEvent(comp, registeredPlayers);

    // Mise à jour des stats joueurs
    const updatedPlayers = club.players.map(p => {
        const res = results.find(r => r.playerId === p.id);
        if (res) {
            return { 
                ...p, 
                points: p.points + res.pointChange, 
                careerStats: { 
                    ...p.careerStats, 
                    wins: p.careerStats.wins + res.wins, 
                    losses: p.careerStats.losses + res.losses, 
                    bestPerf: res.pointChange > 0 && res.pointChange > p.careerStats.bestPerf ? res.pointChange : p.careerStats.bestPerf 
                }, 
                fatigue: Math.min(100, p.fatigue + (res.matchesPlayed * 5)), 
                experience: p.experience + (res.matchesPlayed * 2) 
            };
        }
        return p;
    });

    setClub({ ...club, players: updatedPlayers });
    setCompetitions(prev => prev.map(c => c.id === compId ? { ...c, status: 'Terminé', results: results } : c));
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  };

  const handleUpdateDivision = (teamNum: number, newName: string) => {
      if(!club) return;
      setClub({ ...club, teamDivisions: { ...club.teamDivisions, [teamNum]: newName } });
  };

  if (showMenu) return ( <HomeMenu onNewGame={handleNewGame} onContinue={handleContinueGame} onImport={handleImportSave} hasSave={saveExists} savedClubName={savedClubName} /> );
  if (isFirstSetup && !club) return ( <ClubSetup onComplete={(c, z, a, unlim) => { setClub({...c, aiStrategy: 'MANUAL', history: []}); setGeographicalZone(z); setAdversariesByTeam(a); setIsUnlimitedBudget(unlim); setIsFirstSetup(false); }} /> );
  if (!club) return null;

  const viewingMeeting = meetings.find(m => m.id === viewingMeetingId);
  const resolveClub = (clubName: string): Club => { if (clubName === club!.name) return club!; const allAdversaries = (Object.values(adversariesByTeam) as Club[][]).flat() as Club[]; const found = allAdversaries.find(c => c.name === clubName); if (found) return found; return { id: `ghost-club-${clubName}`, name: clubName, city: 'Inconnu', managerName: 'Inconnu', primaryColor: '#333', secondaryColor: '#666', players: [], budget: 0, teamCount: 1, teamDivisions: {}, history: [] } as Club; };
  const resolvePlayers = (meeting: Meeting, side: 'home' | 'away') => { const ids = side === 'home' ? meeting.homePlayers : meeting.awayPlayers; if (meeting.cachedPlayers && meeting.cachedPlayers.length > 0) { return meeting.cachedPlayers.filter(p => ids.includes(p.id)); } const allGlobalPlayers = getAllPlayers(); if (meeting.friendlyData?.advPlayers) { allGlobalPlayers.push(...meeting.friendlyData.advPlayers); } return allGlobalPlayers.filter(p => ids.includes(p.id)); };
  const viewingHomeClub = viewingMeeting ? resolveClub(viewingMeeting.homeClubName) : null;
  const viewingAwayClub = viewingMeeting ? resolveClub(viewingMeeting.awayClubName) : null;
  const groupedMeetings = meetings.reduce((groups, meeting) => { const key = `Phase ${meeting.phaseId} - ${meeting.date}`; if (!groups[key]) groups[key] = []; groups[key].push(meeting); return groups; }, {} as Record<string, Meeting[]>);
  const sortedGroupKeys = Object.keys(groupedMeetings).sort((a, b) => { const phaseA = parseInt(a.split(' ')[1]); const phaseB = parseInt(b.split(' ')[1]); if (phaseA !== phaseB) return phaseB - phaseA; return new Date(b.split(' - ')[1]).getTime() - new Date(a.split(' - ')[1]).getTime(); });
  const hasStartedSeason = meetings.length > 0;
  const seasonLabel = `Saison ${startYear}/${startYear + 1}`;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} clubName={club.name} primaryColor={club.primaryColor} secondaryColor={club.secondaryColor} hasIncomingOffer={incomingOffers.length > 0} seasonLabel={seasonLabel} onReturnToMenu={handleReturnToMenu}>
      <style>{` .btn-club { background-color: var(--club-primary); color: white; } .bg-club-light { background-color: color-mix(in srgb, var(--club-primary), transparent 90%); } .text-club { color: var(--club-primary); } `}</style>
      
      {isGeneratingSeason && <div className="fixed inset-0 z-[400] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white"><i className="fa-solid fa-spinner fa-spin text-5xl mb-4"></i><h2 className="text-2xl font-black uppercase tracking-widest">Génération de la Saison</h2></div>}
      {showPhaseEndModal && (
          <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full text-center animate-in zoom-in-95">
                  <h2 className="text-3xl font-black uppercase mb-6">Fin de la Phase {currentPhase}</h2>
                  {showPhaseEndModal.promotions.length > 0 ? (
                      <div className="mb-6 bg-green-50 p-4 rounded-2xl border border-green-100"><h3 className="text-green-700 font-black uppercase text-sm mb-2">Promotions</h3>{showPhaseEndModal.promotions.map((p, i) => <p key={i} className="text-green-600 font-bold text-xs">{p}</p>)}</div>
                  ) : <div className="mb-4 text-gray-400 text-xs font-bold uppercase">Aucune promotion</div>}
                  
                  {showPhaseEndModal.relegations.length > 0 ? (
                      <div className="mb-6 bg-red-50 p-4 rounded-2xl border border-red-100"><h3 className="text-red-700 font-black uppercase text-sm mb-2">Relégations</h3>{showPhaseEndModal.relegations.map((p, i) => <p key={i} className="text-red-600 font-bold text-xs">{p}</p>)}</div>
                  ) : <div className="mb-4 text-gray-400 text-xs font-bold uppercase">Aucune relégation</div>}
                  
                  <button onClick={() => { setShowPhaseEndModal(null); setActiveTab('mercato'); }} className="btn-club w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg">Accéder au Mercato</button>
              </div>
          </div>
      )}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full text-center animate-in zoom-in-95 border-4 border-red-100">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl animate-bounce">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h2 className="text-2xl font-black uppercase mb-4 text-slate-900">Zone de Danger</h2>
                <p className="text-slate-500 font-bold text-xs uppercase mb-8 leading-relaxed">
                    Attention : Cette action est irréversible.<br/>
                    Voulez-vous vraiment effacer votre sauvegarde et recommencer à zéro ?
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">
                        Annuler
                    </button>
                    <button onClick={confirmReset} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-700 shadow-lg shadow-red-200 transition-all">
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
      )}
      {viewingMeeting && viewingHomeClub && viewingAwayClub && (
         <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
               <button onClick={() => setViewingMeetingId(null)} className="absolute top-4 right-4 z-50 bg-white text-black w-10 h-10 rounded-full flex items-center justify-center font-black text-xl hover:scale-110 transition-transform">&times;</button>
               <MeetingSheet meeting={viewingMeeting} homeClub={viewingHomeClub} awayClub={viewingAwayClub} homePlayers={resolvePlayers(viewingMeeting, 'home')} awayPlayers={resolvePlayers(viewingMeeting, 'away')} />
            </div>
         </div>
      )}
      {activeSimulation && <LiveMatchSimulation meeting={activeSimulation.meeting} homePlayers={activeSimulation.homePlayers} awayPlayers={activeSimulation.awayPlayers} otherMeetings={activeSimulation.otherMeetings} onFinish={handleFinishSimulation} />}
      {showSaveToast && <div className="fixed top-6 right-6 z-[200] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4">✓ Sauvegardé</div>}

      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in pb-20">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
             <div className="absolute inset-0 bg-club-light opacity-20 pointer-events-none"></div>
             <div className="flex items-center gap-6 relative z-10"><ClubLogo primaryColor={club.primaryColor} secondaryColor={club.secondaryColor} size="lg" clubName={club.name} /><div><h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{club.name}</h2><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{seasonLabel} • Phase {currentPhase} • {geographicalZone}</p></div></div>
             <div className="flex gap-4 relative z-10">
                <div className="text-center bg-slate-50 px-8 py-4 rounded-3xl border border-slate-100"><p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Budget</p><p className="text-2xl font-black text-slate-900">{isUnlimitedBudget ? '∞' : `${club.budget}€`}</p></div>
                <div className="text-center bg-club-light px-8 py-4 rounded-3xl border border-club/10"><p className="text-[9px] text-club font-black uppercase tracking-widest mb-1">Journée</p><p className="text-2xl font-black text-slate-900">{isMercatoActive ? 'Mercato' : `${currentDay} / 7`}</p></div>
             </div>
          </div>
          {!hasStartedSeason && <div className="bg-slate-900 rounded-[3rem] p-12 text-center text-white relative overflow-hidden animate-pulse cursor-pointer" onClick={handleQuickStart}><div className="relative z-10 max-w-2xl mx-auto space-y-6"><h2 className="text-4xl font-black uppercase tracking-tighter">La Saison commence !</h2><button onClick={(e) => { e.stopPropagation(); handleQuickStart(); }} className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all">Configurer le match ci-dessous</button></div></div>}
          {isMercatoActive && <div className="bg-blue-600 rounded-[3rem] p-12 text-center text-white relative overflow-hidden cursor-pointer" onClick={() => setActiveTab('mercato')}><div className="relative z-10 max-w-2xl mx-auto space-y-4"><h2 className="text-3xl font-black uppercase tracking-tighter">Mercato Ouvert !</h2><button className="bg-white text-blue-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg">Accéder au Mercato</button></div></div>}
          {!isMercatoOpen && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                <div className="flex justify-between items-center px-4"><h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Composition Équipe {selectedRankingTeam}</h3><div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">{Array.from({ length: club.teamCount || 0 }, (_, i) => i + 1).map(num => (<button key={num} onClick={() => setSelectedRankingTeam(num)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${selectedRankingTeam === num ? 'btn-club shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>E{num}</button>))}</div></div>
                <div ref={compositionSectionRef} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm transition-all duration-500">
                    <div className="flex justify-between items-center mb-6"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stratégie</p><div className="flex p-1 bg-slate-100 rounded-xl"><button onClick={() => club && setClub({...club, aiStrategy: 'MANUAL'})} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${club.aiStrategy === 'MANUAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Manuel</button><button onClick={() => { if (club) { const nc = {...club, aiStrategy: 'STRATEGIC'}; setClub(nc); triggerAIOptimization(nc); } }} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${club.aiStrategy === 'STRATEGIC' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'}`}>IA Auto</button></div></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {Array.from({length: 4}).map((_, idx) => {
                        const pId = selectedHomePlayers[selectedRankingTeam]?.[idx]; const p = club.players.find(x => x.id === pId);
                        return p ? (
                        <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border border-slate-100 group animate-in zoom-in-95 ${p.injuryStatus === 'SERIOUS' ? 'bg-red-50' : 'bg-slate-50'}`}><div className="flex items-center gap-4"><img src={p.photoUrl} className="w-10 h-10 rounded-full border bg-white" alt="" /><div><p className="text-sm font-black text-slate-900">{p.name}</p><div className="flex gap-2 text-[9px]"><span className="font-bold uppercase text-slate-400">{Math.round(p.points)} pts</span>{p.injuryStatus === 'SERIOUS' ? <span className="font-bold uppercase text-red-500 bg-red-100 px-1 rounded">BLESSÉ ({p.injuryDuration}j)</span> : <span className="font-bold uppercase text-slate-300">• {p.category}</span>}</div></div></div>{club.aiStrategy === 'MANUAL' && <button onClick={() => { const ns = {...selectedHomePlayers}; ns[selectedRankingTeam] = (ns[selectedRankingTeam] || []).filter(id => id !== p.id); setSelectedHomePlayers(ns); }} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-times"></i></button>}</div>
                        ) : ( <button disabled={club.aiStrategy === 'STRATEGIC'} onClick={() => setIsAssigningPlayer({team: selectedRankingTeam, slot: idx})} className="h-[68px] border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 hover:bg-slate-50 hover:border-club/30 transition-all text-[10px] font-black uppercase tracking-widest gap-2"><i className="fa-solid fa-plus-circle"></i> Assigner</button> );
                    })}
                    </div>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => { 
                            const t = selectedRankingTeam; 
                            const currentCompoIds = selectedHomePlayers[t] || []; 
                            const hasInjured = currentCompoIds.some(id => { const p = club.players.find(pl => pl.id === id); return p && p.injuryStatus === 'SERIOUS'; }); 
                            if (hasInjured) { alert("Action impossible : Vous avez aligné un joueur blessé ! Veuillez le remplacer."); return; } 
                            const pool = adversariesByTeam[t] || []; if (pool.length === 0) { alert("Erreur: Aucun adversaire."); return; } 
                            const matchups = getDayMatchups(currentDay, club.id, pool);
                            const myMatch = matchups.find(m => m.home === club.id || m.away === club.id);
                            if (!myMatch) { alert("Erreur: Calendrier invalide. Impossible de trouver l'adversaire du jour."); return; }
                            const adv = (myMatch.home === club.id ? myMatch.away : myMatch.home) as Club;
                            const homeTeamPlayers = currentCompoIds.map(id => club.players.find(p => p.id === id)).filter((p): p is Player => !!p);
                            const emptyMeeting: Meeting = { id: `meet-${Date.now()}`, date: new Date().toLocaleDateString(), teamNumber: t, divisionName: club.teamDivisions[t], homeClubName: club.name, awayClubName: adv.name, homePlayers: currentCompoIds, awayPlayers: adv.players.map(p => p.id), matches: [], homeScore: 0, awayScore: 0, isCompleted: false, phaseId: currentPhase, type: 'LEAGUE', dayNumber: currentDay }; 
                            const fullUserMeeting = simulateMeeting(emptyMeeting, homeTeamPlayers, adv.players); 
                            const otherMeetings = simulateLeagueDay(currentDay, currentPhase, adversariesByTeam[t] || [], club.id, fullUserMeeting.divisionName || 'Ligue', t, adv.id); 
                            setActiveSimulation({ meeting: fullUserMeeting, homePlayers: club.players, awayPlayers: adv.players, otherMeetings: otherMeetings }); 
                        }} 
                        disabled={selectedHomePlayers[selectedRankingTeam]?.length !== 4 || isOptimizing} 
                        className={`w-full py-5 rounded-[1.5rem] text-sm font-black uppercase tracking-widest shadow-xl transition-all duration-300 ${selectedHomePlayers[selectedRankingTeam]?.length === 4 ? (hasStartedSeason ? 'btn-club transform hover:scale-[1.02]' : 'bg-slate-900 text-white animate-pulse transform hover:scale-[1.02]') : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                        >
                            {isOptimizing ? 'Calcul Tactique...' : (!hasStartedSeason ? 'Lancer la Saison' : 'Jouer le Match')}
                        </button>
                    </div>
                </div>
                </div>
                <div className="lg:col-span-4 space-y-6 h-full flex flex-col"><div className="flex-1 min-h-[400px]"><ClubRanking players={club.players} /></div><div><LeagueTable rankings={calculateRankingsForTeam(selectedRankingTeam, currentPhase)} title={`Phase ${currentPhase} - J${currentDay}`} /></div></div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'players' && club && (
        <div className="space-y-6 animate-in fade-in pb-20">
            <div className="flex justify-between items-center px-2">
                <div><h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Effectif Pro</h2><p className="text-slate-500 font-bold text-xs uppercase tracking-widest">{club.players.length} Joueurs sous contrat</p></div>
                <div className="flex gap-2"><button onClick={() => setPlayerSort('points')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${playerSort === 'points' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>Points</button><button onClick={() => setPlayerSort('age')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${playerSort === 'age' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>Âge</button></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {club.players.sort((a,b) => playerSort === 'points' ? b.points - a.points : a.age - b.age).map(p => <PlayerCard key={p.id} player={p} onDelete={deletePlayer} onEdit={setEditingPlayer} />)}
                <div className="flex items-center justify-center min-h-[300px] border-4 border-dashed border-slate-200 rounded-[2rem] hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setIsRecruitModalOpen(true)}><div className="text-center group-hover:scale-110 transition-transform"><i className="fa-solid fa-plus-circle text-4xl text-slate-300 mb-2 group-hover:text-blue-500"></i><p className="font-black text-slate-300 uppercase tracking-widest group-hover:text-blue-500">Recruter</p></div></div>
            </div>
        </div>
      )}

      {activeTab === 'competitions' && club && (
        <CompetitionsTab 
            club={club} 
            competitions={competitions} 
            onRegister={handleCompetitionRegister} 
            onSimulate={handleSimulateCompetition} 
            teamRankings={Array.from({ length: club.teamCount }).reduce((acc, _, i) => { acc[i+1] = calculateRankingsForTeam(i+1, currentPhase); return acc; }, {} as Record<number, RankingEntry[]>)} 
            onUpdateDivision={handleUpdateDivision} 
            allMeetings={meetings} 
            currentPhase={currentPhase} 
        />
      )}

      {activeTab === 'statistics' && club && <StatisticsTab players={club.players} club={club} />}
      {activeTab === 'mercato' && club && ( <TransferMarket club={club} marketPlayers={marketPlayers} incomingOffers={incomingOffers} onBuy={handleBuyPlayer} onSell={handleSellPlayer} onRefuse={handleRefuseOffer} onToggleListing={handleToggleListing} onCreateNewTeam={handleCreateNewTeam} youthPlayers={youthPlayers} onAddYouth={handleAddYouth} onSignYouth={handleSignYouth} onRemoveYouth={handleRemoveYouth} onUpdateYouth={handleUpdateYouth} onTrainYouth={handleTrainYouth} isUnlimitedBudget={isUnlimitedBudget} isOpen={isMercatoActive} onCloseMercato={isMercatoActive ? handleCloseMercatoAndStartPhase : undefined} /> )}
      {activeTab === 'training' && club && <TrainingTab club={club} onTrainPlayer={handleTrainPlayer} />}
      {activeTab === 'meetings' && (
          <div className="space-y-4 max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-black text-slate-900 uppercase">Matchs Joués</h2></div>
              {meetings.length === 0 ? <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100"><p className="text-slate-400 font-bold">Aucun match joué pour le moment.</p></div> : (sortedGroupKeys.map(key => (<div key={key} className="space-y-4"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4">{key}</h3>{groupedMeetings[key].map(m => (<div key={m.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center hover:shadow-md transition-all cursor-pointer" onClick={() => setViewingMeetingId(m.id)}><div className="flex-1 text-right"><span className={`font-black text-sm uppercase ${m.homeScore > m.awayScore ? 'text-green-600' : 'text-slate-900'}`}>{m.homeClubName}</span></div><div className="px-6 flex flex-col items-center"><span className="text-2xl font-black bg-slate-900 text-white px-4 py-1 rounded-xl">{m.homeScore} - {m.awayScore}</span><span className="text-[9px] font-bold text-slate-400 uppercase mt-1">{m.type === 'FRIENDLY' ? 'Amical' : m.divisionName}</span></div><div className="flex-1 text-left"><span className={`font-black text-sm uppercase ${m.awayScore > m.homeScore ? 'text-green-600' : 'text-slate-900'}`}>{m.awayClubName}</span></div></div>))}</div>)))}
          </div>
      )}
      
      {activeTab === 'settings' && (
        <div className="space-y-8 animate-in fade-in max-w-4xl mx-auto pb-20">
           <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
              <h2 className="text-3xl font-black text-slate-900 uppercase">Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={handleManualSave} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-colors">Sauvegarde Rapide</button>
                  <button onClick={handleExportSave} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-colors">Exporter (JSON)</button>
              </div>

              {/* Load Game Button */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <h3 className="font-black text-slate-900 uppercase text-sm mb-4">Charger une partie</h3>
                  <div className="relative">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 bg-white border-2 border-dashed border-slate-300 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-slate-500 hover:text-slate-700 transition-all flex items-center justify-center gap-2"
                      >
                        <i className="fa-solid fa-upload"></i>
                        Sélectionner un fichier de sauvegarde (.json)
                      </button>
                      <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleSettingsFileLoad}
                      />
                  </div>
              </div>

              <div className="border-t border-slate-100 pt-8"><h3 className="text-xl font-black text-slate-900 uppercase mb-4 flex items-center gap-3"><i className="fa-solid fa-users-gear text-slate-300"></i> Gestion des Adversaires</h3><p className="text-xs text-slate-500 mb-6 leading-relaxed">Personnalisez le nom des clubs adverses pour chaque équipe.</p>
                  <div className="space-y-4">
                      {Array.from({ length: club.teamCount }).map((_, i) => {
                          const teamNum = i + 1; const adversaries = adversariesByTeam[teamNum] || []; const isEditing = editingAdversariesTeam === teamNum;
                          return (
                              <div key={teamNum} className={`border rounded-[2rem] overflow-hidden transition-all ${isEditing ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 bg-white'}`}><div className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setEditingAdversariesTeam(isEditing ? null : teamNum)}><div><h4 className="font-black uppercase text-sm text-slate-900">Équipe {teamNum} - {club.teamDivisions[teamNum]}</h4><p className="text-[10px] font-bold text-slate-400 uppercase">{adversaries.length} Adversaires</p></div><i className={`fa-solid fa-chevron-down transition-transform ${isEditing ? 'rotate-180' : ''}`}></i></div>{isEditing && (<div className="p-5 border-t border-slate-100 bg-white animate-in slide-in-from-top-2"><div className="flex justify-end mb-4"><button onClick={() => handleAutoRenameAdversaries(teamNum)} disabled={isAiGeneratingNames} className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-200 transition-all disabled:opacity-50">{isAiGeneratingNames ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>} Générer via IA</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{adversaries.map((adv, idx) => (<div key={adv.id} className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-300 w-6">{idx + 1}</span><input value={adv.name} onChange={(e) => handleUpdateAdversaryName(teamNum, adv.id, e.target.value)} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" /></div>))}</div></div>)}</div>
                          );
                      })}
                  </div>
              </div>

              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 mt-8">
                  <h3 className="font-black text-red-900 uppercase text-sm mb-4">Zone de Danger</h3>
                  <button 
                    onClick={handleResetGame}
                    className="w-full py-4 bg-white border-2 border-red-200 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                  >
                    <i className="fa-solid fa-trash-can mr-2"></i>
                    Réinitialiser la partie
                  </button>
              </div>
           </div>
        </div>
      )}
      {isAssigningPlayer && ( <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"><div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95"><div className="p-6 bg-slate-900 text-white flex justify-between items-center"><h3 className="font-black uppercase text-xs tracking-widest">Assigner un joueur (Eq. {isAssigningPlayer.team})</h3><button onClick={() => setIsAssigningPlayer(null)} className="text-2xl">&times;</button></div><div className="overflow-y-auto p-4 space-y-2 flex-1">{club.players.sort((a,b) => b.points - a.points).map(p => { const assigned = (Object.values(selectedHomePlayers) as string[][]).some(team => team.includes(p.id)); const isInjured = p.injuryStatus === 'SERIOUS'; const disabled = assigned || isInjured; return (<button key={p.id} disabled={disabled} onClick={() => { const ns = { ...selectedHomePlayers }; const ts = [...(ns[isAssigningPlayer.team] || [])]; if (ts.length < 4) { ts.push(p.id); ns[isAssigningPlayer.team] = ts; setSelectedHomePlayers(ns); setIsAssigningPlayer(null); } }} className={`w-full flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${disabled ? 'opacity-60 bg-slate-50 cursor-not-allowed' : 'bg-white hover:border-club shadow-sm'}`}><div className="flex items-center gap-3"><img src={p.photoUrl} className="w-10 h-10 rounded-full border" alt="" /><div className="text-left"><p className="text-xs font-black">{p.name}</p><div className="flex gap-2 text-[9px]"><span className="text-club uppercase font-bold">{Math.round(p.points)} pts</span><span className="text-slate-400 font-bold uppercase">• {p.category}</span></div></div></div>{isInjured ? (<span className="text-[8px] font-black text-red-500 bg-red-100 px-2 py-1 rounded">BLESSÉ ({p.injuryDuration}j)</span>) : assigned && (<span className="text-[8px] font-black text-slate-400">EN JEU</span>)}</button>); })}</div></div></div> )}
      {isRecruitModalOpen && <RecruitModal isOpen={isRecruitModalOpen} onClose={() => setIsRecruitModalOpen(false)} onRecruit={(p, c) => setClub(prev => prev ? {...prev, budget: isUnlimitedBudget ? prev.budget : prev.budget - c, players: [...prev.players, p]} : null)} currentBudget={isUnlimitedBudget ? 999999 : (club.budget || 0)} />}
      {editingPlayer && <EditPlayerModal isOpen={!!editingPlayer} player={editingPlayer} onClose={() => setEditingPlayer(null)} onUpdate={(up) => setClub(prev => prev ? {...prev, players: prev.players.map(x => x.id === up.id ? up : x)} : null)} />}
      {isManualMeetingOpen && club && ( <ManualMeetingModal isOpen={isManualMeetingOpen} onClose={() => setIsManualMeetingOpen(false)} club={club} adversaries={(Object.values(adversariesByTeam) as Club[][]).flat() as Club[]} currentPhase={currentPhase} onCreate={(m) => { let awayPlayersList: Player[] = []; if (m.type === 'FRIENDLY') { if ((m as any)._friendlyData?.advPlayers) { awayPlayersList = (m as any)._friendlyData.advPlayers; } else { const baseLevel = 2000; awayPlayersList = Array.from({length: 4}).map((_, i) => generateRandomPlayer(`p-amical-opp-${Date.now()}-${i}`, baseLevel)); } } else { const advPool = (Object.values(adversariesByTeam) as Club[][]).flat() as Club[]; const advClub = advPool.find(c => c.name === m.awayClubName); awayPlayersList = advClub ? advClub.players : []; } const fullMeeting = simulateMeeting(m, club.players, awayPlayersList); setActiveSimulation({ meeting: fullMeeting, homePlayers: club.players, awayPlayers: awayPlayersList, otherMeetings: [] }); }} /> )}
    </Layout>
  );
};

export default App;