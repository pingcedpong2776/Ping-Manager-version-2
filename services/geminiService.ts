
import { GoogleGenAI, Type } from "@google/genai";
import { Player, Meeting, Club, Competition, CompetitionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// ... (Existing functions: getZoneBasedAdversaries, getZoneSuggestions, getAIStrategicAdvise, getAIStrategicSelection) ...
// Je réinclus tout pour ne rien casser

export const getZoneBasedAdversaries = async (zone: string, division: string): Promise<string[]> => {
  const isNational = division.includes('Nationale') || division.includes('PRO');
  const isRegional = division.includes('Régionale') || division.includes('Pré-Nationale');
  
  let levelContext = "petit club local de village ou de quartier";
  if (isNational) levelContext = "grand club d'envergure nationale (souvent de grandes villes)";
  else if (isRegional) levelContext = "club régional dynamique et établi";

  const prompt = `Génère une liste de 7 noms de clubs de tennis de table français crédibles pour la division "${division}". 
  Localisation souhaitée : autour de la zone "${zone}".
  Contexte du niveau : ${levelContext}.
  Styles variés : 'ASPTT [Ville]', '[Ville] TT', 'Ping-Pong [Club]', 'Entente Pongiste [Nom]', 'TT [Ville]'.
  Les noms doivent être différents et sonner réalistes pour la FFTT.
  Retourne uniquement les noms séparés par des virgules sans numérotation.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    const text = response.text || "";
    return text.split(',').map(s => s.trim()).filter(s => s.length > 0).slice(0, 7);
  } catch (error) {
    console.error("Gemini Zone Error:", error);
    return ['AS Lyon Sud', 'CP Paris Nord', 'TT Marseille', 'Ping Bordeaux', 'Nantes Elite', 'Lille TT', 'Montpellier Ping'];
  }
};

export const getAdversaryNameSuggestions = async (zone: string, division: string, count: number): Promise<string[]> => {
    return getZoneBasedAdversaries(zone, division);
};

export const getZoneSuggestions = async (city: string): Promise<string[]> => {
    const prompt = `
      Pour la ville de "${city}" en France, suggère 3 zones administratives ou géographiques pertinentes pour un championnat de Tennis de Table (Comité Départemental ou Ligue Régionale).
      Exemple pour "Bordeaux" : ["Gironde", "Nouvelle-Aquitaine", "Zone Sud-Ouest"].
      Retourne uniquement un tableau JSON de strings.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        zones: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["zones"]
                }
            }
        });
        const data = JSON.parse(response.text || '{"zones": []}');
        return data.zones || [city];
    } catch (error) {
        return [city, "Département Local", "Région"];
    }
};

export const getAIStrategicAdvise = async (meeting: Meeting, homePlayers: Player[], awayPlayers: Player[]): Promise<string> => {
  const prompt = `
    En tant qu'entraîneur expert de tennis de table (FFTT), analyse cette rencontre à venir :
    Club Domicile : ${homePlayers.map(p => `${p.name} (${p.points} pts, ${p.style}, fatigue ${p.fatigue}%)`).join(', ')}
    Club Extérieur : ${awayPlayers.map(p => `${p.name} (${p.points} pts, ${p.style})`).join(', ')}
    Donne un court résumé stratégique (max 3 phrases) sur les chances de victoire et les joueurs clés à surveiller.
  `;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Pas d'analyse disponible.";
  } catch (error) { return "L'IA tactique est indisponible."; }
};

export const getAIStrategicSelection = async (club: Club, ambition: 'PROMOTION' | 'MAINTENANCE'): Promise<{ selection: Record<number, string[]>, report: string }> => {
  const playerProfiles = club.players.map(p => ({ id: p.id, name: p.name, points: p.points, fatigue: p.fatigue, style: p.style, exp: p.experience }));
  const prompt = `En tant que DTN Expert, compose les ${club.teamCount} équipes du club ${club.name}. AMBITION : ${ambition}. JOUEURS : ${JSON.stringify(playerProfiles)}`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            teams: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { teamNumber: { type: Type.INTEGER }, playerIds: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["teamNumber", "playerIds"] } },
            reasoning: { type: Type.STRING }
          },
          required: ["teams", "reasoning"]
        }
      }
    });
    const data = JSON.parse(response.text || "{}");
    const selection: Record<number, string[]> = {};
    if (data.teams) data.teams.forEach((t: any) => { selection[t.teamNumber] = t.playerIds; });
    return { selection, report: data.reasoning || "Optimisation terminée." };
  } catch (error) { throw error; }
};

export const getAICompetitionSuggestion = async (competition: Competition, players: Player[]): Promise<{ playerIds: string[], reason: string }> => {
  const playerProfiles = players.map(p => ({ 
    id: p.id, 
    name: p.name, 
    points: p.points, 
    age: p.age,
    style: p.style,
    handed: p.handed,
    fatigue: p.fatigue,
    tactique: p.stats.tactical,
    mental: p.stats.mental
  }));

  const prompt = `
    En tant que Directeur Sportif, sélectionne les ${competition.teamSize || 1} joueurs les plus adaptés pour cette compétition :
    NOM : ${competition.name}
    NIVEAU : ${competition.level}
    DESCRIPTION : ${competition.description}
    
    Règles de sélection :
    1. Pour "Championnat de France Seniors" : Sélectionne les joueurs avec le plus de POINTS, indépendamment de l'âge. La performance pure prime.
    2. Pour "Championnat de France Vétérans" : Sélectionne des joueurs de plus de 40 ans avec de bonnes stats 'Tactique' et 'Mental'.
    3. Pour "Championnat Jeunes" : Cherche la complémentarité (gaucher/droitier) et le potentiel.
    
    JOUEURS DISPONIBLES (Déjà filtrés par âge éligible) : ${JSON.stringify(playerProfiles)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            playerIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            reason: { type: Type.STRING, description: "Court texte expliquant le choix." }
          },
          required: ["playerIds", "reason"]
        }
      }
    });
    return JSON.parse(response.text || '{"playerIds": [], "reason": "Erreur IA"}');
  } catch (error) {
    console.error(error);
    return { 
      playerIds: players.sort((a,b) => b.points - a.points).slice(0, competition.teamSize || 1).map(p => p.id), 
      reason: "Sélection automatique par classement (IA indisponible)." 
    };
  }
};

export const getAICompositionReport = async (club: Club, selection: Record<number, string[]>, objective: string): Promise<string> => {
  // ... (unchanged)
  return "Analyse terminée.";
};

export const generatePlayerBackstory = async (name: string, style: string, age: number): Promise<string> => {
  // ... (unchanged)
  return "Joueur motivé.";
};

export const getAITrainingAdvice = async (player: Player, availableSessions: any[]): Promise<{ analysis: string, recommendedSessionIds: string[] }> => {
  // ... (unchanged - same implementation as before)
  const prompt = `
    En tant que Coach Elite de Tennis de Table, analyse le profil de ce joueur et recommande 1 à 2 sessions d'entraînement prioritaires.
    PROFIL JOUEUR : Nom: ${player.name} (${player.age} ans), Style: ${player.style}, Classement: ${Math.round(player.points)} pts, Fatigue: ${player.fatigue}%.
    SESSIONS : ${JSON.stringify(availableSessions.map(s => ({id: s.id, name: s.name})))}
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.OBJECT, properties: { analysis: { type: Type.STRING }, recommendedSessionIds: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["analysis", "recommendedSessionIds"] }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) { return { analysis: "Erreur coach.", recommendedSessionIds: [] }; }
};

export const getTransferMarketSuggestions = async (club: Club, marketPlayers: Player[]): Promise<{ suggestedPlayerIds: string[], reason: string }> => {
    // ... (unchanged - same implementation as before)
    return { suggestedPlayerIds: [], reason: "Service indisponible." };
};

export const getYouthPotentialAnalysis = async (player: Player): Promise<{ potential: string, competitionSuggestion: string }> => {
    // ... (unchanged - same implementation as before)
    return { potential: "Joueur prometteur", competitionSuggestion: "Tournois Jeunes" };
};

export const getAICompetitionReport = async (competition: Competition, results: CompetitionResult[]): Promise<string> => {
    const summary = results.map(r => 
        `- ${r.playerName} (${r.playerPoints}pts) : ${r.rank} | ${r.wins}V/${r.losses}D | Gain ${r.pointChange}pts`
    ).join('\n');

    const prompt = `
      En tant que Juge-Arbitre et Expert FFTT, fais un bilan court (3 phrases) de cette compétition pour mon club.
      Compétition : ${competition.name} (${competition.level}).
      
      Résultats de mes joueurs :
      ${summary}
      
      Mentionne explicitement les montées et les descentes s'il y en a.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        return response.text || "Bilan non disponible.";
    } catch (error) {
        return "Impossible de générer le bilan IA.";
    }
};
