const ANALYST_VERSION = "1.0.0";

const CONFIDENCE = Object.freeze({
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INSUFFICIENT: "insufficient"
});

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function integer(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function percentage(value, total) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return null;
  }

  return Number(((value / total) * 100).toFixed(1));
}

function confidenceFromSample(sampleSize, minimum = 5) {
  const sample = integer(sampleSize);

  if (sample === null || sample <= 0) {
    return CONFIDENCE.INSUFFICIENT;
  }

  if (sample >= minimum * 2) {
    return CONFIDENCE.HIGH;
  }

  if (sample >= minimum) {
    return CONFIDENCE.MEDIUM;
  }

  return CONFIDENCE.LOW;
}

function requireObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(code);
  }

  return value;
}

function createEvidence({
  category,
  statement,
  value = null,
  sampleSize = null,
  confidence = CONFIDENCE.LOW,
  source = "BetCode Pro verified data"
}) {
  if (!category || !statement) {
    throw new TypeError("BCP_ANALYST_EVIDENCE_INVALID");
  }

  return Object.freeze({
    category: String(category),
    statement: String(statement),
    value,
    sampleSize,
    confidence,
    source: String(source)
  });
}

function createInsight({
  title,
  observation,
  interpretation,
  evidence = [],
  limitation = null,
  priority = 50
}) {
  if (!title || !observation || !interpretation) {
    throw new TypeError("BCP_ANALYST_INSIGHT_INVALID");
  }

  if (!Array.isArray(evidence)) {
    throw new TypeError("BCP_ANALYST_INSIGHT_EVIDENCE_INVALID");
  }

  return Object.freeze({
    title: String(title),
    observation: String(observation),
    interpretation: String(interpretation),
    evidence: Object.freeze([...evidence]),
    limitation: limitation ? String(limitation) : null,
    priority: clamp(Number(priority) || 0, 0, 100)
  });
}

function analyzeForm(form, label) {
  requireObject(form, "BCP_ANALYST_FORM_INVALID");

  const sampleSize = integer(form.sampleSize) || 0;
  const wins = integer(form.wins) || 0;
  const draws = integer(form.draws) || 0;
  const losses = integer(form.losses) || 0;
  const points = integer(form.points) || 0;

  if (sampleSize <= 0) {
    return null;
  }

  const pointsPerGame = Number((points / sampleSize).toFixed(2));
  const winRate = percentage(wins, sampleSize);
  const confidence = confidenceFromSample(sampleSize);

  let interpretation;

  if (pointsPerGame >= 2.2) {
    interpretation = `${label} is producing a strong recent points return in this sample.`;
  } else if (pointsPerGame >= 1.4) {
    interpretation = `${label} is showing a mixed-to-positive recent return rather than a dominant run.`;
  } else {
    interpretation = `${label} is producing a weak recent points return in this sample.`;
  }

  return {
    sampleSize,
    pointsPerGame,
    winRate,
    wins,
    draws,
    losses,
    confidence,
    interpretation
  };
}

function analyzeScoring(scoring, label) {
  requireObject(scoring, "BCP_ANALYST_SCORING_INVALID");

  const sampleSize = integer(scoring.sampleSize) || 0;

  if (sampleSize <= 0) {
    return null;
  }

  const averageGoalsFor = number(scoring.averageGoalsFor);
  const averageGoalsAgainst = number(scoring.averageGoalsAgainst);
  const cleanSheets = integer(scoring.cleanSheets);
  const failedToScore = integer(scoring.failedToScore);

  return {
    sampleSize,
    averageGoalsFor:
      averageGoalsFor === null
        ? null
        : Number(averageGoalsFor.toFixed(2)),
    averageGoalsAgainst:
      averageGoalsAgainst === null
        ? null
        : Number(averageGoalsAgainst.toFixed(2)),
    cleanSheetRate:
      cleanSheets === null
        ? null
        : percentage(cleanSheets, sampleSize),
    failedToScoreRate:
      failedToScore === null
        ? null
        : percentage(failedToScore, sampleSize),
    confidence: confidenceFromSample(sampleSize),
    label
  };
}

function detectFormScoringConflict(form, scoring) {
  if (!form || !scoring) {
    return null;
  }

  const attackingWeakness =
    scoring.averageGoalsFor !== null &&
    scoring.averageGoalsFor < 1 &&
    scoring.failedToScoreRate !== null &&
    scoring.failedToScoreRate >= 40;

  const defensiveWeakness =
    scoring.averageGoalsAgainst !== null &&
    scoring.averageGoalsAgainst >= 1.5 &&
    scoring.cleanSheetRate !== null &&
    scoring.cleanSheetRate <= 20;

  if (form.pointsPerGame >= 2 && (attackingWeakness || defensiveWeakness)) {
    return "Results are positive, but the scoring profile contains a weakness that the headline form alone does not show.";
  }

  return null;
}

function buildMatchAnalyst({
  intelligence,
  homeTeamName = "Home team",
  awayTeamName = "Away team",
  homeTeamProfile = null,
  awayTeamProfile = null,
  betDNA = null,
  marketDNA = null
} = {}) {
  const data = requireObject(
    intelligence,
    "BCP_ANALYST_MATCH_INTELLIGENCE_INVALID"
  );

  const evidenceMatrix = buildEvidenceMatrix({
    matchIntelligence: data,
    homeTeamProfile,
    awayTeamProfile,
    betDNA,
    marketDNA
  });

  const homeForm = analyzeForm(data.form && data.form.home, homeTeamName);
  const awayForm = analyzeForm(data.form && data.form.away, awayTeamName);

  const homeScoring = analyzeScoring(
    data.scoring && data.scoring.home,
    homeTeamName
  );

  const awayScoring = analyzeScoring(
    data.scoring && data.scoring.away,
    awayTeamName
  );

  const evidence = [];
  const insights = [];
  const warnings = [];

  if (homeForm) {
    evidence.push(
      createEvidence({
        category: "form",
        statement:
          `${homeTeamName} has ${homeForm.wins} wins, ${homeForm.draws} draws and ${homeForm.losses} losses across ${homeForm.sampleSize} analysed finished matches.`,
        value: homeForm,
        sampleSize: homeForm.sampleSize,
        confidence: homeForm.confidence
      })
    );
  }

  if (awayForm) {
    evidence.push(
      createEvidence({
        category: "form",
        statement:
          `${awayTeamName} has ${awayForm.wins} wins, ${awayForm.draws} draws and ${awayForm.losses} losses across ${awayForm.sampleSize} analysed finished matches.`,
        value: awayForm,
        sampleSize: awayForm.sampleSize,
        confidence: awayForm.confidence
      })
    );
  }

  if (homeScoring) {
    evidence.push(
      createEvidence({
        category: "scoring",
        statement:
          `${homeTeamName} averages ${homeScoring.averageGoalsFor} goals scored and ${homeScoring.averageGoalsAgainst} conceded per analysed match.`,
        value: homeScoring,
        sampleSize: homeScoring.sampleSize,
        confidence: homeScoring.confidence
      })
    );
  }

  if (awayScoring) {
    evidence.push(
      createEvidence({
        category: "scoring",
        statement:
          `${awayTeamName} averages ${awayScoring.averageGoalsFor} goals scored and ${awayScoring.averageGoalsAgainst} conceded per analysed match.`,
        value: awayScoring,
        sampleSize: awayScoring.sampleSize,
        confidence: awayScoring.confidence
      })
    );
  }

  if (!homeForm || !awayForm) {
    warnings.push(
      "There is insufficient finished-match form data for both teams, so comparative reasoning is limited."
    );
  }

  if (homeForm && awayForm) {
    const formGap = Number(
      (homeForm.pointsPerGame - awayForm.pointsPerGame).toFixed(2)
    );

    if (Math.abs(formGap) >= 0.6) {
      const stronger =
        formGap > 0 ? homeTeamName : awayTeamName;

      insights.push(
        createInsight({
          title: "Recent form separation",
          observation:
            `${stronger} has the stronger points-per-game return in the analysed sample.`,
          interpretation:
            `The recent results show a measurable difference in current form, but this describes the observed sample rather than guaranteeing the match outcome.`,
          evidence: evidence.filter(item => item.category === "form"),
          limitation:
            "Recent form is historical evidence and does not establish a certain future result.",
          priority: 85
        })
      );
    } else {
      insights.push(
        createInsight({
          title: "Recent form is relatively close",
          observation:
            `${homeTeamName} and ${awayTeamName} are not separated by a large points-per-game gap in the analysed samples.`,
          interpretation:
            "The available recent results do not provide a strong form-based separation between the teams.",
          evidence: evidence.filter(item => item.category === "form"),
          limitation:
            "The conclusion is limited to the available finished-match sample.",
          priority: 70
        })
      );
    }
  }

  if (homeScoring && awayScoring) {
    const homeAttack = homeScoring.averageGoalsFor;
    const awayAttack = awayScoring.averageGoalsFor;

    if (Math.abs(homeAttack - awayAttack) >= 0.5) {
      const strongerAttack =
        homeAttack > awayAttack ? homeTeamName : awayTeamName;

      insights.push(
        createInsight({
          title: "Scoring profile",
          observation:
            `${strongerAttack} has the higher average goals scored in the analysed sample.`,
          interpretation:
            "The scoring data identifies an attacking difference, but it should be considered alongside defensive numbers and sample size.",
          evidence: evidence.filter(item => item.category === "scoring"),
          limitation:
            "Goal averages describe previous matches; they are not predictions.",
          priority: 75
        })
      );
    }
  }

  const homeConflict = detectFormScoringConflict(homeForm, homeScoring);
  const awayConflict = detectFormScoringConflict(awayForm, awayScoring);

  if (homeConflict) warnings.push(`${homeTeamName}: ${homeConflict}`);
  if (awayConflict) warnings.push(`${awayTeamName}: ${awayConflict}`);

  if (betDNA) {
    const unresolvedMarkets =
      integer(betDNA.dataQuality?.unresolvedMarkets) ?? null;
    const unresolvedSelections =
      integer(betDNA.dataQuality?.unresolvedSelections) ?? null;
    const selectionCount =
      integer(betDNA.composition?.selectionCount) ?? null;

    if (
      unresolvedMarkets !== null &&
      unresolvedMarkets > 0
    ) {
      warnings.push(
        `Bet DNA contains ${unresolvedMarkets} unresolved market${unresolvedMarkets === 1 ? "" : "s"}; market-level interpretation is limited.`
      );
    }

    if (
      unresolvedSelections !== null &&
      unresolvedSelections > 0
    ) {
      warnings.push(
        `Bet DNA contains ${unresolvedSelections} unresolved selection${unresolvedSelections === 1 ? "" : "s"}; selection-level interpretation is limited.`
      );
    }

    if (
      selectionCount !== null &&
      selectionCount > 0 &&
      unresolvedMarkets === 0 &&
      unresolvedSelections === 0
    ) {
      insights.push(
        createInsight({
          title: "Bet structure",
          observation:
            `The analysed bet contains ${selectionCount} selections with all markets and selections resolved.`,
          interpretation:
            "The bet structure can be analysed from its canonical market and selection semantics without inventing unresolved meanings.",
          evidence: [],
          limitation:
            "Structural completeness does not indicate whether any selection will win.",
          priority: 45
        })
      );
    }
  }

  if (marketDNA) {
    const recognizedRatio =
      number(marketDNA.diversity?.recognizedMarketRatio);
    const uniqueMarketTypes =
      integer(marketDNA.diversity?.uniqueMarketTypes) ?? null;

    if (
      recognizedRatio !== null &&
      recognizedRatio < 1
    ) {
      warnings.push(
        "Market DNA contains unresolved market types, so market-structure interpretation is incomplete."
      );
    } else if (
      recognizedRatio === 1 &&
      uniqueMarketTypes !== null &&
      uniqueMarketTypes > 0
    ) {
      insights.push(
        createInsight({
          title: "Market composition",
          observation:
            `The analysed bet uses ${uniqueMarketTypes} recognized market type${uniqueMarketTypes === 1 ? "" : "s"}.`,
          interpretation:
            "Market diversity describes how the bet is constructed; it does not establish an outcome or prediction.",
          evidence: [],
          limitation:
            "Market composition is structural evidence rather than predictive evidence.",
          priority: 40
        })
      );
    }
  }

  if (homeTeamProfile) {
    const matchesAnalyzed =
      integer(homeTeamProfile.profile?.matchesAnalyzed) ?? null;
    const competitionsRepresented =
      integer(homeTeamProfile.profile?.competitionsRepresented) ?? null;
    const formSample =
      integer(homeTeamProfile.dataQuality?.formSample) ?? null;

    if (homeTeamProfile.dataQuality?.insufficientData) {
      warnings.push(
        `${homeTeamName}: the team profile has insufficient finished-match data.`
      );
    }

    if (homeTeamProfile.dataQuality?.completeTeamHistory === false) {
      warnings.push(
        `${homeTeamName}: the available team profile is not a complete historical record.`
      );
    }

    if (
      matchesAnalyzed !== null &&
      matchesAnalyzed > 0 &&
      competitionsRepresented !== null &&
      competitionsRepresented > 0
    ) {
      insights.push(
        createInsight({
          title: "Team profile context",
          observation:
            `${homeTeamName}'s profile covers ${matchesAnalyzed} analysed finished match${matchesAnalyzed === 1 ? "" : "es"} across ${competitionsRepresented} competition${competitionsRepresented === 1 ? "" : "s"}.`,
          interpretation:
            "The team profile provides additional historical context while its sample boundaries remain explicit.",
          evidence: [],
          limitation:
            formSample !== null
              ? `The profile's form sample contains ${formSample} analysed match${formSample === 1 ? "" : "es"}.`
              : "The available profile sample is limited.",
          priority: 35
        })
      );
    }
  }

  if (awayTeamProfile) {
    const matchesAnalyzed =
      integer(awayTeamProfile.profile?.matchesAnalyzed) ?? null;
    const competitionsRepresented =
      integer(awayTeamProfile.profile?.competitionsRepresented) ?? null;
    const formSample =
      integer(awayTeamProfile.dataQuality?.formSample) ?? null;

    if (awayTeamProfile.dataQuality?.insufficientData) {
      warnings.push(
        `${awayTeamName}: the team profile has insufficient finished-match data.`
      );
    }

    if (awayTeamProfile.dataQuality?.completeTeamHistory === false) {
      warnings.push(
        `${awayTeamName}: the available team profile is not a complete historical record.`
      );
    }

    if (
      matchesAnalyzed !== null &&
      matchesAnalyzed > 0 &&
      competitionsRepresented !== null &&
      competitionsRepresented > 0
    ) {
      insights.push(
        createInsight({
          title: "Team profile context",
          observation:
            `${awayTeamName}'s profile covers ${matchesAnalyzed} analysed finished match${matchesAnalyzed === 1 ? "" : "es"} across ${competitionsRepresented} competition${competitionsRepresented === 1 ? "" : "s"}.`,
          interpretation:
            "The team profile provides additional historical context while its sample boundaries remain explicit.",
          evidence: [],
          limitation:
            formSample !== null
              ? `The profile's form sample contains ${formSample} analysed match${formSample === 1 ? "" : "es"}.`
              : "The available profile sample is limited.",
          priority: 35
        })
      );
    }
  }

  const h2h = data.h2h;
  if (h2h && integer(h2h.sampleSize) > 0) {
    const h2hSample = integer(h2h.sampleSize);

    evidence.push(
      createEvidence({
        category: "head_to_head",
        statement:
          `${h2hSample} verified head-to-head meeting${h2hSample === 1 ? "" : "s"} ${h2hSample === 1 ? "is" : "are"} available between these teams.`,
        value: h2h,
        sampleSize: h2hSample,
        confidence: confidenceFromSample(h2hSample)
      })
    );

    if (h2hSample >= 3) {
      insights.push(
        createInsight({
          title: "Head-to-head context",
          observation:
            `There are ${h2hSample} verified head-to-head meetings in the available dataset.`,
          interpretation:
            "Head-to-head history can provide context, but it is deliberately treated as supporting evidence rather than a decisive predictor.",
          evidence: evidence.filter(item => item.category === "head_to_head"),
          limitation:
            "Historical meetings may involve different squads, managers, competitions or circumstances.",
          priority: 55
        })
      );
    } else {
      warnings.push(
        `Only ${h2hSample} verified head-to-head meeting${h2hSample === 1 ? "" : "s"} ${h2hSample === 1 ? "is" : "are"} available, so H2H evidence is weak.`
      );
    }
  }

  const dataQuality = data.dataQuality || {};
  if (dataQuality.insufficientData) {
    warnings.push(
      "The underlying Match Intelligence layer reports insufficient data."
    );
  }

  for (const layer of evidenceMatrix.layers) {
    if (
      layer.available &&
      layer.limitation &&
      layer.name !== "home_team_profile" &&
      layer.name !== "away_team_profile"
    ) {
      warnings.push(
        `${layer.name}: ${layer.limitation}`
      );
    }
  }

  const overallSample = Math.min(
    homeForm ? homeForm.sampleSize : 0,
    awayForm ? awayForm.sampleSize : 0
  );

  let overallConfidence =
    overallSample <= 0
      ? CONFIDENCE.INSUFFICIENT
      : confidenceFromSample(overallSample);

  if (
    overallConfidence === CONFIDENCE.HIGH &&
    evidenceMatrix.incompleteLayers > 0
  ) {
    overallConfidence = CONFIDENCE.MEDIUM;
  }

  if (
    overallConfidence === CONFIDENCE.MEDIUM &&
    evidenceMatrix.availableLayers === 0
  ) {
    overallConfidence = CONFIDENCE.LOW;
  }

  insights.sort((a, b) => b.priority - a.priority);

  return Object.freeze({
    analystVersion: ANALYST_VERSION,
    type: "match",
    headline:
      insights.length > 0
        ? insights[0].observation
        : "There is not enough verified evidence to produce a strong match-level conclusion.",
    confidence: overallConfidence,
    evidence: Object.freeze(evidence),
    evidenceMatrix,

    insights: Object.freeze(insights),
    warnings: Object.freeze([...new Set(warnings)]),
    integrity: Object.freeze({
      evidenceBacked: true,
      predictionClaim: false,
      fabricatedData: false,
      insufficientDataHandled: true
    })
  });
}


function buildEvidenceMatrix({
  matchIntelligence = null,
  homeTeamProfile = null,
  awayTeamProfile = null,
  betDNA = null,
  marketDNA = null
} = {}) {
  const layers = [];

  function addLayer(name, available, sampleSize = null, limitation = null) {
    layers.push(Object.freeze({
      name,
      available: Boolean(available),
      sampleSize,
      limitation: limitation || null
    }));
  }

  addLayer(
    "match_intelligence",
    Boolean(matchIntelligence),
    matchIntelligence?.dataQuality?.finishedResultsAvailable ?? null,
    matchIntelligence?.dataQuality?.insufficientData
      ? "Match Intelligence reports insufficient data."
      : null
  );

  addLayer(
    "home_team_profile",
    Boolean(homeTeamProfile),
    homeTeamProfile?.dataQuality?.formSample ?? null,
    homeTeamProfile?.dataQuality?.completeTeamHistory === false
      ? "Home team history is not complete."
      : null
  );

  addLayer(
    "away_team_profile",
    Boolean(awayTeamProfile),
    awayTeamProfile?.dataQuality?.formSample ?? null,
    awayTeamProfile?.dataQuality?.completeTeamHistory === false
      ? "Away team history is not complete."
      : null
  );

  addLayer(
    "bet_dna",
    Boolean(betDNA),
    betDNA?.composition?.selectionCount ?? null,
    betDNA?.dataQuality?.completeMarketCoverage === false
      ? "Bet DNA contains unresolved markets."
      : null
  );

  addLayer(
    "market_dna",
    Boolean(marketDNA),
    marketDNA?.composition?.selectionCount ?? null,
    marketDNA?.dataQuality?.completeMarketCoverage === false
      ? "Market DNA contains unresolved markets."
      : null
  );

  const availableLayers = layers.filter(layer => layer.available).length;
  const incompleteLayers = layers.filter(
    layer => layer.available && layer.limitation
  ).length;

  return Object.freeze({
    layers: Object.freeze(layers),
    availableLayers,
    totalLayers: layers.length,
    incompleteLayers,
    complete:
      availableLayers === layers.length &&
      incompleteLayers === 0
  });
}

module.exports = {
  ANALYST_VERSION,
  CONFIDENCE,
  buildMatchAnalyst,
  buildEvidenceMatrix
};
