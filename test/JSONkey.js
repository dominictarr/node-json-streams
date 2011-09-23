var ParseStream = require('../lib/ParseStream');
var assert = require('assert');

var json = JSON.stringify({
    '{"valid JSON": "is a key"}': [
        {},
        8,
    ]
});
console.log('parsing %s\n\n', json);

var p = new ParseStream();
var called = 0
p.on('data', function(o) {
    called ++
    console.log('result object', o);
    var res = JSON.stringify(o);
    assert.equal(res, json, "the objects are not identical");
    console.log('ignored', this._ignored);
    console.log('queue', this._queue);
});
p.on('end', function () {
  assert.equal(called, 1)  
})
p.end(json);
