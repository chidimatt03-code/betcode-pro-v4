const ROUTES = {
  "sportybet->bet9ja": {
    source: "sportybet",
    destination: "bet9ja",
    status: "development",
    sourceDecode: false,
    destinationCreate: false
  },

  "bet9ja->sportybet": {
    source: "bet9ja",
    destination: "sportybet",
    status: "development",
    sourceDecode: false,
    destinationCreate: false
  },

  "sportybet->betking": {
    source: "sportybet",
    destination: "betking",
    status: "development",
    sourceDecode: false,
    destinationCreate: false
  },

  "betking->sportybet": {
    source: "betking",
    destination: "sportybet",
    status: "development",
    sourceDecode: false,
    destinationCreate: false
  },

  "bet9ja->betking": {
    source: "bet9ja",
    destination: "betking",
    status: "development",
    sourceDecode: false,
    destinationCreate: false
  },

  "betking->bet9ja": {
    source: "betking",
    destination: "bet9ja",
    status: "development",
    sourceDecode: false,
    destinationCreate: false
  }
};

function getRoute(source, destination) {
  const key =
    `${String(source || "").toLowerCase().trim()}->` +
    `${String(destination || "").toLowerCase().trim()}`;

  return ROUTES[key] || null;
}

function isSupportedRoute(source, destination) {
  return Boolean(getRoute(source, destination));
}

function isLiveRoute(source, destination) {
  const route = getRoute(source, destination);

  return Boolean(
    route &&
    route.sourceDecode === true &&
    route.destinationCreate === true
  );
}

module.exports = {
  ROUTES,
  getRoute,
  isSupportedRoute,
  isLiveRoute
};
