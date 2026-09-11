function createBookmakerCodec({
  bookmaker,
  decodeBookingCode,
  createBookingCode
}) {
  const key = String(bookmaker || "").toLowerCase().trim();

  if (!key) {
    throw new Error("Bookmaker is missing.");
  }

  if (typeof decodeBookingCode !== "function") {
    throw new Error(
      `Codec for ${key} must provide decodeBookingCode().`
    );
  }

  if (typeof createBookingCode !== "function") {
    throw new Error(
      `Codec for ${key} must provide createBookingCode().`
    );
  }

  return {
    bookmaker: key,

    async decode(code) {
      const value = String(code || "").trim();

      if (!value) {
        throw new Error("Booking code is missing.");
      }

      return decodeBookingCode(value);
    },

    async create(destinationSlip) {
      if (!destinationSlip || typeof destinationSlip !== "object") {
        throw new Error("Destination slip is missing.");
      }

      if (!destinationSlip.success) {
        throw new Error("Destination slip is not ready.");
      }

      return createBookingCode(destinationSlip);
    }
  };
}

module.exports = {
  createBookmakerCodec
};
