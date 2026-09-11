function createDestinationAdapter({
  bookmaker,
  createBookingCode
}) {
  const key = String(bookmaker || "").toLowerCase().trim();

  if (!key) {
    throw new Error("Destination bookmaker is missing.");
  }

  if (typeof createBookingCode !== "function") {
    throw new Error(
      `Destination adapter for ${key} must provide createBookingCode().`
    );
  }

  return {
    bookmaker: key,

    async createBookingCode(destinationSlip) {
      if (!destinationSlip || typeof destinationSlip !== "object") {
        throw new Error("Destination slip is missing.");
      }

      if (!destinationSlip.success) {
        throw new Error("Destination slip is not ready.");
      }

      const result = await createBookingCode(destinationSlip);

      if (
        !result ||
        result.success !== true ||
        result.status !== "created" ||
        String(result.bookmaker || "").toLowerCase().trim() !== key ||
        typeof result.code !== "string" ||
        !result.code.trim()
      ) {
        throw new Error(
          `Destination adapter for ${key} returned an invalid creation result.`
        );
      }

      return result;
    }
  };
}

module.exports = {
  createDestinationAdapter
};
