async function getMinMaxFatSnf(snfTable, socket, deviceState) {
  try {
    
    if (
      !snfTable ||
      typeof snfTable !== "object" ||
      Object.keys(snfTable).length === 0
    ) {
      socket.write("#No SNF data found in device record!\n");
      return;
    }

    const fatKeys = Object.keys(snfTable)
      .map(Number)
      .filter((num) => !isNaN(num))
      .sort((a, b) => a - b);

    const minFat = fatKeys.length
      ? fatKeys[0].toFixed(1).padStart(4, "0")
      : "00.0";
    const maxFat = fatKeys.length
      ? fatKeys[fatKeys.length - 1].toFixed(1).padStart(4, "0")
      : "00.0";

    let snfValues = new Set();
    let fatRateMapping = {};

    fatKeys.forEach((fat) => {
      const fatStr = fat.toFixed(1);
      const entries = snfTable[fatStr] || [];

      const rates = entries.map((entry) => {
        const snf = Object.keys(entry)[0];
        const rate = entry[snf];
        snfValues.add(parseFloat(snf).toFixed(1).padStart(4, "0"));
        return parseFloat(rate).toFixed(2).padStart(6, "0");
      });

      fatRateMapping[fatStr] = rates.length ? rates.join(",") : "";
    });

    const sortedSnf = Array.from(snfValues).sort((a, b) => a - b);
    const minSnf = sortedSnf.length ? sortedSnf[0] : "00.0";
    const maxSnf = sortedSnf.length ? sortedSnf[sortedSnf.length - 1] : "00.0";

    return { minFat, maxFat, minSnf, maxSnf, fatRateMapping };
  } catch (error) {
    console.error("❌ SNF Rate Table Error:", error);
    socket.write(`#No Rate Tables exist!\n`);
  }
}

module.exports = getMinMaxFatSnf;
