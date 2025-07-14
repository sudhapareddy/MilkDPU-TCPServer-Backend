// saveRecordFromTCP.js
//const Record = require("./models/records"); // adjust the path as needed
const getRecordModel = require("./models/records");

function combineBytesInt(msb, lsb) {
  return (msb << 8) | lsb;
}

function combineBytesFloat(msb, lsb) {
  const value = (msb << 8) | lsb;
  return (value / 100).toFixed(2);
}

function combineBytesFloatSingle(msb, lsb) {
  const value = (msb << 8) | lsb;
  return (value / 10).toFixed(1);
}

function combineFourBytesToFixed(b1, b2, b3, b4) {
  const value = (b1 << 24) | (b2 << 16) | (b3 << 8) | b4;
  return (value / 100).toFixed(2);
}

async function saveRecords(data, socket) {
  const totalRecords = data[23];
  let startIndex = 24;

  for (let recordNo = 0; recordNo < totalRecords; recordNo++) {
    try {
      const dpuId = `${socket.deviceId}`;
      const code = combineBytesInt(data[startIndex + 1], data[startIndex]);
      const milkType =
        String.fromCharCode(data[startIndex + 2]) === "B" ? "BUF" : "COW";
      const fat = (data[startIndex + 3] / 10).toFixed(1).padStart(4, "0");
      const snf = (data[startIndex + 4] / 10).toFixed(1).padStart(4, "0");
      const qty = combineBytesFloat(
        data[startIndex + 6],
        data[startIndex + 5]
      ).padStart(6, "0");
      const rate = combineBytesFloat(
        data[startIndex + 8],
        data[startIndex + 7]
      ).padStart(6, "0");
      const shift =
        String.fromCharCode(data[startIndex + 9]) === "M"
          ? "MORNING"
          : "EVENING";
      const sampleDate = `${data[startIndex + 10]
        .toString()
        .padStart(2, "0")}/${data[startIndex + 11]
        .toString()
        .padStart(2, "0")}/20${data[startIndex + 12]
        .toString()
        .padStart(2, "0")}`;
      const sampleTime = `${data[startIndex + 13]
        .toString()
        .padStart(2, "0")}:${data[startIndex + 14]
        .toString()
        .padStart(2, "0")}:${data[startIndex + 27]
        .toString()
        .padStart(2, "0")}`;
      const analyzerMode = data[startIndex + 15] === 0 ? "MANUAL" : "AUTO";
      const weightMode = data[startIndex + 16] === 0 ? "MANUAL" : "AUTO";
      const clr = combineBytesFloatSingle(
        data[startIndex + 18],
        data[startIndex + 17]
      );
      const water = combineBytesFloatSingle(
        data[startIndex + 20],
        data[startIndex + 19]
      );
      const analyzerSampleTime = `${data[startIndex + 21]
        .toString()
        .padStart(2, "0")}:${data[startIndex + 22]
        .toString()
        .padStart(2, "0")}`;
      const incentiveAmount = combineFourBytesToFixed(
        data[startIndex + 26],
        data[startIndex + 25],
        data[startIndex + 24],
        data[startIndex + 23]
      );
      const recordType = String.fromCharCode(data[startIndex + 28]);

      //const collectionName = `${socket.deviceId}_records`; // You can generate this dynamically
      const collectionName = `records`; // You can generate this dynamically
      const Record = getRecordModel(collectionName);

      // Duplicate check for RECORDTYPE 'E'
      if (recordType === 'E') {
        const duplicates = await Record.find({ SAMPLEDATE: sampleDate, SAMPLETIME: sampleTime, CODE: code });
        if (duplicates.length > 0) {
          // Find the latest record by _id (regardless of RECORDTYPE)
          const latestRecord = duplicates.reduce((latest, rec) => rec._id > latest._id ? rec : latest, duplicates[0]);
          latestRecord.RECORDTYPE = 'D';
          await latestRecord.save();
          console.log(`Duplicate record(s) found for SAMPLEDATE: ${sampleDate}, SAMPLETIME: ${sampleTime}, CODE: ${code}. Changed latest record's RECORDTYPE to 'D' and saving new record.`);
        }
      }

      const newRecord = new Record({
        DEVICEID: dpuId,
        CODE: code,
        MILKTYPE: milkType,
        FAT: fat,
        SNF: snf,
        QTY: qty,
        RATE: rate,
        SAMPLEDATE: sampleDate,
        SAMPLETIME: sampleTime,
        SHIFT: shift,
        ANALYZERMODE: analyzerMode,
        WEIGHTMODE: weightMode,
        CLR: clr,
        WATER: water,
        ANALYZERSAMPLETIME: analyzerSampleTime,
        INCENTIVEAMOUNT: incentiveAmount,
        RECORDTYPE: recordType,
      });

      console.log("Record saving...");

      await newRecord.save();
      console.log(`Record #${recordNo + 1} saved successfully.`);
      console.log(
        `DEVICEID:${dpuId}`,
        `CODE:${code}`,
        `MILKTYPE:${milkType}`,
        `FAT:${fat}`,
        `SNF:${snf}`,
        `QTY:${qty}`,
        `RATE:${rate}`,
        `SHIFT:${shift}`,
        `DATE:${sampleDate}`,
        `TIME:${sampleTime}`,
        `ANALYZER MODE:${analyzerMode}`,
        `WEIGHT MODE:${weightMode}`,
        `CLR:${clr}`,
        `WATER:${water}`,
        `ANALYZERSAMPLETIME:${analyzerSampleTime}`,
        `INCENTIVE:${incentiveAmount}`,
        `RECORDTYPE:${recordType}`
      );
    } catch (error) {
      console.error(`Error saving record #${recordNo + 1}:`, error);
      socket.write("Error Saving Record\n");
    }

    startIndex += 29;
  }

  socket.write(`#SCTSYNCRECORDS:${socket.deviceId}!`);
}

module.exports = saveRecords;

//sms API = tmrHOxMiaSeQlW2GhwDpkjuc0BU39b6goRJ4CfYILENKPq8XvZHBMzSEKlw23GXj4h8FtI1beqg7PWpi
