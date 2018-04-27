const http = require("http");
const fs = require("fs");
const streamify = require("./node-stream-generators");

/**
 * `function*` defines a generator function.
 * You can not define these as an arrow function.
 *
 * These use `yield` instead of `return`
 *
 * More: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*
 */
async function* chunksToLines(asyncChunks) {
  let previous = "";

  for await (const chunk of asyncChunks) {
    previous += chunk;
    let eolIndex;

    while ((eolIndex = previous.indexOf("\n")) >= 0) {
      // this line includes the EOL
      const line = previous.slice(0, eolIndex + 1);
      yield line;
      previous = previous.slice(eolIndex + 1);
    }
  }

  if (previous.length > 0) {
    yield previous;
  }
}

async function* numberOfLines(asyncLines) {
  let counter = 1;
  for await (const line of asyncLines) {
    yield counter + ": " + line;
    counter++;
  }
}

const server = http.createServer(async (req, res) => {
  const readStream = fs.createReadStream("./mock-data.json", {
    encoding: "utf8",
    highWaterMark: 256
  });

  streamify(numberOfLines(chunksToLines(readStream))).pipe(res);
});

server.listen(8000);
