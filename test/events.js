
var ParseStream = require('../lib/ParseStream');
var assert = require('assert');

var json = JSON.stringify({
    coucou: "salut",
    number: 8,
    bool: true,
    meh: null,
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
});
console.log('parsing %s\n\n', json);

var p = new ParseStream();
var called = 0
p.on('value', function(state) {
    called ++
    /*
      should be of form
      { value : currentValue
      , key   : currentKey
      , path  : path to current value
      , root  : 
      }
      if(root === value)
         key, parent are null and path = []
    */
    if(state.root === state.value) {
      assert.equal(state.key, null)
      assert.deepEqual(state.path, [])
    } else {
      console.error(state.path, state.value)
      console.error(state.stack)
      assert.equal(state.stack[state.stack.length - 1], state.value)
    }

});
p.on('end', function (o) {
    var res = JSON.stringify(o);
    assert.equal(res, json, "the objects are not identical");
    console.log('ignored', this._ignored);
    console.log('queue', this._queue);
    assert.equal(called, 13 )
})
p.end(json);
