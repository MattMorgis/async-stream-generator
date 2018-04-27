const fs = require("fs");

const main = async inputFilePath => {
  const readStream = fs.createReadStream(inputFilePath, {
    encoding: "utf8",
    highWaterMark: 256
  });

  /**
   * Starting w/ Node.js v10, you can use `async iteration`
   * to read files asynchronously. It provides the `for-await-of` API
   * to iterate over the chunks. It is only available inside `async` functions
   */
  for await (const chunk of readStream) {
    console.log(">>> " + chunk);
    console.log("\n");
  }

  console.log("### DONE ###");
};

main("./mock-data.json");
