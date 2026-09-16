const BET9JA_COUPON_WS =
  "https://web.bet9ja.com/Controls/CouponWS.asmx";

const SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/";
const TEMPURI_NS = "http://tempuri.org/";

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractTag(xml, tag) {
  const pattern = new RegExp(
    `<(?:[^:>]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[^:>]+:)?${tag}>`,
    "i"
  );

  const match = String(xml || "").match(pattern);
  return match ? match[1].trim() : null;
}

function extractBoolean(xml, tag) {
  const value = extractTag(xml, tag);
  if (value === null) return null;
  return value.toLowerCase() === "true";
}

function extractInteger(xml, tag) {
  const value = extractTag(xml, tag);
  if (value === null || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function soapRequest(action, bodyXml) {
  const envelope =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
    `xmlns:xsd="http://www.w3.org/2001/XMLSchema" ` +
    `xmlns:soap="${SOAP_NS}">` +
    `<soap:Body>${bodyXml}</soap:Body>` +
    `</soap:Envelope>`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(BET9JA_COUPON_WS, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `"${TEMPURI_NS}${action}"`
      },
      body: envelope,
      signal: controller.signal
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `Bet9ja CouponWS ${action} returned HTTP ${response.status}.`
      );
    }

    if (!text.trim()) {
      throw new Error(
        `Bet9ja CouponWS ${action} returned an empty response.`
      );
    }

    return text;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Bet9ja CouponWS ${action} request timed out.`);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function addToBetSlip({
  message,
  betBuilderInfo = "",
  subEventId
} = {}) {
  if (!message || !String(message).trim()) {
    throw new Error("Bet9ja AddToBetSlip message is required.");
  }

  if (!Number.isInteger(Number(subEventId))) {
    throw new Error("Bet9ja AddToBetSlip subEventId must be an integer.");
  }

  const body =
    `<AddToBetSlip xmlns="${TEMPURI_NS}">` +
      `<message>${xmlEscape(message)}</message>` +
      `<betBuilderInfo>${xmlEscape(betBuilderInfo)}</betBuilderInfo>` +
      `<subEventId>${Number(subEventId)}</subEventId>` +
    `</AddToBetSlip>`;

  const xml = await soapRequest("AddToBetSlip", body);

  return {
    success: extractBoolean(xml, "IsSuccess"),
    errorMessage: extractTag(xml, "ErrorMessage"),
    odds: {
      subEventId: extractInteger(xml, "SubEventID"),
      subEventName: extractTag(xml, "SubEventName"),
      eventId: extractInteger(xml, "EventID"),
      eventName: extractTag(xml, "EventName"),
      sportId: extractInteger(xml, "SportID"),
      insertedIntoDetails: extractBoolean(xml, "InsertedIntoDetails")
    },
    rawResponse: xml
  };
}

async function getStatoCoupon(idCoupon) {
  if (!Number.isInteger(Number(idCoupon))) {
    throw new Error("Bet9ja GetStatoCoupon IDCoupon must be an integer.");
  }

  const body =
    `<GetStatoCoupon xmlns="${TEMPURI_NS}">` +
      `<IDCoupon>${Number(idCoupon)}</IDCoupon>` +
    `</GetStatoCoupon>`;

  const xml = await soapRequest("GetStatoCoupon", body);

  return {
    status: extractInteger(xml, "GetStatoCouponResult"),
    rawResponse: xml
  };
}

function bet9jaCouponWsStatus() {
  return {
    bookmaker: "bet9ja",
    interface: "CouponWS",
    official: true,
    protocol: "SOAP",
    endpoint: BET9JA_COUPON_WS,
    addToBetSlip: true,
    getStatoCoupon: true,
    bookingCodeDecode: false,
    bookingCodeCreate: false
  };
}

module.exports = {
  BET9JA_COUPON_WS,
  addToBetSlip,
  getStatoCoupon,
  bet9jaCouponWsStatus
};
