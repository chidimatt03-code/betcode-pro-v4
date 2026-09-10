const crypto = require("crypto");

const PREFIX = "BCP1";
const ALGORITHM = "sha256";

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padding = normalized.length % 4;
  const padded = normalized + (padding ? "=".repeat(4 - padding) : "");

  return Buffer.from(padded, "base64").toString("utf8");
}

function checksum(payload) {
  return crypto
    .createHash(ALGORITHM)
    .update(payload, "utf8")
    .digest("hex")
    .slice(0, 16);
}

function canonicalizeSlip(slip) {
  if (!slip || typeof slip !== "object") {
    throw new Error("BetCode Pro slip is missing.");
  }

  if (!Array.isArray(slip.selections) || slip.selections.length === 0) {
    throw new Error("BetCode Pro slip has no selections.");
  }

  return {
    v: 1,

    selections: slip.selections.map((item, index) => ({
      index: item.index || index + 1,

      sport: item.sport || null,

      event: {
        id: item.event?.id || null,
        home: item.event?.home || null,
        away: item.event?.away || null,
        competition: item.event?.competition || null,
        startTime: item.event?.startTime || null
      },

      market: {
        type: item.market?.type || null,
        name: item.market?.name || null,
        line: item.market?.line ?? null
      },

      selection: {
        type: item.selection?.type || null,
        name: item.selection?.name || null,
        value: item.selection?.value ?? null
      }
    }))
  };
}

function encodeBetCodePro(slip) {
  const canonical = canonicalizeSlip(slip);
  const payload = JSON.stringify(canonical);
  const encoded = base64UrlEncode(payload);
  const sum = checksum(encoded);

  return `${PREFIX}.${encoded}.${sum}`;
}

function decodeBetCodePro(code) {
  const value = String(code || "").trim();

  if (!value) {
    throw new Error("BetCode Pro code is missing.");
  }

  const parts = value.split(".");

  if (parts.length !== 3 || parts[0] !== PREFIX) {
    throw new Error("Invalid BetCode Pro code format.");
  }

  const encoded = parts[1];
  const suppliedChecksum = parts[2];

  if (!encoded || !suppliedChecksum) {
    throw new Error("Invalid BetCode Pro code.");
  }

  const expectedChecksum = checksum(encoded);

  if (suppliedChecksum !== expectedChecksum) {
    throw new Error("BetCode Pro code checksum is invalid.");
  }

  let payload;

  try {
    payload = JSON.parse(base64UrlDecode(encoded));
  } catch {
    throw new Error("BetCode Pro code payload is invalid.");
  }

  if (!payload || payload.v !== 1) {
    throw new Error("Unsupported BetCode Pro code version.");
  }

  if (!Array.isArray(payload.selections) || payload.selections.length === 0) {
    throw new Error("BetCode Pro code contains no selections.");
  }

  return {
    version: payload.v,
    selections: payload.selections
  };
}

module.exports = {
  PREFIX,
  encodeBetCodePro,
  decodeBetCodePro
};
