const { createDestinationAdapter } = require("./destinationAdapter");
const { createBookingCode: createSportyBetBookingCode } =
  require("./bookmakers/sportybet");
const { addToBetSlip, getStatoCoupon } = require("./bookmakers/bet9jaCouponWs");

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
    createBookingCode: createSportyBetBookingCode
  }),

  bet9ja: createDestinationAdapter({
    bookmaker: "bet9ja",
    createBookingCode: async function (destinationSlip) {
      if (!destinationSlip || !destinationSlip.success) {
        throw new Error("Destination slip is not ready.");
      }

      if (
        !destinationSlip.bet9ja ||
        typeof destinationSlip.bet9ja.message !== "string" ||
        !destinationSlip.bet9ja.message.trim()
      ) {
        throw new Error(
          "Bet9ja destination slip requires an authorized CouponWS message."
        );
      }

      if (!Number.isInteger(Number(destinationSlip.bet9ja.subEventId))) {
        throw new Error(
          "Bet9ja destination slip requires a valid subEventId."
        );
      }

      const result = await addToBetSlip({
        message: destinationSlip.bet9ja.message,
        betBuilderInfo: destinationSlip.bet9ja.betBuilderInfo || "",
        subEventId: Number(destinationSlip.bet9ja.subEventId)
      });

      return {
        success: result.success === true,
        status: result.success === true ? "created" : "rejected",
        bookmaker: "bet9ja",
        code: null,
        officialInterface: "CouponWS",
        bookingCodeCreationSupported: false,
        couponResult: result
      };
    }
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
