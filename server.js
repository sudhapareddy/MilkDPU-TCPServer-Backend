require("dotenv").config();
require("./db"); // connects to MongoDB

console.log("sudha");

const net = require("net");

const sendServerSettings = require("./getServerSettings");

const addMember = require("./Members/addMember");
const updateMemberRecord = require("./Members/updateMember");
const deleteAllMemberRecords = require("./Members/deleteAllMembers");

const sendRateChartIds = require("./RateTables/GetRatechartIds");
const sendFatAndRateValues = require("./RateTables/GetFatRates");

const sendSnfLimits = require("./RateTables/sendSnfLimits");
const sendSnfRates = require("./RateTables/sendSnfRates");

const isDeviceRegistered = require("./findDevice");
const saveRecords = require("./Add_Transaction_Records");

const getMemberCount = require("./Members/getMemberCount");
const sendMemberBatch = require("./Members/SendMembers");

const getDairyInfo = require("./getDairyInfo");

const sendSMS = require("./SendSMS");

const HOST = "0.0.0.0";
const PORT = 3699;

const activeConnections = new Map();
const deviceStates = new Map();

function extractDeviceId(message) {
  const match = message.match(/:([A-Z0-9]{7})/);
  return match ? match[1] : null;
}

//console.log("📦 All env vars:", JSON.stringify(process.env, null, 2));

//sendSMS("9059205929", "🚀 Hello from my professional Node.js server!");
//sendSMS();

const server = net.createServer((socket) => {
  console.log(
    `✅ IoT Device Connected: ${socket.remoteAddress}:${socket.remotePort}`
  );
  const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;

  activeConnections.set(clientAddress, socket);

  socket.setTimeout(30000); // Set idle timeout for socket
  socket.on("timeout", () => {
    console.log(`⌛ Timeout: ${clientAddress}`);
    socket.end();
  });

  socket.on("data", async (data) => {
    const message = data.toString().trim();
    console.log(`📩 Received: ${message}`);

    try {
      const [command, payload] = message.split(":");

      //console.log("command:" + command, "payload:" + payload);

      if (command.startsWith("#SCTSTART")) {
        const deviceId = extractDeviceId(message);
        const deviceInfo = await isDeviceRegistered(deviceId);

        if (!deviceInfo) {
          socket.write(`#MACHINE NOT ADDED!`); //socket.write(`#DEVICE NOT FOUND!`);
          //socket.end();
          return;
        }

        if (deviceInfo.status !== "active") {
          socket.write(`#MACHINE DEACTIVATED!`);
          //socket.end();
          return;
        }

        if (!socket.deviceId) {
          socket.deviceId = deviceId;
          activeConnections.set(deviceId, socket);
        }

        if (!deviceStates.has(deviceId)) {
          const dairyInfo = await getDairyInfo(deviceInfo.dairyCode);
          deviceStates.set(deviceId, {
            deviceInfo: deviceInfo,
            dairyInfo: dairyInfo,
          });
        }

        socket.write(`${command}:${deviceId}!`);
        return;
      }

      if (!socket.deviceId) {
        socket.write("#DEVICE NOT REGISTERED YET!\n");
        console.log("#DEVICE NOT REGISTERED YET!\n");
        socket.end();

        return;
      }

      const deviceState = deviceStates.get(socket.deviceId);

      if (command === "#SCTSYNCRECORDS") {
        try {
          await saveRecords(data, socket);
        } catch (err) {
          console.error("Failed to sync records:", err);
          socket.write("#Failed to sync records!\n");
        }
        return;
      }

      switch (command) {
        case "#SCTENDSHIFT":
          return socket.write(`#SCTENDSHIFT:${socket.deviceId}!`);

        case "#SCTEND":
          return socket.write(`#SCTEND:${socket.deviceId}!`);

        case "#SCTCLOSE":
          return socket.write(`#SCTCLOSE:${socket.deviceId}!`);

        case "#SCTADDMEMBER":
          return await addMember(message, socket);

        case `#SCTEDITMEMBER`:
          return await updateMemberRecord(message, socket);

        case `#SCTDELETEALL`:
          return await deleteAllMemberRecords(socket);

        case `#SCTMEMBERCOUNT`:
          return await getMemberCount(socket, deviceState); // Call the new function

        case `#SCTMEMBER`:
          return sendMemberBatch(socket, deviceState, payload);

        case `#SCTSERVERVALUE2`:
          return await sendServerSettings(socket);

        case `#SCTRATECHARTIDS`:
          return await sendRateChartIds(socket, deviceState); // Handle rate chart IDs

        case `#SCTSNFBUFLIMITS`:
        case `#SCTSNFCOWLIMITS`:
          return await sendSnfLimits(command, message, socket, deviceState);

        case `#SCTSNFBUFRECORD`:
        case `#SCTSNFCOWRECORD`:
          return sendSnfRates(command, message, socket, deviceState);

        case `#SCTSNFBUFEND`:
        case `#SCTSNFCOWEND`:
          console.log("Sudha",deviceState.clrBasedTable)

          return socket.write(
            `#${command.slice(1)}:${socket.deviceId}${
              command.includes("BUF")
                ? deviceState.clrBasedTable === 'Y' ? deviceState.clrBufId : deviceState.snfBufId
                : deviceState.clrBasedTable === 'Y' ? deviceState.clrCowId : deviceState.snfCowId
            }!`
          );

        case `#SCTFATBUFRECORD`:
        case `#SCTFATCOWRECORD`:
          return await sendFatAndRateValues(
            command,
            message,
            socket,
            deviceState
          );

        //sendFatRates(command, message, socket, deviceState);

        case `#SCTFATBUFEND`:
        case `#SCTFATCOWEND`:
          return socket.write(
            `#${command.slice(1)}:${socket.deviceId}${
              command.includes("BUF")
                ? deviceState.fatBufId
                : deviceState.fatCowId
            }!`
          );

        default:
          return socket.write("#INVALID COMMAND!\n");
      }
    } catch (err) {
      console.error("❌ Error processing message:", err);
      socket.write("#INTERNAL SERVER ERROR\n");
    }
  });

  function cleanupSocket(socket, clientAddress) {
    if (socket.deviceId) {
      activeConnections.delete(socket.deviceId);
      deviceStates.delete(socket.deviceId);
    }
    activeConnections.delete(clientAddress);
  }

  socket.on("end", () => {
    console.log(`🔌 Connection ended: ${clientAddress}`);
    cleanupSocket(socket, clientAddress);
  });

  socket.on("close", () => {
    console.log(`🔌 IoT Device Disconnected: ${clientAddress}`);
    cleanupSocket(socket, clientAddress);
  });

  socket.on("error", (err) => {
    console.error(`❌ Socket error from ${clientAddress}:`, err.message);
    cleanupSocket(socket, clientAddress);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 TCP Server running on ${HOST}:${PORT}`);
});
