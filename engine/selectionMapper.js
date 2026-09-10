function normalizeSelectionName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapSelection(type, name) {
  const normalizedType = String(type || "").toUpperCase();
  const normalizedName = normalizeSelectionName(name);

  if (normalizedType === "1X2") {
    if (["home", "1", "home team"].includes(normalizedName)) {
      return "HOME";
    }

    if (["draw", "x", "tie"].includes(normalizedName)) {
      return "DRAW";
    }

    if (["away", "2", "away team"].includes(normalizedName)) {
      return "AWAY";
    }
  }

  if (normalizedType === "TOTAL_GOALS") {
    if (normalizedName.startsWith("over")) {
      return "OVER";
    }

    if (normalizedName.startsWith("under")) {
      return "UNDER";
    }
  }

  if (normalizedType === "BTTS") {
    if (["yes", "gg", "both teams to score yes"].includes(normalizedName)) {
      return "YES";
    }

    if (["no", "ng", "both teams to score no"].includes(normalizedName)) {
      return "NO";
    }
  }

  if (normalizedType === "DOUBLE_CHANCE") {
    if (["1x", "home or draw"].includes(normalizedName)) {
      return "HOME_OR_DRAW";
    }

    if (["x2", "draw or away"].includes(normalizedName)) {
      return "DRAW_OR_AWAY";
    }

    if (["12", "home or away"].includes(normalizedName)) {
      return "HOME_OR_AWAY";
    }
  }

  return null;
}

function mapSelectionWithLine(
  type,
  name,
  line = null,
  homeTeam = null,
  awayTeam = null
) {
  const normalizedType = String(type || "").toUpperCase();
  const normalizedName = normalizeSelectionName(name);

  let mappedType = mapSelection(type, name);

  if (
    normalizedType === "1X2" &&
    !mappedType
  ) {
    const home = normalizeSelectionName(homeTeam);
    const away = normalizeSelectionName(awayTeam);

    if (normalizedName === home) {
      mappedType = "HOME";
    } else if (normalizedName === away) {
      mappedType = "AWAY";
    }
  }

  return {
    type: mappedType,
    line: line ?? null
  };
}

module.exports = {
  normalizeSelectionName,
  mapSelection,
  mapSelectionWithLine
};
