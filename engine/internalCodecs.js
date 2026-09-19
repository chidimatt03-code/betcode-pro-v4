const { createBookmakerCodec } = require("./bookmakerCodec");
const { decodeBookingCode: decodeSportyBetBookingCode } =
  require("./bookmakers/sportybet");

const { decodeBookingCode: decodeBet9jaBookingCode } =
  require("./bookmakers/bet9ja");
const {
  encodeBetCodePro,
  decodeBetCodePro
} = require("./canonicalCodec");

function notImplemented(bookmaker, action) {
  return async function () {
    throw new Error(
      `BetCode Pro internal ${bookmaker} ${action} codec is not implemented yet.`
    );
  };
}

const codecs = {
  sportybet: createBookmakerCodec({
    bookmaker: "sportybet",
    decodeBookingCode: decodeSportyBetBookingCode,
    createBookingCode: notImplemented("SportyBet", "create")
  }),

  bet9ja: createBookmakerCodec({
    bookmaker: "bet9ja",
    decodeBookingCode: decodeBet9jaBookingCode,
    createBookingCode: notImplemented("Bet9ja", "create")
  }),

  betking: createBookmakerCodec({
    bookmaker: "betking",
    decodeBookingCode: notImplemented("BetKing", "decode"),
    createBookingCode: notImplemented("BetKing", "create")
  })
};

const canonicalCodec = createBookmakerCodec({
  bookmaker: "betcodepro",
  decodeBookingCode: decodeBetCodePro,
  createBookingCode: encodeBetCodePro
});

function getInternalCodec(bookmaker) {
  const key = String(bookmaker || "").toLowerCase().trim();

  if (key === "betcodepro") {
    return canonicalCodec;
  }

  const codec = codecs[key];

  if (!codec) {
    throw new Error(`Unsupported internal bookmaker codec: ${bookmaker}`);
  }

  return codec;
}

function internalCodecStatus(bookmaker) {
  const key = String(bookmaker || "").toLowerCase().trim();

  if (key === "betcodepro") {
    return {
      bookmaker: key,
      available: true,
      internal: true,
      canonical: true
    };
  }

  const codec = codecs[key];

  return {
    bookmaker: key,
    available: false,
    internal: true,
    canonical: false,
    registered: Boolean(codec),
    implemented: false
  };
}

function setInternalCodec(bookmaker, codec) {
  const key = String(bookmaker || "").toLowerCase().trim();

  if (!codecs[key]) {
    throw new Error(`Unsupported internal bookmaker codec: ${bookmaker}`);
  }

  if (!codec || typeof codec.decode !== "function" || typeof codec.create !== "function") {
    throw new Error(`Invalid internal codec for ${key}.`);
  }

  codecs[key] = codec;
}

module.exports = {
  codecs,
  canonicalCodec,
  getInternalCodec,
  internalCodecStatus,
  setInternalCodec
};
