const getMinMaxFatSnf = require("./GetSnfMinMax"); // adjust path as needed

async function sendSnfLimits(command, message, socket, deviceState) {
  const isBuf = command.includes("BUF");
  const milkType = isBuf ? "SNFBUF" : "SNFCOW";

  let deviceTable,snfTable, rateTableId, snfEffectiveDate;

  let CLRBASEDTABLE = deviceState.deviceInfo.serverSettings.clrBasedTable;
  console.log("clr",CLRBASEDTABLE)

  if (milkType === "SNFBUF") {
    deviceTable = CLRBASEDTABLE === 'Y' ? deviceState.deviceInfo.isDeviceRateTable.clrBufTable : deviceState.deviceInfo.isDeviceRateTable.snfBufTable;
    if (deviceTable === true) {
      snfTable = CLRBASEDTABLE === 'Y' ? deviceState.deviceInfo.clrBufTable : deviceState.deviceInfo.snfBufTable;
      console.log(`Device ${CLRBASEDTABLE === 'Y' ? "clr" : "snf"} Buf Table`);
    } else {
      snfTable = CLRBASEDTABLE === 'Y' ? deviceState.dairyInfo.clrBufTable : deviceState.dairyInfo.snfBufTable;
      console.log(`Dairy ${CLRBASEDTABLE === 'Y' ? "clr" : "snf"} Buf Table`);
    }

    rateTableId = CLRBASEDTABLE === 'Y' ? deviceState.deviceInfo.rateChartIds?.clrBufId : deviceState.deviceInfo.rateChartIds?.snfBufId;
    snfEffectiveDate = CLRBASEDTABLE === 'Y' ? deviceState.deviceInfo.effectiveDates?.clrBufEffectiveDate :
      deviceState.deviceInfo.effectiveDates?.snfBufEffectiveDate;
  } else if (milkType === "SNFCOW") {
    deviceTable = CLRBASEDTABLE === 'Y' ? deviceState.deviceInfo.isDeviceRateTable.clrCowTable : deviceState.deviceInfo.isDeviceRateTable.snfCowTable;
    if (deviceTable === true) {
      snfTable = CLRBASEDTABLE === 'Y' ? deviceState.deviceInfo.clrCowTable : deviceState.deviceInfo.snfCowTable;
      console.log(`Device ${CLRBASEDTABLE === 'Y' ? "clr" : "snf"} Cow Table`);
    } else {
      snfTable = CLRBASEDTABLE === 'Y' ?  deviceState.dairyInfo.clrCowTable : deviceState.dairyInfo.snfCowTable;
      console.log(`Dairy ${CLRBASEDTABLE === 'Y' ? "clr" : "snf"} Cow Table`);
    }

    rateTableId = CLRBASEDTABLE === 'Y' ? deviceState.deviceInfo.rateChartIds?.clrCowId : deviceState.deviceInfo.rateChartIds?.snfCowId;
    snfEffectiveDate = CLRBASEDTABLE === 'Y' 
                      ? deviceState.deviceInfo.effectiveDates?.clrCowEffectiveDate
                      : deviceState.deviceInfo.effectiveDates?.snfCowEffectiveDate;
  }

  if (message === `${command}:${socket.deviceId}${rateTableId}!`) {
    return socket.write("#NO NEW RATE CHART AVAILABLE!");
  }

  const limits = await getMinMaxFatSnf(snfTable, socket, deviceState);
  if (!limits) {
    // rate tables not found, already informed device
    console.log("#No Limits Available!");

    socket.write("#No Limits Available!");
    return;
  }
  deviceState.fatsnfRateMapping = limits.fatRateMapping;

  //const snfId = rateTableId;
  const snfKey = isBuf ? "snfBufRecord" : "snfCowRecord";
  deviceState[snfKey] = limits.minFat;

  const response = `#${command.slice(1)}:${socket.deviceId}${rateTableId}${
    limits.minFat
  }${limits.maxFat}${limits.minSnf}${limits.maxSnf}${snfEffectiveDate}!`;
  console.log(response);
  socket.write(response);
}

module.exports = sendSnfLimits;
