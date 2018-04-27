const fs = require("fs");

const main = inputFilePath => {
  const readStream = fs.createReadStream(inputFilePath, {
    encoding: "utf8",
    highWaterMark: 256
  });

  readStream.on("data", chunk => {
    console.log(">>> " + chunk);
    console.log("\n");
  });

  readStream.on("end", () => {
    console.log("### DONE ###");
  });
};

main("./mock-data.json");
