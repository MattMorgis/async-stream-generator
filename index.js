const { Readable } = require("stream");

const isAsyncIterator = obj => {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.asyncIterator] === "function";
};

function StreamGenerators(g) {
  if (!isAsyncIterator(g))
    throw new TypeError("First argument must be a ES6 Async Generator");

  Readable.call(this, { objectMode: true });
  this._g = g;
}

StreamGenerators.prototype = Object.create(Readable.prototype, {
  constructor: { value: StreamGenerators }
});

StreamGenerators.prototype._read = function(size) {
  try {
    this._g.next().then(r => {
      if (false === r.done) {
        this.push(r.value);
      } else {
        this.push(null);
      }
    });
  } catch (e) {
    this.emit("error", e);
  }
};

module.exports = list => {
  return new StreamGenerators(list);
};
