const { getInternalCodec } = require("./internalCodecs");
const { normalizeBookmakerSlip } = require("./bookmakerNormalizer");

function toInternalMarketType(name) {
  const value = String(name || "").trim().toLowerCase();

  if (
    value === "match result" ||
    value === "1x2" ||
    value === "home/draw/away"
  ) {
    return "1X2";
  }

  if (
    value === "over/under" ||
    value === "total goals" ||
    value === "totals" ||
    value === "total_goals"
  ) {
    return "TOTAL_GOALS";
  }

  if (value === "btts" || value === "both teams to score") {
    return "BTTS";
  }

  if (value === "double chance") {
    return "DOUBLE_CHANCE";
  }

  if (value === "asian handicap") {
    return "ASIAN_HANDICAP";
  }

  if (value === "handicap") {
    return "HANDICAP";
  }

  if (value === "draw no bet") {
    return "DRAW_NO_BET";
  }

  return String(name || "").trim();
}

function restoreInternalSlipShape(slip) {
  return {
    bookmaker: slip.bookmaker,
    bookingCode: slip.bookingCode,

    selections: slip.selections.map(item => ({
      event: item.event,

      market: {
        type: toInternalMarketType(item.market.name),
        name: item.market.name,
        line: item.market.line
      },

      selection: item.selection
    }))
  };
}

async function decodeSourceBookingCode(bookmaker, code) {
  if (!code || !String(code).trim()) {
    return {
      success: false,
      stage: "SOURCE_DECODER",
      error: "Booking code is missing."
    };
  }

  let codec;

  try {
    codec = getInternalCodec(bookmaker);

    const result = await codec.decode(
      String(code).trim()
    );

    if (!result) {
      return {
        success: false,
        stage: "SOURCE_DECODER",
        error: "Source bookmaker returned no bet slip."
      };
    }

    const bookmakerSlip = normalizeBookmakerSlip({
      ...result,
      bookmaker: codec.bookmaker,
      bookingCode:
        result.bookingCode ||
        result.code ||
        String(code).trim()
    });

    if (!bookmakerSlip.selections.length) {
      return {
        success: false,
        stage: "SOURCE_DECODER",
        bookmaker: codec.bookmaker,
        error: "Source bookmaker returned an empty bet slip."
      };
    }

    const slip = restoreInternalSlipShape(bookmakerSlip);

    return {
      success: true,
      bookmaker: codec.bookmaker,
      slip
    };

  } catch (error) {
    return {
      success: false,
      stage: "SOURCE_DECODER",
      bookmaker:
        codec?.bookmaker ||
        String(bookmaker || "").toLowerCase().trim(),
      error:
        error.message ||
        "Unable to decode booking code."
    };
  }
}

module.exports = {
  decodeSourceBookingCode
};
