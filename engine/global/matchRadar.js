const MATCH_RADAR_VERSION = 1;

const SIGNAL = Object.freeze({
  STRONG: "strong",
  MODERATE: "moderate",
  LIMITED: "limited",
  NONE: "none"
});

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function integer(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function percentage(value) {
  return value === null
    ? null
    : Number((value * 100).toFixed(1));
}

function requireObject(value, code) {
  if (!value || typeof value !== "object") {
    throw new TypeError(code);
  }
  return value;
}

function buildFormSignal(intelligence) {
  const home = intelligence.form?.home || null;
  const away = intelligence.form?.away || null;

  const homeSample = integer(home?.sampleSize) ?? 0;
  const awaySample = integer(away?.sampleSize) ?? 0;

  if (homeSample === 0 || awaySample === 0) {
    return {
      name: "formSeparation",
      level: SIGNAL.LIMITED,
      value: null,
      sampleSize: Math.min(homeSample, awaySample),
      statement: "Recent-form separation cannot be established from the verified samples."
    };
  }

  const homePpg =
    number(home?.pointsPerGame) ??
    (number(home?.points) !== null
      ? number(home.points) / homeSample
      : null);

  const awayPpg =
    number(away?.pointsPerGame) ??
    (number(away?.points) !== null
      ? number(away.points) / awaySample
      : null);

  if (homePpg === null || awayPpg === null) {
    return {
      name: "formSeparation",
      level: SIGNAL.LIMITED,
      value: null,
      sampleSize: Math.min(homeSample, awaySample),
      statement: "Recent-form separation cannot be calculated from the available verified data."
    };
  }

  const gap = Math.abs(homePpg - awayPpg);

  let level = SIGNAL.NONE;
  if (Math.min(homeSample, awaySample) >= 5 && gap >= 0.9) {
    level = SIGNAL.STRONG;
  } else if (Math.min(homeSample, awaySample) >= 3 && gap >= 0.6) {
    level = SIGNAL.MODERATE;
  } else if (gap >= 0.4) {
    level = SIGNAL.LIMITED;
  }

  return {
    name: "formSeparation",
    level,
    value: Number(gap.toFixed(2)),
    sampleSize: Math.min(homeSample, awaySample),
    statement:
      `The verified points-per-game gap is ${gap.toFixed(2)} ` +
      `(${homeSample} home-team sample / ${awaySample} away-team sample).`
  };
}

function buildScoringSignal(intelligence) {
  const home = intelligence.scoring?.home || null;
  const away = intelligence.scoring?.away || null;

  const homeSample = integer(home?.sampleSize) ?? 0;
  const awaySample = integer(away?.sampleSize) ?? 0;

  const homeGoals = number(home?.averageGoalsFor);
  const awayGoals = number(away?.averageGoalsFor);

  if (
    homeSample === 0 ||
    awaySample === 0 ||
    homeGoals === null ||
    awayGoals === null
  ) {
    return {
      name: "scoringSeparation",
      level: SIGNAL.LIMITED,
      value: null,
      sampleSize: Math.min(homeSample, awaySample),
      statement: "Scoring separation cannot be established from the verified samples."
    };
  }

  const gap = Math.abs(homeGoals - awayGoals);

  let level = SIGNAL.NONE;
  if (Math.min(homeSample, awaySample) >= 5 && gap >= 0.75) {
    level = SIGNAL.STRONG;
  } else if (Math.min(homeSample, awaySample) >= 3 && gap >= 0.5) {
    level = SIGNAL.MODERATE;
  } else if (gap >= 0.35) {
    level = SIGNAL.LIMITED;
  }

  return {
    name: "scoringSeparation",
    level,
    value: Number(gap.toFixed(2)),
    sampleSize: Math.min(homeSample, awaySample),
    statement:
      `The verified average-goals-for gap is ${gap.toFixed(2)} ` +
      `(${homeSample} home-team sample / ${awaySample} away-team sample).`
  };
}

function buildDataCoverageSignal(intelligence) {
  const quality = intelligence.dataQuality || {};

  const homeSample = integer(quality.homeFormSample) ?? 0;
  const awaySample = integer(quality.awayFormSample) ?? 0;
  const resultCount = integer(quality.resultsAvailable) ?? 0;

  const minimumSample = Math.min(homeSample, awaySample);

  let level = SIGNAL.LIMITED;

  if (minimumSample >= 5 && resultCount >= 10) {
    level = SIGNAL.STRONG;
  } else if (minimumSample >= 3 && resultCount >= 6) {
    level = SIGNAL.MODERATE;
  }

  return {
    name: "dataCoverage",
    level,
    value: minimumSample,
    sampleSize: minimumSample,
    statement:
      `The smallest verified team-form sample is ${minimumSample} match` +
      `${minimumSample === 1 ? "" : "es"}, with ${resultCount} combined verified result` +
      `${resultCount === 1 ? "" : "s"} available.`
  };
}

function buildH2HSignal(intelligence) {
  const sample = integer(intelligence.h2h?.sampleSize) ?? 0;

  if (sample === 0) {
    return {
      name: "h2hContext",
      level: SIGNAL.NONE,
      value: 0,
      sampleSize: 0,
      statement: "No verified head-to-head sample is available."
    };
  }

  let level = SIGNAL.LIMITED;

  if (sample >= 5) {
    level = SIGNAL.MODERATE;
  }

  return {
    name: "h2hContext",
    level,
    value: sample,
    sampleSize: sample,
    statement:
      `${sample} verified head-to-head meeting` +
      `${sample === 1 ? "" : "s"} are available as historical context.`
  };
}

function buildFreshnessSignal({
  observedAt = null,
  now = new Date().toISOString(),
  healthySeconds = 300,
  degradedSeconds = 900
} = {}) {
  if (!observedAt) {
    return {
      name: "freshness",
      level: SIGNAL.LIMITED,
      value: null,
      sampleSize: null,
      statement: "Observation freshness is unavailable."
    };
  }

  const observedMs = new Date(observedAt).getTime();
  const nowMs = new Date(now).getTime();

  if (
    Number.isNaN(observedMs) ||
    Number.isNaN(nowMs) ||
    nowMs < observedMs
  ) {
    return {
      name: "freshness",
      level: SIGNAL.LIMITED,
      value: null,
      sampleSize: null,
      statement: "Observation freshness could not be safely calculated."
    };
  }

  const ageSeconds = Math.round((nowMs - observedMs) / 1000);

  let level = SIGNAL.STRONG;
  if (ageSeconds > degradedSeconds) {
    level = SIGNAL.LIMITED;
  } else if (ageSeconds >= healthySeconds) {
    level = SIGNAL.MODERATE;
  }

  return {
    name: "freshness",
    level,
    value: ageSeconds,
    sampleSize: null,
    statement:
      `The latest verified observation is ${ageSeconds} seconds old.`
  };
}

function calculateAttentionScore(signals) {
  const weights = {
    strong: 3,
    moderate: 2,
    limited: 1,
    none: 0
  };

  const score = signals.reduce(
    (total, signal) => total + (weights[signal.level] || 0),
    0
  );

  return score;
}

function buildMatchRadar({
  intelligence,
  observedAt = null,
  now = new Date().toISOString()
} = {}) {
  const data = requireObject(
    intelligence,
    "BCP_MATCH_RADAR_INTELLIGENCE_INVALID"
  );

  const signals = [
    buildFormSignal(data),
    buildScoringSignal(data),
    buildDataCoverageSignal(data),
    buildH2HSignal(data),
    buildFreshnessSignal({
      observedAt,
      now
    })
  ];

  const attentionScore = calculateAttentionScore(signals);

  const usableSignals = signals.filter(
    signal => signal.level === SIGNAL.STRONG ||
      signal.level === SIGNAL.MODERATE
  ).length;

  return Object.freeze({
    radarVersion: MATCH_RADAR_VERSION,
    attentionScore,
    signalCount: signals.length,
    usableSignals,
    signals: Object.freeze(signals),
    dataQuality: Object.freeze({
      insufficientData:
        data.dataQuality?.insufficientData === true,
      minimumFormSample:
        Math.min(
          integer(data.dataQuality?.homeFormSample) ?? 0,
          integer(data.dataQuality?.awayFormSample) ?? 0
        )
    }),
    integrity: Object.freeze({
      evidenceBacked: true,
      predictionClaim: false,
      fabricatedData: false
    })
  });
}

module.exports = {
  MATCH_RADAR_VERSION,
  SIGNAL,
  buildMatchRadar
};
