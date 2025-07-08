const DeviceModel = require("./models/device");

async function sendServerSettings(socket) {
  try {
    const settingsList = await DeviceModel.findOne(
      { deviceid: socket.deviceId },
      { serverSettings: 1, _id: 0 }
    );

    if (!settingsList || !settingsList.serverSettings) {
      console.log(`⚠️ No settings found for device ${socket.deviceId}`);
      socket.write(`#SCTSERVERVALUE2:${socket.deviceId}NO SETTINGS FOUND!`);
      return;
    }

    const s = settingsList.serverSettings; //settingsList[0]; // Access first settings document
    const commissions = s.specialCommission;
const clrBasedTable = s.clrBasedTable;
    //const item = commissions[4];

    // console.log(item, "comm");

    const responseData =
      `#SCTSERVERVALUE2:${socket.deviceId}` +
      `${s.serverControl}${s.weightMode}${s.fatMode}${s.analyzer}` +
      `${s.useCowSnf}${s.useBufSnf}${s.highFatAccept}${s.lowFatAccept}` +
      `${s.dpuMemberList}${s.dpuRateTables}${s.dpuCollectionModeControl}` +
      `${s.autoTransfer}${s.autoShiftClose}${s.mixedMilk}${s.machineLock}` +
      `${s.commissionType}:N${s.normalCommission}S${commissions[0]}${commissions[1]}${commissions[2]}${commissions[3]}${commissions[4]}${commissions[5]}${commissions[6]}${commissions[7]}${commissions[8]}${s.clrBasedTable}!`;

    console.log("📤 Sending settings:", responseData);
    console.log("📤 clr settings:", clrBasedTable);

    socket.write(responseData);
  } catch (error) {
    console.error("❌ Failed to send server settings:", error);
    socket.write(`#SCTSERVERVALUE2:${socket.deviceId}ERROR!`);
  }
}

module.exports = sendServerSettings;
