
import { Player, Match, MatchSet, Meeting, Club, PlayStyle, CompetitionResult, Competition, PointResult, PointType } from '../types';
import { generateRandomPlayer, calculatePointsFromStats } from '../constants';

// --- LOGIQUE EXISTANTE (Matchs, Points, Ligues) ---

export const getDayMatchups = (currentDay: number, userClubId: string, adversaryClubs: Club[]): { home: Club | string, away: Club | string }[] => {
    const totalTeams = 8;
    const matches: { home: Club | string, away: Club | string }[] = [];
    
    if (adversaryClubs.length !== 7) return [];

    const teamIndices = Array.from({ length: totalTeams }, (_, i) => i);
    const getClubByIndex = (idx: number): Club | string => {
        if (idx === 0) return userClubId;
        return adversaryClubs[idx - 1];
    };

    const round = currentDay - 1;
    const rotating = teamIndices.slice(1);
    
    for (let r = 0; r < round; r++) {
        const last = rotating.pop();
        if (last !== undefined) rotating.unshift(last);
    }
    
    const dayIndices = [0, ...rotating];
    
    const N = totalTeams;
    for (let i = 0; i < N / 2; i++) {
        const t1 = dayIndices[i];
        const t2 = dayIndices[N - 1 - i];
        
        if ((currentDay + i) % 2 === 0) {
            matches.push({ home: getClubByIndex(t2), away: getClubByIndex(t1) });
        } else {
            matches.push({ home: getClubByIndex(t1), away: getClubByIndex(t2) });
        }
    }
    return matches;
};

// Grille Officielle FFTT
export const calculatePointExchange = (winnerPoints: number, loserPoints: number): { gain: number, loss: number } => {
  const diff = Math.abs(winnerPoints - loserPoints);
  const isNormal = winnerPoints >= loserPoints;

  let row = 0;
  if (diff >= 500) row = 8;
  else if (diff >= 400) row = 7;
  else if (diff >= 300) row = 6;
  else if (diff >= 200) row = 5;
  else if (diff >= 150) row = 4;
  else if (diff >= 100) row = 3;
  else if (diff >= 50) row = 2;
  else if (diff >= 25) row = 1;
  else row = 0;

  const normalWin = [6, 5.5, 5, 4, 3, 2, 1, 0.5, 0];
  const normalLoss = [-5, -4.5, -4, -3, -2, -1, -0.5, 0, 0];
  const abnormalWin = [6, 7, 8, 10, 13, 17, 22, 28, 40];
  const abnormalLoss = [-5, -6, -7, -8, -10, -12.5, -16, -20, -29];

  if (isNormal) {
      return { gain: normalWin[row], loss: normalLoss[row] };
  } else {
      return { gain: abnormalWin[row], loss: abnormalLoss[row] };
  }
};

const getStyleMatchupBonus = (styleA: PlayStyle, styleB: PlayStyle): number => {
  const BONUS = 30; 
  if (styleA === PlayStyle.Attacker) {
    if (styleB === PlayStyle.Blocker || styleB === PlayStyle.Crabe) return BONUS;
    if (styleB === PlayStyle.Defender || styleB === PlayStyle.ModernDef) return -BONUS;
  }
  return 0;
};

const generatePointDescription = (winner: Player, loser: Player, type: PointType): string => {
    const wName = winner.name.split(' ')[0];
    switch(type) {
        case 'ACE': return "Service gagnant direct !";
        case 'WINNER': return `Attaque gagnante de ${wName}.`;
        case 'UNFORCED_ERROR': return "Faute directe.";
        case 'LUCKY': return "Filet et bord !";
        case 'FORCED_ERROR': return "Adversaire poussé à la faute.";
        default: return `Point pour ${wName}.`;
    }
};

const simulatePointDetails = (pA: Player, pB: Player, currentScoreA: number, currentScoreB: number, events: string[], matchStatus: any, injuredIds: string[]): PointResult => {
  let perfA = pA.points * 0.4 + (pA.stats.attack * 1.5) - (pB.stats.defense * 0.5) + pA.stats.speed + Math.random() * 500;
  let perfB = pB.points * 0.4 + (pB.stats.attack * 1.5) - (pA.stats.defense * 0.5) + pB.stats.speed + Math.random() * 500;
  perfA += getStyleMatchupBonus(pA.style, pB.style);
  
  // Chance d'ACE ou de coup de chance
  const rand = Math.random();
  let type: PointType = 'WINNER';
  
  if (rand > 0.95) type = 'LUCKY';
  else if (rand > 0.90 && pA.stats.technique > pB.stats.tactical) type = 'ACE';
  else if (rand < 0.1) type = 'UNFORCED_ERROR';

  const winner = perfA > perfB ? 'A' : 'B';
  
  // Si c'est une faute directe, le gagnant est l'autre
  if (type === 'UNFORCED_ERROR') {
      return { 
          winner: winner === 'A' ? 'B' : 'A', 
          type: 'UNFORCED_ERROR', 
          description: `Faute directe de ${winner === 'A' ? pA.name.split(' ')[0] : pB.name.split(' ')[0]}.` 
      };
  }

  return { 
      winner, 
      type, 
      description: generatePointDescription(winner === 'A' ? pA : pB, winner === 'A' ? pB : pA, type) 
  };
};

export const simulateSet = (playerA: Player, playerB: Player, events: string[], matchStatus: any, injuredIds: string[]): { scoreA: number, scoreB: number, log: PointResult[] } => {
  let scoreA = 0; 
  let scoreB = 0; 
  const log: PointResult[] = [];
  
  // Règle : 11 points min, 2 points d'écart
  while (true) {
    const result = simulatePointDetails(playerA, playerB, scoreA, scoreB, events, matchStatus, injuredIds);
    log.push(result);
    if (result.winner === 'A') scoreA++; else scoreB++;
    
    // Condition de victoire
    if ((scoreA >= 11 && scoreA >= scoreB + 2) || (scoreB >= 11 && scoreB >= scoreA + 2)) {
        break;
    }
    
    // Sécurité boucle infinie (très rare)
    if (scoreA > 50 || scoreB > 50) break;
  }
  return { scoreA, scoreB, log };
};

export const simulateMatch = (playerA: Player, playerB: Player): Match => {
  const sets: MatchSet[] = [];
  const fullLog: PointResult[] = [];
  let winsA = 0, winsB = 0;
  
  // 3 manches gagnantes
  while (winsA < 3 && winsB < 3) {
    const { scoreA, scoreB, log } = simulateSet(playerA, playerB, [], {}, []);
    sets.push({ scoreA, scoreB });
    fullLog.push(...log);
    
    if (scoreA > scoreB) winsA++; else winsB++;
  }
  
  const winnerId = winsA > winsB ? playerA.id : playerB.id;
  const calculation = calculatePointExchange(
    winnerId === playerA.id ? playerA.points : playerB.points,
    winnerId === playerA.id ? playerB.points : playerA.points
  );
  
  return { 
      playerAId: playerA.id, 
      playerBId: playerB.id, 
      sets, 
      winnerId, 
      pointCalculation: calculation, 
      injuredPlayerIds: [],
      detailedLog: fullLog
  };
};

const createDoublePairPlayer = (p1: Player, p2: Player, idSuffix: string): Player => {
  return {
    ...p1, id: `DBL-${idSuffix}`, name: "Double", points: Math.round((p1.points + p2.points) / 2),
    style: PlayStyle.Allround, 
    stats: { attack: (p1.stats.attack + p2.stats.attack)/2, defense: (p1.stats.defense + p2.stats.defense)/2, speed: (p1.stats.speed + p2.stats.speed)/2, mental: (p1.stats.mental + p2.stats.mental)/2, stamina: (p1.stats.stamina + p2.stats.stamina)/2, technique: (p1.stats.technique + p2.stats.technique)/2, tactical: (p1.stats.tactical + p2.stats.tactical)/2 },
    fatigue: (p1.fatigue + p2.fatigue)/2, condition: 100, experience: 0, careerStats: { wins: 0, losses: 0, setsWon: 0, setsLost: 0, bestPerf: 0 }
  };
};

const createGhostPlayer = (id: string): Player => ({
    id, name: "Forfait", gender: 'M', photoUrl: '', points: 0, age: 0, category: 'Senior', handed: 'Right', style: PlayStyle.Allround,
    stats: { attack: 0, defense: 0, speed: 0, mental: 0, stamina: 0, technique: 0, tactical: 0 },
    fatigue: 100, condition: 0, injuryStatus: 'HEALTHY', experience: 0, careerStats: { wins: 0, losses: 0, setsWon: 0, setsLost: 0, bestPerf: 0 }
});

export const simulateMeeting = (meeting: Meeting, homePlayers: Player[], awayPlayers: Player[]): Meeting => {
  const updatedMeeting = { ...meeting, matches: [], homeScore: 0, awayScore: 0, isCompleted: true };
  let orders: any[] = [[0, 0], [1, 1], [2, 2], [3, 3], [0, 1], [1, 0], [3, 2], [2, 3], ['D1', 'D1'], ['D2', 'D2'], [0, 2], [2, 0], [3, 1], [1, 3]];
  if (homePlayers.length <= 2) orders = [[0, 0], [1, 1], ['D1', 'D1'], [0, 1], [1, 0]]; // Format Coupe Davis réduit

  orders.forEach(([hIdx, aIdx]) => {
    let pA: Player, pB: Player;
    if (typeof hIdx === 'string') {
        const h1 = homePlayers[0] || createGhostPlayer('g'); const h2 = homePlayers[1] || createGhostPlayer('g');
        const a1 = awayPlayers[0] || createGhostPlayer('g'); const a2 = awayPlayers[1] || createGhostPlayer('g');
        pA = createDoublePairPlayer(h1, h2, `H-${hIdx}`); pB = createDoublePairPlayer(a1, a2, `A-${aIdx}`);
    } else {
        pA = homePlayers[hIdx as number] || createGhostPlayer(`g`); pB = awayPlayers[aIdx as number] || createGhostPlayer(`g`);
    }
    const match = simulateMatch(pA, pB);
    updatedMeeting.matches.push(match);
    if (match.winnerId === pA.id) updatedMeeting.homeScore++; else updatedMeeting.awayScore++;
  });
  return updatedMeeting;
};

export const simulateLeagueDay = (day: number, phaseId: number, allClubs: Club[], userClubId: string, divisionName: string, teamNumber: number, excludedClubId?: string): Meeting[] => {
  const results: Meeting[] = [];
  const adversaries = allClubs.filter(c => c.id !== userClubId);
  const matchups = getDayMatchups(day, userClubId, adversaries);
  
  matchups.forEach(match => {
      if (match.home === userClubId || match.away === userClubId) return;
      if ((typeof match.home !== 'string' && match.home.id === excludedClubId) || (typeof match.away !== 'string' && match.away.id === excludedClubId)) return;
      const homeClub = match.home as Club; const awayClub = match.away as Club;
      const hPlayers = homeClub.players.slice(0, 4); const aPlayers = awayClub.players.slice(0, 4);
      while(hPlayers.length < 4) hPlayers.push(createGhostPlayer(`h-ghost-${homeClub.id}-${hPlayers.length}`));
      while(aPlayers.length < 4) aPlayers.push(createGhostPlayer(`a-ghost-${awayClub.id}-${aPlayers.length}`));
      const m: Meeting = { id: `league-${phaseId}-${day}-${homeClub.id}-${awayClub.id}`, date: new Date().toLocaleDateString(), teamNumber, divisionName, homeClubName: homeClub.name, awayClubName: awayClub.name, homePlayers: hPlayers.map(p => p.id), awayPlayers: aPlayers.map(p => p.id), matches: [], homeScore: 0, awayScore: 0, isCompleted: true, phaseId, type: 'LEAGUE', dayNumber: day, cachedPlayers: [...hPlayers, ...aPlayers] };
      results.push(simulateMeeting(m, hPlayers, aPlayers));
  });
  return results;
};

// --- NOUVELLE LOGIQUE COMPETITIONS JEUNES ---

// Simulation Championnat par Équipes Jeunes (Paires) avec Poules de 4
const simulateYouthTeamTournament = (competition: Competition, registeredPlayers: Player[]): CompetitionResult[] => {
    const pairs: Player[][] = [];
    for(let i=0; i<registeredPlayers.length; i+=2) {
        if(i+1 < registeredPlayers.length) {
            pairs.push([registeredPlayers[i], registeredPlayers[i+1]]);
        }
    }

    const results: CompetitionResult[] = [];

    pairs.forEach((pair, idx) => {
        const p1 = pair[0];
        const p2 = pair[1];
        
        // On simule une poule de 4 équipes (3 adversaires)
        // Victoire d'équipe = 3 points, Défaite = 1 point
        let teamPoints = 0;
        let p1IndividualWins = 0, p1IndividualLosses = 0;
        let p2IndividualWins = 0, p2IndividualLosses = 0;
        let pointsChangeP1 = 0;
        let pointsChangeP2 = 0;

        for (let r=0; r<3; r++) {
            // Créer adversaires
            const avgPts = (p1.points + p2.points) / 2;
            const variance = Math.floor(Math.random() * 200) - 100;
            const adv1 = generateRandomPlayer(`ai-youth-opp-${idx}-${r}-1`, avgPts + variance);
            const adv2 = generateRandomPlayer(`ai-youth-opp-${idx}-${r}-2`, avgPts + variance);

            // Simuler la rencontre (Format Coupe Davis)
            let matchScoreUser = 0;
            
            // Simples A vs A, B vs B
            let m = simulateMatch(p1, adv1); if (m.winnerId === p1.id) { matchScoreUser++; p1IndividualWins++; pointsChangeP1 += m.pointCalculation?.gain||0; } else { p1IndividualLosses++; pointsChangeP1 += m.pointCalculation?.loss||0; }
            m = simulateMatch(p2, adv2); if (m.winnerId === p2.id) { matchScoreUser++; p2IndividualWins++; pointsChangeP2 += m.pointCalculation?.gain||0; } else { p2IndividualLosses++; pointsChangeP2 += m.pointCalculation?.loss||0; }
            
            // Double
            const dUser = createDoublePairPlayer(p1, p2, 'usr');
            const dAdv = createDoublePairPlayer(adv1, adv2, 'adv');
            m = simulateMatch(dUser, dAdv); if (m.winnerId === dUser.id) matchScoreUser++;

            // Simples croisés A vs B, B vs A
            m = simulateMatch(p1, adv2); if (m.winnerId === p1.id) { matchScoreUser++; p1IndividualWins++; pointsChangeP1 += m.pointCalculation?.gain||0; } else { p1IndividualLosses++; pointsChangeP1 += m.pointCalculation?.loss||0; }
            m = simulateMatch(p2, adv1); if (m.winnerId === p2.id) { matchScoreUser++; p2IndividualWins++; pointsChangeP2 += m.pointCalculation?.gain||0; } else { p2IndividualLosses++; pointsChangeP2 += m.pointCalculation?.loss||0; }

            if (matchScoreUser >= 3) teamPoints += 3; else teamPoints += 1;
        }

        // Déterminer le classement final dans la poule (simulé)
        // 9 pts (3 vict) -> 1er
        // 7 pts (2 vict) -> 2eme
        // 5 pts (1 vict) -> 3eme
        // 3 pts (0 vict) -> 4eme
        let finalRank = 4;
        let rankLabel = "4ème de Poule";
        let movement = "Descente"; // Par défaut le 4ème descend souvent

        if (teamPoints === 9) { finalRank = 1; rankLabel = "1er de Poule"; movement = "Montée"; }
        else if (teamPoints >= 7) { finalRank = 2; rankLabel = "2ème de Poule"; movement = "Maintien"; }
        else if (teamPoints >= 5) { finalRank = 3; rankLabel = "3ème de Poule"; movement = "Maintien"; }

        // Cas spécial finales
        if (competition.id.includes('finales')) {
            movement = teamPoints >= 7 ? "Podium" : "Non classé";
        }

        const fullLabel = `${rankLabel} (${movement})`;

        results.push({
            playerId: p1.id,
            playerName: p1.name,
            playerPoints: Math.round(p1.points),
            rank: fullLabel,
            partnerName: p2.name,
            divisionLevel: competition.level,
            isPromoted: movement === "Montée",
            isRelegated: movement === "Descente",
            pointChange: pointsChangeP1,
            matchesPlayed: 6, // 3 tours * 2 matchs simples
            wins: p1IndividualWins,
            losses: p1IndividualLosses
        });

        results.push({
            playerId: p2.id,
            playerName: p2.name,
            playerPoints: Math.round(p2.points),
            rank: fullLabel,
            partnerName: p1.name,
            divisionLevel: competition.level,
            isPromoted: movement === "Montée",
            isRelegated: movement === "Descente",
            pointChange: pointsChangeP2,
            matchesPlayed: 6,
            wins: p2IndividualWins,
            losses: p2IndividualLosses
        });
    });

    return results;
};

// 1. Simulation d'un tournoi "Full Ranking" (Critérium, Finales par classement)
const simulateFullRankingTournament = (competition: Competition, registeredPlayers: Player[]): CompetitionResult[] => {
    const poolSize = competition.id.includes('finales') ? 32 : 16;
    const participants: Player[] = [...registeredPlayers];
    const avgPoints = registeredPlayers.reduce((sum, p) => sum + p.points, 0) / (registeredPlayers.length || 1);
    while(participants.length < poolSize) {
        participants.push(generateRandomPlayer(`ai-comp-${Date.now()}-${participants.length}`, avgPoints + (Math.random()*400 - 200)));
    }
    const rankedParticipants = participants.map(p => {
        let score = p.points + (Math.random() * 300);
        if (registeredPlayers.find(rp => rp.id === p.id)) score += 50; 
        return { player: p, score };
    }).sort((a, b) => b.score - a.score);

    const results: CompetitionResult[] = [];
    registeredPlayers.forEach(p => {
        const rankIndex = rankedParticipants.findIndex(rp => rp.player.id === p.id);
        const rankPos = rankIndex + 1;
        
        let wins = 0, losses = 0;
        const totalRounds = Math.log2(poolSize);
        if (rankPos === 1) { wins = totalRounds; losses = 0; }
        else if (rankPos === 2) { wins = totalRounds - 1; losses = 1; }
        else {
            wins = Math.max(0, Math.floor(totalRounds - (rankPos / 4)));
            losses = Math.max(1, Math.ceil(Math.random() * 2));
        }
        const pointChange = Math.round(40 - (rankPos * 3)); 
        let rankLabel = `${rankPos}ème`;
        if (rankPos === 1) rankLabel = "Vainqueur (1er)";
        if (rankPos === 2) rankLabel = "Finaliste (2ème)";

        results.push({
            playerId: p.id,
            playerName: p.name,
            playerPoints: Math.round(p.points),
            rank: rankLabel,
            exactRank: rankPos,
            divisionLevel: competition.level,
            isPromoted: competition.id.includes('crit-fed') && rankPos === 1,
            isRelegated: competition.id.includes('crit-fed') && rankPos >= poolSize - 2,
            isQualified: rankPos <= 2,
            pointChange,
            matchesPlayed: wins + losses,
            wins,
            losses
        });
    });
    return results;
};

// Dispatcher principal
export const simulateCompetitionFullEvent = (competition: Competition, registeredPlayers: Player[]): CompetitionResult[] => {
    if (competition.id.includes('crit-fed') || competition.id.includes('finales-rank')) {
        return simulateFullRankingTournament(competition, registeredPlayers);
    }
    
    if (competition.name.includes("Champ. Jeunes") || competition.teamSize === 2) {
        return simulateYouthTeamTournament(competition, registeredPlayers);
    }

    // Fallback : Simulation simple pour les tournois randoms
    return registeredPlayers.map(p => simulateCompetitionResultDetails(p, competition));
};

export const simulateCompetitionResultDetails = (player: Player, competition: Competition): CompetitionResult => {
  const rand = Math.random();
  const skillFactor = Math.min(1, player.points / (competition.maxPoints || 3000));
  const totalScore = skillFactor + (rand * 0.5);

  let rank = "Poules";
  let matchesPlayed = 3 + Math.floor(Math.random() * 4);
  let wins = Math.floor(matchesPlayed * (totalScore * 0.6));
  let losses = matchesPlayed - wins;
  let pointChange = (wins * 8) - (losses * 6);

  if (totalScore > 1.3) { rank = "Vainqueur"; wins = matchesPlayed; losses = 0; pointChange += 30; }
  else if (totalScore > 1.1) { rank = "Finaliste"; wins = matchesPlayed - 1; losses = 1; pointChange += 20; }
  else if (totalScore > 0.9) { rank = "Demi-Finale"; wins = matchesPlayed - 2; losses = 2; pointChange += 10; }
  else if (totalScore > 0.7) { rank = "1/4 Finale"; wins = Math.max(1, wins); pointChange += 5; }

  return {
    playerId: player.id,
    playerName: player.name,
    playerPoints: Math.round(player.points),
    rank,
    divisionLevel: competition.level,
    pointChange,
    matchesPlayed,
    wins,
    losses
  };
};

export const simulateInternalTournament = (players: Player[]): any => {
    if (players.length < 2) return "Pas assez de joueurs.";
    
    const results: Record<string, { p: Player, wins: number, score: number }> = {};
    players.forEach(p => results[p.id] = { p, wins: 0, score: 0 });

    const rounds = 5; 
    for (let r = 0; r < rounds; r++) {
        const sortedIds = Object.keys(results).sort((a,b) => results[b].score - results[a].score);
        for(let i=0; i < sortedIds.length; i+=2) {
            if (i+1 < sortedIds.length) {
                const p1Data = results[sortedIds[i]];
                const p2Data = results[sortedIds[i+1]];
                const match = simulateMatch(p1Data.p, p2Data.p);
                if (match.winnerId === p1Data.p.id) { p1Data.wins++; p1Data.score += 3; p2Data.score += 1; } 
                else { p2Data.wins++; p2Data.score += 3; p1Data.score += 1; }
            }
        }
    }

    return Object.values(results).sort((a,b) => b.score - a.score || b.p.points - a.p.points).map((r, idx) => ({
        rank: idx + 1,
        player: r.p,
        wins: r.wins,
        score: r.score
    }));
};
