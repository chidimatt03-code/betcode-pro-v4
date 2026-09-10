const { createDestinationAdapter } = require("./destinationAdapter");

function notImplemented(bookmaker) {
  return async function () {
    throw new Error(
      `BetCode Pro internal ${bookmaker} destination creation is not implemented yet.`
    );
  };
}

const adapters = {
  sportybet: createDestinationAdapter({
    bookmaker: "sportybet",
    createBookingCode: notImplemented("SportyBet")
  }),

  bet9ja: createDestinationAdapter({
    bookmaker: "bet9ja",
    createBookingCode: notImplemented("Bet9ja")
  }),

  betking: createDestinationAdapter({
    bookmaker: "betking",
    createBookingCode: notImplemented("BetKing")
  })
};

function getInternalDestinationAdapter(bookmaker) {
  const key = String(bookmaker || "").toLowerCase().trim();

  const adapter = adapters[key];

  if (!adapter) {
    throw new Error(
      `Unsupported internal destination adapter: ${bookmaker}`
    );
  }

  return adapter;
}

function internalDestinationAdapterStatus(bookmaker) {
  const key = String(bookmaker || "").toLowerCase().trim();

  return {
    bookmaker: key,
    available: Boolean(adapters[key]),
    internal: true,
    externalCalls: false
  };
}

function setInternalDestinationAdapter(bookmaker, adapter) {
  const key = String(bookmaker || "").toLowerCase().trim();

  if (!adapters[key]) {
    throw new Error(
      `Unsupported internal destination adapter: ${bookmaker}`
    );
  }

  if (
    !adapter ||
    typeof adapter.createBookingCode !== "function"
  ) {
    throw new Error(
      `Invalid internal destination adapter for ${key}.`
    );
  }

  adapters[key] = adapter;
}

module.exports = {
  adapters,
  getInternalDestinationAdapter,
  internalDestinationAdapterStatus,
  setInternalDestinationAdapter
};
