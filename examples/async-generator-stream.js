const fs = require("fs");
const streamify = require("../index");
/**
 * `function*` defines a generator function.
 * You can not define these as an arrow function.
 *
 * These use `yield` instead of `return`
 *
 * More: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*
 */
async function* chunksToLines(chunks) {
  let previous = "";

  for await (const chunk of chunks) {
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

async function* numberOfLines(lines) {
  let counter = 1;
  for await (const line of lines) {
    yield counter + ": " + line;
    counter++;
  }
}

const printAsyncIterable = async numberedLines => {
  for await (const line of numberedLines) {
    console.log(line);
  }
};

const main = () => {
  const readStream = fs.createReadStream("./mock-data.json", {
    encoding: "utf8",
    highWaterMark: 256
  });
  printAsyncIterable(numberOfLines(chunksToLines(readStream)));
};

main();
