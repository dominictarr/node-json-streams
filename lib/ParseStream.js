var Parser = require('parser');
var Tokenizer = require('./JsonTokenizer');
var sys = require('sys');
var assert = require('assert');


/**
 * The constuctor for Json parsing streams.
 * @inherits Parser
 */
function ParseStream (emitElements) {
    Parser.call(this, new Tokenizer());

    this._object;
    this._emitElements = emitElements
    this.state = {
      key: null,
      value: null,
      root: null,
      path: [],
      stack: []
    }
    this.pushState = function (key, value) {
      var state = this.state
      state.path.push(key)
      state.stack.push(value)
      state.key = key
      state.value = value
    }
    this.popState = function () {
      var state = this.state
      this.emit('value', state)
      state.path.pop()
      state.key = state.path[state.path.length - 1]
      state.stack.pop()
      state.value = state.stack[state.stack.length - 1]
    }
    var self = this;
    function initialSet (value) {
        self._object = value;
        self.state.root = self.state.value = value
        self.state.stack.push(value)
    }
      this.initialHandler(this.value(initialSet));
    // TODO set a default handler which is stricter than `ignore`
    this.defaultHandler(function(token, type, next) {
        if(type !== 'eof') {
            throw new SyntaxError("unexpected token "+token+". expected eof");
        }
    });
}
sys.inherits(ParseStream, Parser);

/**
 * Factory. Returns a handler able to parse any JSON value
 * @param set a function to be called when the value has to be set
 *          on its parent object or array.
 * @return a handler expanding to the correct handlers depending on the 
 *          token we get
 */
ParseStream.prototype.value = function(set) {
    var self = this
    return function value(token, type, next) {
      next(function () {
        self.popState()
        return true
      })
        switch(type) {
            case 'begin-object':
                next(this.object(set));
                break;
            case 'begin-array':
                next(this.array(set));
                break;
            case 'string':
            case 'boolean':
            case 'number':
            case 'null':
                next(this.native(set));
                break;
            default:
                throw new SyntaxError("unexpected token "+token);
                break;
        }
        return true;
    };
}

/**
 * Factory. Returns a handler able to parse any non-composed value
 *          (string, boolean, number, null)
 *  @param set the function to set the value on its parent
 *  @return a handler
 */
ParseStream.prototype.native = function Native(set) {
    return function Native(token, type, next) {
        switch(type) {
            case 'boolean':
                if(token[0] === 't') {
                    set(true);
                }
                else set(false);
                break;
            case 'null':
                set(null);
                break;
            case 'number':
                var int = (token.indexOf('.') === -1);
                set(int ? parseInt(token) : parseFloat(token));
                break;
            case 'string':
                set(JSON.parse(token));
                break;
            default:
                throw new SyntaxError("unexpected token "+token+". expecting native");
        }
    }
};

/**
 * Factory. Returns a handler able to parse an array
 * @param set a function to set this array on its parent
 * @return a handler expanding to the correct handlers
 */
ParseStream.prototype.array = function array(set) {
    var a = [];
    var arraySet
    if(!this._rootArray) {
      this._rootArray = a
    }
    set(a);
    var self = this
    function arraySet (value) {        
        
        var i = a.length
        a.push(value)
        self.pushState(i, value);
        //if(!value || 'object' != 

        if(a === self._rootArray && self._emitElements) {
          self.emit('data', value)
        }
    }
    return function array (token, type, next) {
        next(
            Parser.expect('begin-array'),
            Parser.list(
                'comma',                // array
                this.value(arraySet),   // values
                'end-array'             // token ending the list
            ),
            function endArray(token, type, next) {
              return true
            },

            Parser.expect('end-array')
        );
        return true; //expand this
    }
};

/**
 * Factory. Returns a handler able to parse a javascript object
 * @param set the function to set this object on its parent
 * @return a handler expanding to the correct handler to parse an object
 */
ParseStream.prototype.object = function object(set) {
    var o = {};
    set(o);
    var self = this
    function objectSet (label, value) {
        o[label] = value;
        self.pushState(label, value)
    }
    
    return function object (token, type, next) {
        next(
            Parser.expect('begin-object'),
            Parser.list(
                'comma',                        // separator
                this.labeledValue(objectSet),   // values
                'end-object'                    // token ending the list
            ),
            function endObject(token, type, next) {
              return true
            },
            Parser.expect('end-object')
        )
        return true;
    }
};

/**
 * Factory. returns a handler able to parse labeled value (as in JS objects)
 * @param objectSet the function to set the labeled value on the parent object
 * @return a handler expanding to the correct handlers to parse a labeled value
 */
ParseStream.prototype.labeledValue = function labeledValue(objectSet) {
    var label;
    /**
     * this handler reads the label and sets the closured var `label`
     */
    function readLabel (token, type, next) {
        assert.equal(type, 'string', "unexpected token "+token+". expected string");
        label = JSON.parse(token);
    }
    /**
     * this is the function that should be called when the value part has
     * to be set
     */
    var self = this
    function set (value) {
        objectSet(label, value);
    }

    /**
     * the actual handler
     */
    return function labeledValue (token, type, next) {
        next(
            readLabel,
            Parser.expect('end-label'),
            this.value(set),
            function () {
              return true
            }
        );
        return true;
    }
};

ParseStream.prototype._reachedEnd = function _reachedEnd() {
  if(!this._emitElements)
    this.emit('data', this._object);

    /**
     * end is not meant to emit, but it will do no harm, and pipe will still work.
     */
    this.emit('end', this._object);
  };

ParseStream.prototype.writable = true;

ParseStream.prototype.destroy = function destroy() {
    // do not emit anymore
};


module.exports = ParseStream;
