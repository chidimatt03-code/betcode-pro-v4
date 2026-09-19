const BASE_URL =
  process.env.BET9JA_PUBLIC_BASE_URL ||
  "https://shop.bet9ja.com";

const BOOKING_PATH =
  process.env.BET9JA_BOOKING_PATH ||
  "/sport/OddsAsync.aspx";

const TIMEOUT_MS = 15000;

const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 " +
  "Chrome/140.0 Mobile Safari/537.36";

function clean(value) {
  return String(value ?? "").trim();
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value) {
  return decodeHtml(
    String(value ?? "").replace(/<[^>]*>/g, "")
  ).replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseAttributes(tag) {
  const attrs = {};

  const re =
    /([:\w$-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

  let match;

  while ((match = re.exec(tag))) {
    attrs[match[1]] =
      match[2] !== undefined
        ? match[2]
        : match[3] !== undefined
          ? match[3]
          : match[4];

    attrs[match[1]] = decodeHtml(attrs[match[1]]);
  }

  return attrs;
}

function parseHiddenInputs(html) {
  const fields = {};

  const inputRe = /<input\b[^>]*>/gi;
  let match;

  while ((match = inputRe.exec(html))) {
    const attrs = parseAttributes(match[0]);

    if (
      clean(attrs.type).toLowerCase() !== "hidden" ||
      !attrs.name
    ) {
      continue;
    }

    fields[attrs.name] = attrs.value ?? "";
  }

  return fields;
}

function extractFirst(html, regex, fallback = "") {
  const match = html.match(regex);
  return match ? decodeHtml(match[1]) : fallback;
}

function parseNumber(value) {
  const n = Number(clean(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseDisplay(display) {
  const parts = String(display)
    .split("|")
    .map(part => clean(part));

  return {
    selection: parts[0] || "",
    odds: parseNumber(parts[1]),
    status: parts[2] || "",
    line: parseNumber(parts[3])
  };
}

function marketType(marketCode, marketDescription, selection) {
  const code = clean(marketCode).toLowerCase();
  const description = clean(marketDescription).toLowerCase();
  const selectionValue = clean(selection).toLowerCase();

  if (
    code === "home wins either half" ||
    description === "home wins either half"
  ) {
    return "WIN_EITHER_HALF";
  }

  if (
    code.startsWith("overunder") ||
    description.includes("overunder") ||
    description.includes("over/under")
  ) {
    return "TOTAL_GOALS";
  }

  if (
    description === "1x2 1up" ||
    code === "1x2 1up"
  ) {
    return "1X2_1UP";
  }

  if (
    description === "1x2 2up" ||
    code === "1x2 2up"
  ) {
    return "1X2_2UP";
  }

  if (
    code === "1x2" ||
    description === "1x2"
  ) {
    return "1X2";
  }

  if (
    description.includes("both teams") ||
    description.includes("btts")
  ) {
    return "BTTS";
  }

  if (
    description.includes("double chance") ||
    code.includes("doublechance")
  ) {
    return "DOUBLE_CHANCE";
  }

  if (
    description.includes("handicap") ||
    code.includes("handicap")
  ) {
    return "HANDICAP";
  }

  if (
    description.includes("draw no bet") ||
    code.includes("drawnobet")
  ) {
    return "DRAW_NO_BET";
  }

  return clean(marketDescription || marketCode) || "UNKNOWN";
}

function parseFixtureMap(html) {
  const fixtures = new Map();

  const re =
    /<div\b[^>]*class="[^"]*\bCSubEv\b[^"]*"[^>]*>/gi;

  let match;

  while ((match = re.exec(html))) {
    const tag = match[0];
    const attrs = parseAttributes(tag);

    const subEventId = clean(attrs["data-idse"]);

    if (!subEventId) {
      continue;
    }

    const start = match.index + match[0].length;
    const remaining = html.slice(start, start + 2000);

    const titleMatch =
      remaining.match(
        /<span\b[^>]*title="([^"]*)"[^>]*>/i
      );

    const title = titleMatch
      ? stripTags(titleMatch[1])
      : "";

    if (title) {
      fixtures.set(subEventId, {
        subEventId,
        home: title.split(/\s+-\s+/)[0]?.trim() || title,
        away:
          title.split(/\s+-\s+/).slice(1).join(" - ").trim() ||
          "",
        name: title
      });
    }
  }

  return fixtures;
}

function parseQuoteRecords(html) {
  const match =
    html.match(
      /id="[^"]*hidIDQuote"[^>]*value="([^"]*)"/i
    );

  if (!match) {
    throw new Error(
      "Bet9ja booking response did not contain hidIDQuote."
    );
  }

  const value = decodeHtml(match[1]);

  return value
    .split("|")
    .map(record => record.split("&"))
    .filter(parts => parts.length >= 4)
    .map(parts => ({
      quoteId: clean(parts[0]),
      subEventId: clean(parts[1]),
      groupId: clean(parts[2]),
      hnd: parseNumber(parts[3])
    }));
}

function parseDIQMap(html) {
  const quotes = new Map();

  const re =
    /<div\b[^>]*class="DIQ[^"]*"[^>]*>[\s\S]*?<\/div>/gi;

  let match;

  while ((match = re.exec(html))) {
    const tag = match[0];

    const opening = tag.match(/^<div\b[^>]*>/i)?.[0] || "";
    const attrs = parseAttributes(opening);

    const id = clean(attrs.id);

    if (!id.startsWith("DIQ_")) {
      continue;
    }

    const quoteId = id.slice(4);

    const display = stripTags(
      tag.replace(/^<div\b[^>]*>/i, "").replace(/<\/div>$/i, "")
    );

    const parsed = parseDisplay(display);

    quotes.set(quoteId, {
      quoteId,
      tournamentId: clean(attrs["data-tid"]),
      competition: clean(attrs["data-tnm"]),
      countryId: clean(attrs["data-cid"]),
      country: clean(attrs["data-cnm"]),
      marketDescription: clean(attrs["data-thnd"]),
      line: parseNumber(attrs["data-hnd"]),
      marketCode: clean(attrs["data-ccq"]),
      selectionCode: clean(attrs["data-ctq"]),
      selection: parsed.selection,
      odds: parsed.odds,
      status: parsed.status,
      displayLine: parsed.line
    });
  }

  return quotes;
}

function splitFixture(name) {
  const value = clean(name);

  const parts = value.split(/\s+-\s+/);

  if (parts.length >= 2) {
    return {
      home: parts[0].trim(),
      away: parts.slice(1).join(" - ").trim()
    };
  }

  return {
    home: value,
    away: ""
  };
}

function selectionType(marketCode, selectionCode, selection) {
  const code = clean(selectionCode).toLowerCase();
  const market = clean(marketCode).toLowerCase();
  const value = clean(selection).toLowerCase();

  if (
    code.includes("_over") ||
    code.endsWith("_over")
  ) {
    return "OVER";
  }

  if (
    code.includes("_under") ||
    code.endsWith("_under")
  ) {
    return "UNDER";
  }

  if (
    market.startsWith("1x2") ||
    code.startsWith("1x2")
  ) {
    if (value === "1") return "HOME";
    if (value === "x") return "DRAW";
    if (value === "2") return "AWAY";
  }

  if (value === "yes") return "YES";
  if (value === "no") return "NO";

  return null;
}

function buildNormalizedSelection(record, fixture, quote) {
  const fixtureParts = splitFixture(fixture.name);

  return {
    sport: "Football",

    event: {
      id: record.subEventId,
      home: fixtureParts.home,
      away: fixtureParts.away,
      competition: quote.competition,
      startTime: null
    },

    market: {
      type: marketType(
        quote.marketCode,
        quote.marketDescription,
        quote.selection
      ),
      name: quote.marketDescription,
      line:
        quote.displayLine !== null
          ? quote.displayLine
          : quote.line
    },

    selection: {
      type: selectionType(
        quote.marketCode,
        quote.selectionCode,
        quote.selection
      ),
      name: quote.selection,
      value: quote.selectionCode,
      odds: quote.odds
    },

    bet9ja: {
      idQuota: record.quoteId,
      idSottoEvento: record.subEventId,
      idGruppoQuota: record.groupId,
      hnd: record.hnd,
      marketCode: quote.marketCode,
      selectionCode: quote.selectionCode,
      tournamentId: quote.tournamentId,
      countryId: quote.countryId,
      country: quote.country,
      status: quote.status
    }
  };
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": USER_AGENT,
        ...(options.headers || {})
      },
      body: options.body,
      redirect: "manual",
      signal: controller.signal
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `Bet9ja request failed with HTTP ${response.status}.`
      );
    }

    return {
      status: response.status,
      headers: response.headers,
      text
    };
  } finally {
    clearTimeout(timer);
  }
}

function cookieHeader(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];

  if (!values.length) {
    const single =
      response.headers.get("set-cookie");

    return single
      ? single.split(/,(?=[^;,]+=)/).map(v => v.split(";")[0]).join("; ")
      : "";
  }

  return values
    .map(value => value.split(";")[0])
    .join("; ");
}

async function decodeBookingCode(code) {
  const value = clean(code);

  if (!value) {
    throw new Error(
      "Bet9ja booking code is missing."
    );
  }

  const base =
    BASE_URL.replace(/\/+$/, "");

  const url =
    `${base}${BOOKING_PATH}`;

  // Step 1: establish the WebForms session.
  const initial =
    await fetchText(url);

  const hidden =
    parseHiddenInputs(initial.text);

  // Step 2: emulate the site's LOAD postback.
  hidden.__EVENTTARGET =
    "s$w$PC$cCouponISBets$btnFakeLoadPrenotazione";

  hidden.__EVENTARGUMENT = "";

  hidden[
    "s$w$PC$cCouponISBets$txtPrenotatore"
  ] = value;

  hidden[
    "s$w$PC$cCouponISBets$hdnBookingCode"
  ] = "";

  const formBody =
    new URLSearchParams(hidden).toString();

  const cookies =
    cookieHeader(initial);

  const loaded =
    await fetchText(url, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
        Referer: url,
        Origin: base,
        ...(cookies
          ? { Cookie: cookies }
          : {})
      },
      body: formBody
    });

  const html = loaded.text;

  const found =
    new RegExp(
      `Booking number\\s+${escapeRegExp(value)}\\s+found`,
      "i"
    ).test(html);

  if (!found) {
    if (/not found/i.test(html)) {
      throw new Error(
        `Bet9ja booking number ${value} was not found.`
      );
    }

    if (/not valid/i.test(html)) {
      throw new Error(
        `Bet9ja booking number ${value} is not valid.`
      );
    }

    throw new Error(
      `Bet9ja did not confirm booking number ${value}.`
    );
  }

  const records =
    parseQuoteRecords(html);

  if (!records.length) {
    throw new Error(
      `Bet9ja booking ${value} contains no selections.`
    );
  }

  const fixtures =
    parseFixtureMap(html);

  const quotes =
    parseDIQMap(html);

  const selections = [];

  for (const record of records) {
    const fixture =
      fixtures.get(record.subEventId);

    if (!fixture) {
      throw new Error(
        `Bet9ja sub-event ${record.subEventId} was not returned for booking ${value}.`
      );
    }

    const quote =
      quotes.get(record.quoteId);

    if (!quote) {
      throw new Error(
        `Bet9ja quote ${record.quoteId} was not returned for booking ${value}.`
      );
    }

    selections.push(
      buildNormalizedSelection(
        record,
        fixture,
        quote
      )
    );
  }

  return {
    bookmaker: "bet9ja",
    bookingCode: value,
    selections,

    bet9ja: {
      bookingNumber: value,
      totalSelections: selections.length,
      bookingStatus: "Booked"
    },

    raw: {
      quoteRecords: records,
      html
    }
  };
}

async function createBookingCode() {
  throw new Error(
    "BetCode Pro internal Bet9ja create codec is not implemented yet."
  );
}

module.exports = {
  decodeBookingCode,
  createBookingCode
};
