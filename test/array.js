var ParseStream = require('../lib/ParseStream');
var assert = require('assert');
var length = 10
var i = length;
var chunks = 0;
var array = []
while (i --) {
  array.push(
    Math.random() < 0.5 
    ? {
        name: 'array',
        value: Math.random(),
        obj: {a: 1, B: 2 },
        JSON: JSON.stringify({'eohnu': 'rcpyru', x: 0, n: null, a: []}), //a string of json
        nested_array: [
            {
                float: 1000.1,
                string: "a long string ? \" coucou 'oui oui non non' \n\r",
                nothingmuch: null
            },
            5,
            8,
            "yet another string"
        ]
      }
    : [1,4,42,{oaeu: 'rcgrg'}]
  )
}
var json = JSON.stringify(array)

console.log('parsing %s\n\n', json);

var p = new ParseStream();
p.on('end', function(o) {
    console.log('result object', o);
    var res = JSON.stringify(o);
    assert.equal(res, json, "the objects are not identical");
    console.log('ignored', this._ignored);
    console.log('queue', this._queue);

    assert.equal(chunks, length)    
});
p.on('data', function (obj) {
  chunks ++
  console.error('element', obj)
  assert.deepEqual(obj, array.shift())
});


//randomly rechunk the json

var chunx = json
while(chunx) {
  var r = Math.round(Math.random() * json.length/5)
  p.write(chunx.slice(0, r))
  chunx = chunx.slice(r)  
}
p.end()