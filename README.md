# async-stream-generator

Pipe ES6 Async Generators through Node.js [Streams](https://nodejs.org/api/stream.html).

## 10 Second Tutorial

`streamify` takes a

```javascript
const fs = require("fs");
const streamify = require("async-stream-generator");

async function* generator(stream) {
  for await (const chunk of stream) {
    yield chunk;
  }
}

const main = () => {
  const readStream = fs.createReadStream("path-to-data.json");

  streamify(generator(readStream)).pipe(process.stdout);
};

main();
```

## What are Streams and Why Should I Care?

I/O in node is asynchronous. The early days of Node.js required interacting with the disk and network by passing callbacks to functions.

For example, here is code that serves up a file from disk:

```javascript
const http = require("http");
const fs = require("fs");

const server = http.createServer((request, response) => {
  fs.readFile(__dirname + "/mock-data.json", (error, data) => {
    response.end(data);
  });
});
server.listen(8000);
```

This code works but it buffers up the entire file into memory for every request before writing the result back to clients. If the file is very large, your program could start eating a lot of memory as it serves lots of users concurrently, particularly for users on slow connections.

The user experience is poor too because users will need to wait for the whole file to be buffered into memory on your server before they can start receiving any content.

However, both `request` and `response` are **streams**.

```javascript
const http = require("http");
const fs = require("fs");

const server = http.createServer((req, res) => {
  const stream = fs.createReadStream(__dirname + "/mock-data.json");
  stream.pipe(res);
});
server.listen(8000);
```

This is where Node.js shines. `.pipe()` will write to clients one chunk at at a time immediately as they are received from disk.

Using `.pipe()` has other benefits too, like handling backpressure automatically so that node won't buffer chunks into memory needlessly when the remote client is on a really slow or high-latency connection.

This is very much like what you might do on the command-line to pipe programs together except in node instead of the shell!

```
a | b | c | d
```

Once you learn the stream api, you can just snap together streaming modules like lego bricks instead of having to remember how to push data through non-streaming, custom APIs.

Streams make programming in node simple, elegant, and composable.

## What are Async Iterators and Generators?

Previously to read the contents of a stream asynchronously, you used callbacks:

```javascript
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
```

As of Node.js v10, you can use [`asynchronous iteration`](https://github.com/tc39/proposal-async-iteration) to read the stream of a file, which enables the `for-await-of` syntax:

```javascript
const fs = require("fs");

const main = async inputFilePath => {
  const readStream = fs.createReadStream(inputFilePath, {
    encoding: "utf8",
    highWaterMark: 256
  });

  for await (const chunk of readStream) {
    console.log(">>> " + chunk);
    console.log("\n");
  }

  console.log("### DONE ###");
};

main("./mock-data.json");
```

Output for both:

```
...

>>> ld":"Indonesia","customer_title":"Honorable"}
{"guid":"bf62800e-b3b1-46f2-a3f2-dc17c66c90a1","car_make":"Ford","car_model":"Bronco II","car_model_year":1986,"car_color":"Pink","car_country_cold":"Philippines","customer_title":"Rev"}
{"guid":"32a2f79b-5a0b-


>>> 4072-9ebb-0e3600d0f714","car_make":"Toyota","car_model":"RAV4","car_model_year":2001,"car_color":"Purple","car_country_cold":"China","customer_title":"Mr"}
{"guid":"6d52f031-c7e7-4167-81bc-e2879d6630e2","car_make":"Lexus","car_model":"SC","car_model_year":


>>> 1998,"car_color":"Teal","car_country_cold":"Russia","customer_title":"Rev"}



### DONE ###
```

You can use async generators to process input similiar to Unix piping. Generator functions use the `async` and `function*` keywords, consume an async iterator and use `yield` instead of `return`.

Example of Generator #1, which will process our chunks of data into lines:

```javascript
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
```

Example of Generator #2, which will number each line

```javascript
async function* numberOfLines(lines) {
  let counter = 1;
  for await (const line of lines) {
    yield counter + ": " + line;
    counter++;
  }
}
```

Now you can snap these generators together using function composition to stream the file to the console line by line.

The whole program will read in the file 256 bytes at a time (defined by `highWaterMark`). Break each chunk into lines, number them, print them, and repeat.

```javascript
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
```

Output

```
...
3999: {"guid":"32a2f79b-5a0b-4072-9ebb-0e3600d0f714","car_make":"Toyota","car_model":"RAV4","car_model_year":2001,"car_color":"Purple","car_country_cold":"China","customer_title":"Mr"}

4000: {"guid":"6d52f031-c7e7-4167-81bc-e2879d6630e2","car_make":"Lexus","car_model":"SC","car_model_year":1998,"car_color":"Teal","car_country_cold":"Russia","customer_title":"Rev"}
```

## Where Async Generators Fall Short

These new tools are great for _reading_ streams, however, it's still not clear how to `write()` to another stream or create a processing pipeline with `pipe()`.

This was discussed [here](https://github.com/tc39/proposal-async-iteration/issues/74).

Enter this module.

Using the same generators from above, we can `pipe()` the results to a writeable stream.

```javascript
const http = require("http");
const fs = require("fs");
const streamify = require("./node-stream-generators");

const server = http.createServer(async (req, res) => {
  const readStream = fs.createReadStream("./mock-data.json", {
    encoding: "utf8",
    highWaterMark: 256
  });

  streamify(numberOfLines(chunksToLines(readStream))).pipe(res);
});

server.listen(8000);
```

## References and Thank Yous

* All code can be found in the `examples` directory.

* This was forked from [@mimetnet](https://github.com/mimetnet)'s module [stream-generators](https://github.com/mimetnet/node-stream-generators), which offers the same functionality to synchronous generators.

* Early stream examples and a deeper dive into streams can be found at [@substack](https://github.com/substack)'s [Stream Handbook](https://github.com/substack/stream-handbook).

* [TC39 Proposal](https://github.com/tc39/proposal-async-iteration).

* Node.js Support for [Symbol.asyncIterator](https://github.com/nodejs/readable-stream/issues/254).

* [Node.js Stream Meeting Notes - Async Iterators](https://github.com/tc39/proposal-async-iteration/issues/74).

## License

[MIT]()
