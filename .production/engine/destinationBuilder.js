function buildDestinationSlip({ destinationBookmaker, converted }) {
  if (!destinationBookmaker) {
    return { success:false, stage:"DESTINATION_BUILDER",
      errors:["Destination bookmaker is missing."] };
  }

  if (!converted || typeof converted !== "object") {
    return { success:false, stage:"DESTINATION_BUILDER",
      errors:["Converted bet slip is missing."] };
  }

  if (!converted.success) {
    return { success:false, stage:"DESTINATION_BUILDER",
      errors:["Conversion was not successful."] };
  }

  if (!Array.isArray(converted.selections) || !converted.selections.length) {
    return { success:false, stage:"DESTINATION_BUILDER",
      errors:["No converted selections were found."] };
  }

  const errors = [];

  const selections = converted.selections.map((item, index) => {
    const number = item.index || index + 1;
    const event = item.event?.destination;

    if (!event?.id)
      errors.push(`Selection ${number}: destination event is missing.`);

    if (!item.market?.type)
      errors.push(`Selection ${number}: destination market type is missing.`);

    if (!item.selection?.type)
      errors.push(`Selection ${number}: destination selection type is missing.`);

    return {
      index: number,
      event: event ? {
        id: event.id,
        home: event.home || null,
        away: event.away || null,
        competition: event.competition || null,
        startTime: event.startTime || null
      } : null,
      market: {
        type: item.market?.type || null,
        line: item.market?.line ?? null
      },
      selection: {
        type: item.selection?.type || null
      }
    };
  });

  if (errors.length)
    return { success:false, stage:"DESTINATION_BUILDER", errors };

  return {
    success:true,
    stage:"DESTINATION_BUILDER",
    destinationBookmaker:String(destinationBookmaker).toLowerCase().trim(),
    selections
  };
}

module.exports = { buildDestinationSlip };
