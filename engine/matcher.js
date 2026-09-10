const {
  normalizeTeamName,
  normalizeCompetitionName
} = require("./normalizer");

function similarity(a, b) {
  const x = String(a || "");
  const y = String(b || "");

  if (!x || !y) return 0;
  if (x === y) return 1;

  const max = Math.max(x.length, y.length);
  const distance = levenshtein(x, y);

  return 1 - distance / max;
}

function levenshtein(a, b) {
  const matrix = Array.from(
    { length: b.length + 1 },
    () => Array(a.length + 1).fill(0)
  );

  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
}

function timeScore(a, b) {
  if (!a || !b) return 0;

  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();

  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0;

  const difference = Math.abs(ta - tb) / 60000;

  if (difference <= 2) return 1;
  if (difference <= 5) return 0.95;
  if (difference <= 15) return 0.85;
  if (difference <= 30) return 0.65;
  if (difference <= 60) return 0.4;

  return 0;
}

function eventMatchScore(source, candidate) {
  const sourceHome = normalizeTeamName(source?.home);
  const sourceAway = normalizeTeamName(source?.away);

  const candidateHome = normalizeTeamName(candidate?.home);
  const candidateAway = normalizeTeamName(candidate?.away);

  const homeScore = similarity(sourceHome, candidateHome);
  const awayScore = similarity(sourceAway, candidateAway);

  const competitionScore =
    similarity(
      normalizeCompetitionName(source?.competition),
      normalizeCompetitionName(candidate?.competition)
    );

  const startScore = timeScore(
    source?.startTime,
    candidate?.startTime
  );

  const total =
    homeScore * 0.40 +
    awayScore * 0.40 +
    competitionScore * 0.05 +
    startScore * 0.15;

  return {
    score: Number(total.toFixed(4)),
    homeScore: Number(homeScore.toFixed(4)),
    awayScore: Number(awayScore.toFixed(4)),
    competitionScore: Number(competitionScore.toFixed(4)),
    startScore: Number(startScore.toFixed(4))
  };
}

function classifyScore(score) {
  if (score >= 0.95) return "MATCHED";
  if (score >= 0.85) return "LIKELY_MATCH";
  if (score >= 0.70) return "UNCERTAIN";
  return "NO_MATCH";
}

function findBestEventMatch(source, candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return {
      status: "NO_MATCH",
      candidate: null,
      score: 0
    };
  }

  const ranked = candidates
    .map(candidate => ({
      candidate,
      ...eventMatchScore(source, candidate)
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];

  return {
    status: classifyScore(best.score),
    candidate: best.candidate,
    score: best.score,
    breakdown: {
      home: best.homeScore,
      away: best.awayScore,
      competition: best.competitionScore,
      startTime: best.startScore
    },
    alternatives: ranked.slice
(1, 4).map(item => ({
      candidate: item.candidate,
      score: item.score
    }))
  };
}

module.exports = {
  similarity,
  eventMatchScore,
  findBestEventMatch,
  classifyScore
};
