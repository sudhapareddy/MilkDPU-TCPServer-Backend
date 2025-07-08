const mongoose = require("mongoose");

function createServerSettingsModel(collectionName) {
  const modelName = `${collectionName}_ServerSettings`; // unique model name

  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }

  const serverSettingsSchema = new mongoose.Schema({
    SERVERCONTROL: String,
    WEIGHTMODE: String,
    FATMODE: String,
    ANALYZER: String,
    USECOWSNF: String,
    USEBUFSNF: String,
    CLRBASEDTABLE:String,
    HIGHFATACCEPT: String,
    LOWFATACCEPT: String,
    MEMBERLISTCONTROL: String,
    RATETABLESCONTROL: String,
    COLLECTIONMODECONTROL: String,
    AUTOTRANSFER: String,
    AUTOSHIFTCLOSE: String,
    MIXEDMILK: String,
    MACHINELOCK: String,
    COMMISSIONTYPE: String,
    NORMALCOMM: String,
    SPECIALCOMM: [],
  });

  return mongoose.model(modelName, serverSettingsSchema, collectionName);
}

module.exports = createServerSettingsModel;
