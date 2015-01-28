(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var RenderNode = require('./RenderNode');
var EventHandler = require('./EventHandler');
var ElementAllocator = require('./ElementAllocator');
var Transform = require('./Transform');
var Transitionable = require('../transitions/Transitionable');

var _originZeroZero = [0, 0];

function _getElementSize(element) {
    return [element.clientWidth, element.clientHeight];
}

/**
 * The top-level container for a Famous-renderable piece of the document.
 *   It is directly updated by the process-wide Engine object, and manages one
 *   render tree root, which can contain other renderables.
 *
 * @class Context
 * @constructor
 * @private
 * @param {Node} container Element in which content will be inserted
 */
function Context(container) {
    this.container = container;
    this._allocator = new ElementAllocator(container);

    this._node = new RenderNode();
    this._eventOutput = new EventHandler();
    this._size = _getElementSize(this.container);

    this._perspectiveState = new Transitionable(0);
    this._perspective = undefined;

    this._nodeContext = {
        allocator: this._allocator,
        transform: Transform.identity,
        opacity: 1,
        origin: _originZeroZero,
        align: null,
        size: this._size
    };

    this._eventOutput.on('resize', function() {
        this.setSize(_getElementSize(this.container));
    }.bind(this));

}

// Note: Unused
Context.prototype.getAllocator = function getAllocator() {
    return this._allocator;
};

/**
 * Add renderables to this Context's render tree.
 *
 * @method add
 *
 * @param {Object} obj renderable object
 * @return {RenderNode} RenderNode wrapping this object, if not already a RenderNode
 */
Context.prototype.add = function add(obj) {
    return this._node.add(obj);
};

/**
 * Move this Context to another containing document element.
 *
 * @method migrate
 *
 * @param {Node} container Element to which content will be migrated
 */
Context.prototype.migrate = function migrate(container) {
    if (container === this.container) return;
    this.container = container;
    this._allocator.migrate(container);
};

/**
 * Gets viewport size for Context.
 *
 * @method getSize
 *
 * @return {Array.Number} viewport size as [width, height]
 */
Context.prototype.getSize = function getSize() {
    return this._size;
};

/**
 * Sets viewport size for Context.
 *
 * @method setSize
 *
 * @param {Array.Number} size [width, height].  If unspecified, use size of root document element.
 */
Context.prototype.setSize = function setSize(size) {
    if (!size) size = _getElementSize(this.container);
    this._size[0] = size[0];
    this._size[1] = size[1];
};

/**
 * Commit this Context's content changes to the document.
 *
 * @private
 * @method update
 * @param {Object} contextParameters engine commit specification
 */
Context.prototype.update = function update(contextParameters) {
    if (contextParameters) {
        if (contextParameters.transform) this._nodeContext.transform = contextParameters.transform;
        if (contextParameters.opacity) this._nodeContext.opacity = contextParameters.opacity;
        if (contextParameters.origin) this._nodeContext.origin = contextParameters.origin;
        if (contextParameters.align) this._nodeContext.align = contextParameters.align;
        if (contextParameters.size) this._nodeContext.size = contextParameters.size;
    }
    var perspective = this._perspectiveState.get();
    if (perspective !== this._perspective) {
        this.container.style.perspective = perspective ? perspective.toFixed() + 'px' : '';
        this.container.style.webkitPerspective = perspective ? perspective.toFixed() : '';
        this._perspective = perspective;
    }

    this._node.commit(this._nodeContext);
};

/**
 * Get current perspective of this context in pixels.
 *
 * @method getPerspective
 * @return {Number} depth perspective in pixels
 */
Context.prototype.getPerspective = function getPerspective() {
    return this._perspectiveState.get();
};

/**
 * Set current perspective of this context in pixels.
 *
 * @method setPerspective
 * @param {Number} perspective in pixels
 * @param {Object} [transition] Transitionable object for applying the change
 * @param {function(Object)} callback function called on completion of transition
 */
Context.prototype.setPerspective = function setPerspective(perspective, transition, callback) {
    return this._perspectiveState.set(perspective, transition, callback);
};

/**
 * Trigger an event, sending to all downstream handlers
 *   listening for provided 'type' key.
 *
 * @method emit
 *
 * @param {string} type event type key (for example, 'click')
 * @param {Object} event event data
 * @return {EventHandler} this
 */
Context.prototype.emit = function emit(type, event) {
    return this._eventOutput.emit(type, event);
};

/**
 * Bind a callback function to an event type handled by this object.
 *
 * @method "on"
 *
 * @param {string} type event type key (for example, 'click')
 * @param {function(string, Object)} handler callback
 * @return {EventHandler} this
 */
Context.prototype.on = function on(type, handler) {
    return this._eventOutput.on(type, handler);
};

/**
 * Unbind an event by type and handler.
 *   This undoes the work of "on".
 *
 * @method removeListener
 *
 * @param {string} type event type key (for example, 'click')
 * @param {function} handler function object to remove
 * @return {EventHandler} internal event handler object (for chaining)
 */
Context.prototype.removeListener = function removeListener(type, handler) {
    return this._eventOutput.removeListener(type, handler);
};

/**
 * Add event handler object to set of downstream handlers.
 *
 * @method pipe
 *
 * @param {EventHandler} target event handler target object
 * @return {EventHandler} passed event handler
 */
Context.prototype.pipe = function pipe(target) {
    return this._eventOutput.pipe(target);
};

/**
 * Remove handler object from set of downstream handlers.
 *   Undoes work of "pipe".
 *
 * @method unpipe
 *
 * @param {EventHandler} target target handler object
 * @return {EventHandler} provided target
 */
Context.prototype.unpipe = function unpipe(target) {
    return this._eventOutput.unpipe(target);
};

module.exports = Context;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/core/Context.js","/../../node_modules/famous/core")
},{"../transitions/Transitionable":22,"./ElementAllocator":2,"./EventHandler":6,"./RenderNode":9,"./Transform":12,"buffer":26,"oMfpAn":29}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */




/**
 * Internal helper object to Context that handles the process of
 *   creating and allocating DOM elements within a managed div.
 *   Private.
 *
 * @class ElementAllocator
 * @constructor
 * @private
 * @param {Node} container document element in which Famo.us content will be inserted
 */
function ElementAllocator(container) {
    if (!container) container = document.createDocumentFragment();
    this.container = container;
    this.detachedNodes = {};
    this.nodeCount = 0;
}

/**
 * Move the document elements from their original container to a new one.
 *
 * @private
 * @method migrate
 *
 * @param {Node} container document element to which Famo.us content will be migrated
 */
ElementAllocator.prototype.migrate = function migrate(container) {
    var oldContainer = this.container;
    if (container === oldContainer) return;

    if (oldContainer instanceof DocumentFragment) {
        container.appendChild(oldContainer);
    }
    else {
        while (oldContainer.hasChildNodes()) {
            container.appendChild(oldContainer.removeChild(oldContainer.firstChild));
        }
    }

    this.container = container;
};

/**
 * Allocate an element of specified type from the pool.
 *
 * @private
 * @method allocate
 *
 * @param {string} type type of element, e.g. 'div'
 * @return {Node} allocated document element
 */
ElementAllocator.prototype.allocate = function allocate(type) {
    type = type.toLowerCase();
    if (!(type in this.detachedNodes)) this.detachedNodes[type] = [];
    var nodeStore = this.detachedNodes[type];
    var result;
    if (nodeStore.length > 0) {
        result = nodeStore.pop();
    }
    else {
        result = document.createElement(type);
        this.container.appendChild(result);
    }
    this.nodeCount++;
    return result;
};

/**
 * De-allocate an element of specified type to the pool.
 *
 * @private
 * @method deallocate
 *
 * @param {Node} element document element to deallocate
 */
ElementAllocator.prototype.deallocate = function deallocate(element) {
    var nodeType = element.nodeName.toLowerCase();
    var nodeStore = this.detachedNodes[nodeType];
    nodeStore.push(element);
    this.nodeCount--;
};

/**
 * Get count of total allocated nodes in the document.
 *
 * @private
 * @method getNodeCount
 *
 * @return {Number} total node count
 */
ElementAllocator.prototype.getNodeCount = function getNodeCount() {
    return this.nodeCount;
};

module.exports = ElementAllocator;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/core/ElementAllocator.js","/../../node_modules/famous/core")
},{"buffer":26,"oMfpAn":29}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

/**
 * The singleton object initiated upon process
 *   startup which manages all active Context instances, runs
 *   the render dispatch loop, and acts as a listener and dispatcher
 *   for events.  All methods are therefore static.
 *
 *   On static initialization, window.requestAnimationFrame is called with
 *     the event loop function.
 *
 *   Note: Any window in which Engine runs will prevent default
 *     scrolling behavior on the 'touchmove' event.
 *
 * @static
 * @class Engine
 */
var Context = require('./Context');
var EventHandler = require('./EventHandler');
var OptionsManager = require('./OptionsManager');

var Engine = {};

var contexts = [];
var nextTickQueue = [];
var deferQueue = [];

var lastTime = Date.now();
var frameTime;
var frameTimeLimit;
var loopEnabled = true;
var eventForwarders = {};
var eventHandler = new EventHandler();

var options = {
    containerType: 'div',
    containerClass: 'famous-container',
    fpsCap: undefined,
    runLoop: true
};
var optionsManager = new OptionsManager(options);

/** @const */
var MAX_DEFER_FRAME_TIME = 10;

/**
 * Inside requestAnimationFrame loop, step() is called, which:
 *   calculates current FPS (throttling loop if it is over limit set in setFPSCap),
 *   emits dataless 'prerender' event on start of loop,
 *   calls in order any one-shot functions registered by nextTick on last loop,
 *   calls Context.update on all Context objects registered,
 *   and emits dataless 'postrender' event on end of loop.
 *
 * @static
 * @private
 * @method step
 */
Engine.step = function step() {
    var currentTime = Date.now();

    // skip frame if we're over our framerate cap
    if (frameTimeLimit && currentTime - lastTime < frameTimeLimit) return;

    var i = 0;

    frameTime = currentTime - lastTime;
    lastTime = currentTime;

    eventHandler.emit('prerender');

    // empty the queue
    for (i = 0; i < nextTickQueue.length; i++) nextTickQueue[i].call(this);
    nextTickQueue.splice(0);

    // limit total execution time for deferrable functions
    while (deferQueue.length && (Date.now() - currentTime) < MAX_DEFER_FRAME_TIME) {
        deferQueue.shift().call(this);
    }

    for (i = 0; i < contexts.length; i++) contexts[i].update();

    eventHandler.emit('postrender');
};

// engage requestAnimationFrame
function loop() {
    if (options.runLoop) {
        Engine.step();
        window.requestAnimationFrame(loop);
    }
    else loopEnabled = false;
}
window.requestAnimationFrame(loop);

//
// Upon main document window resize (unless on an "input" HTML element):
//   scroll to the top left corner of the window,
//   and for each managed Context: emit the 'resize' event and update its size.
// @param {Object=} event document event
//
function handleResize(event) {
    for (var i = 0; i < contexts.length; i++) {
        contexts[i].emit('resize');
    }
    eventHandler.emit('resize');
}
window.addEventListener('resize', handleResize, false);
handleResize();

// prevent scrolling via browser
window.addEventListener('touchmove', function(event) {
    event.preventDefault();
}, true);

/**
 * Add event handler object to set of downstream handlers.
 *
 * @method pipe
 *
 * @param {EventHandler} target event handler target object
 * @return {EventHandler} passed event handler
 */
Engine.pipe = function pipe(target) {
    if (target.subscribe instanceof Function) return target.subscribe(Engine);
    else return eventHandler.pipe(target);
};

/**
 * Remove handler object from set of downstream handlers.
 *   Undoes work of "pipe".
 *
 * @method unpipe
 *
 * @param {EventHandler} target target handler object
 * @return {EventHandler} provided target
 */
Engine.unpipe = function unpipe(target) {
    if (target.unsubscribe instanceof Function) return target.unsubscribe(Engine);
    else return eventHandler.unpipe(target);
};

/**
 * Bind a callback function to an event type handled by this object.
 *
 * @static
 * @method "on"
 *
 * @param {string} type event type key (for example, 'click')
 * @param {function(string, Object)} handler callback
 * @return {EventHandler} this
 */
Engine.on = function on(type, handler) {
    if (!(type in eventForwarders)) {
        eventForwarders[type] = eventHandler.emit.bind(eventHandler, type);
        if (document.body) {
            document.body.addEventListener(type, eventForwarders[type]);
        }
        else {
            Engine.nextTick(function(type, forwarder) {
                document.body.addEventListener(type, forwarder);
            }.bind(this, type, eventForwarders[type]));
        }
    }
    return eventHandler.on(type, handler);
};

/**
 * Trigger an event, sending to all downstream handlers
 *   listening for provided 'type' key.
 *
 * @method emit
 *
 * @param {string} type event type key (for example, 'click')
 * @param {Object} event event data
 * @return {EventHandler} this
 */
Engine.emit = function emit(type, event) {
    return eventHandler.emit(type, event);
};

/**
 * Unbind an event by type and handler.
 *   This undoes the work of "on".
 *
 * @static
 * @method removeListener
 *
 * @param {string} type event type key (for example, 'click')
 * @param {function} handler function object to remove
 * @return {EventHandler} internal event handler object (for chaining)
 */
Engine.removeListener = function removeListener(type, handler) {
    return eventHandler.removeListener(type, handler);
};

/**
 * Return the current calculated frames per second of the Engine.
 *
 * @static
 * @method getFPS
 *
 * @return {Number} calculated fps
 */
Engine.getFPS = function getFPS() {
    return 1000 / frameTime;
};

/**
 * Set the maximum fps at which the system should run. If internal render
 *    loop is called at a greater frequency than this FPSCap, Engine will
 *    throttle render and update until this rate is achieved.
 *
 * @static
 * @method setFPSCap
 *
 * @param {Number} fps maximum frames per second
 */
Engine.setFPSCap = function setFPSCap(fps) {
    frameTimeLimit = Math.floor(1000 / fps);
};

/**
 * Return engine options.
 *
 * @static
 * @method getOptions
 * @param {string} key
 * @return {Object} engine options
 */
Engine.getOptions = function getOptions() {
    return optionsManager.getOptions.apply(optionsManager, arguments);
};

/**
 * Set engine options
 *
 * @static
 * @method setOptions
 *
 * @param {Object} [options] overrides of default options
 * @param {Number} [options.fpsCap]  maximum fps at which the system should run
 * @param {boolean} [options.runLoop=true] whether the run loop should continue
 * @param {string} [options.containerType="div"] type of container element.  Defaults to 'div'.
 * @param {string} [options.containerClass="famous-container"] type of container element.  Defaults to 'famous-container'.
 */
Engine.setOptions = function setOptions(options) {
    return optionsManager.setOptions.apply(optionsManager, arguments);
};

/**
 * Creates a new Context for rendering and event handling with
 *    provided document element as top of each tree. This will be tracked by the
 *    process-wide Engine.
 *
 * @static
 * @method createContext
 *
 * @param {Node} el will be top of Famo.us document element tree
 * @return {Context} new Context within el
 */
Engine.createContext = function createContext(el) {
    var needMountContainer = false;
    if (!el) {
        el = document.createElement(options.containerType);
        el.classList.add(options.containerClass);
        needMountContainer = true;
    }
    var context = new Context(el);
    Engine.registerContext(context);
    if (needMountContainer) {
        Engine.nextTick(function(context, el) {
            document.body.appendChild(el);
            context.emit('resize');
        }.bind(this, context, el));
    }
    return context;
};

/**
 * Registers an existing context to be updated within the run loop.
 *
 * @static
 * @method registerContext
 *
 * @param {Context} context Context to register
 * @return {FamousContext} provided context
 */
Engine.registerContext = function registerContext(context) {
    contexts.push(context);
    return context;
};

/**
 * Queue a function to be executed on the next tick of the
 *    Engine.
 *
 * @static
 * @method nextTick
 *
 * @param {function(Object)} fn function accepting window object
 */
Engine.nextTick = function nextTick(fn) {
    nextTickQueue.push(fn);
};

/**
 * Queue a function to be executed sometime soon, at a time that is
 *    unlikely to affect frame rate.
 *
 * @static
 * @method defer
 *
 * @param {Function} fn
 */
Engine.defer = function defer(fn) {
    deferQueue.push(fn);
};

optionsManager.on('change', function(data) {
    if (data.id === 'fpsCap') Engine.setFPSCap(data.value);
    else if (data.id === 'runLoop') {
        // kick off the loop only if it was stopped
        if (!loopEnabled && data.value) {
            loopEnabled = true;
            window.requestAnimationFrame(loop);
        }
    }
});

module.exports = Engine;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/core/Engine.js","/../../node_modules/famous/core")
},{"./Context":1,"./EventHandler":6,"./OptionsManager":8,"buffer":26,"oMfpAn":29}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */



/**
 * A singleton that maintains a global registry of Surfaces.
 *   Private.
 *
 * @private
 * @static
 * @class Entity
 */

var entities = [];

/**
 * Get entity from global index.
 *
 * @private
 * @method get
 * @param {Number} id entity reigstration id
 * @return {Surface} entity in the global index
 */
function get(id) {
    return entities[id];
}

/**
 * Overwrite entity in the global index
 *
 * @private
 * @method set
 * @param {Number} id entity reigstration id
 * @return {Surface} entity to add to the global index
 */
function set(id, entity) {
    entities[id] = entity;
}

/**
 * Add entity to global index
 *
 * @private
 * @method register
 * @param {Surface} entity to add to global index
 * @return {Number} new id
 */
function register(entity) {
    var id = entities.length;
    set(id, entity);
    return id;
}

/**
 * Remove entity from global index
 *
 * @private
 * @method unregister
 * @param {Number} id entity reigstration id
 */
function unregister(id) {
    set(id, null);
}

module.exports = {
    register: register,
    unregister: unregister,
    get: get,
    set: set
};
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/core/Entity.js","/../../node_modules/famous/core")
},{"buffer":26,"oMfpAn":29}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */



/**
 * EventEmitter represents a channel for events.
 *
 * @class EventEmitter
 * @constructor
 */
function EventEmitter() {
    this.listeners = {};
    this._owner = this;
}

/**
 * Trigger an event, sending to all downstream handlers
 *   listening for provided 'type' key.
 *
 * @method emit
 *
 * @param {string} type event type key (for example, 'click')
 * @param {Object} event event data
 * @return {EventHandler} this
 */
EventEmitter.prototype.emit = function emit(type, event) {
    var handlers = this.listeners[type];
    if (handlers) {
        for (var i = 0; i < handlers.length; i++) {
            handlers[i].call(this._owner, event);
        }
    }
    return this;
};

/**
 * Bind a callback function to an event type handled by this object.
 *
 * @method "on"
 *
 * @param {string} type event type key (for example, 'click')
 * @param {function(string, Object)} handler callback
 * @return {EventHandler} this
 */
   EventEmitter.prototype.on = function on(type, handler) {
    if (!(type in this.listeners)) this.listeners[type] = [];
    var index = this.listeners[type].indexOf(handler);
    if (index < 0) this.listeners[type].push(handler);
    return this;
};

/**
 * Alias for "on".
 * @method addListener
 */
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

   /**
 * Unbind an event by type and handler.
 *   This undoes the work of "on".
 *
 * @method removeListener
 *
 * @param {string} type event type key (for example, 'click')
 * @param {function} handler function object to remove
 * @return {EventEmitter} this
 */
EventEmitter.prototype.removeListener = function removeListener(type, handler) {
    var index = this.listeners[type].indexOf(handler);
    if (index >= 0) this.listeners[type].splice(index, 1);
    return this;
};

/**
 * Call event handlers with this set to owner.
 *
 * @method bindThis
 *
 * @param {Object} owner object this EventEmitter belongs to
 */
EventEmitter.prototype.bindThis = function bindThis(owner) {
    this._owner = owner;
};

module.exports = EventEmitter;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/core/EventEmitter.js","/../../node_modules/famous/core")
},{"buffer":26,"oMfpAn":29}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var EventEmitter = require('./EventEmitter');

/**
 * EventHandler forwards received events to a set of provided callback functions.
 * It allows events to be captured, processed, and optionally piped through to other event handlers.
 *
 * @class EventHandler
 * @extends EventEmitter
 * @constructor
 */
function EventHandler() {
    EventEmitter.apply(this, arguments);

    this.downstream = []; // downstream event handlers
    this.downstreamFn = []; // downstream functions

    this.upstream = []; // upstream event handlers
    this.upstreamListeners = {}; // upstream listeners
}
EventHandler.prototype = Object.create(EventEmitter.prototype);
EventHandler.prototype.constructor = EventHandler;

/**
 * Assign an event handler to receive an object's input events.
 *
 * @method setInputHandler
 * @static
 *
 * @param {Object} object object to mix trigger, subscribe, and unsubscribe functions into
 * @param {EventHandler} handler assigned event handler
 */
EventHandler.setInputHandler = function setInputHandler(object, handler) {
    object.trigger = handler.trigger.bind(handler);
    if (handler.subscribe && handler.unsubscribe) {
        object.subscribe = handler.subscribe.bind(handler);
        object.unsubscribe = handler.unsubscribe.bind(handler);
    }
};

/**
 * Assign an event handler to receive an object's output events.
 *
 * @method setOutputHandler
 * @static
 *
 * @param {Object} object object to mix pipe, unpipe, on, addListener, and removeListener functions into
 * @param {EventHandler} handler assigned event handler
 */
EventHandler.setOutputHandler = function setOutputHandler(object, handler) {
    if (handler instanceof EventHandler) handler.bindThis(object);
    object.pipe = handler.pipe.bind(handler);
    object.unpipe = handler.unpipe.bind(handler);
    object.on = handler.on.bind(handler);
    object.addListener = object.on;
    object.removeListener = handler.removeListener.bind(handler);
};

/**
 * Trigger an event, sending to all downstream handlers
 *   listening for provided 'type' key.
 *
 * @method emit
 *
 * @param {string} type event type key (for example, 'click')
 * @param {Object} event event data
 * @return {EventHandler} this
 */
EventHandler.prototype.emit = function emit(type, event) {
    EventEmitter.prototype.emit.apply(this, arguments);
    var i = 0;
    for (i = 0; i < this.downstream.length; i++) {
        if (this.downstream[i].trigger) this.downstream[i].trigger(type, event);
    }
    for (i = 0; i < this.downstreamFn.length; i++) {
        this.downstreamFn[i](type, event);
    }
    return this;
};

/**
 * Alias for emit
 * @method addListener
 */
EventHandler.prototype.trigger = EventHandler.prototype.emit;

/**
 * Add event handler object to set of downstream handlers.
 *
 * @method pipe
 *
 * @param {EventHandler} target event handler target object
 * @return {EventHandler} passed event handler
 */
EventHandler.prototype.pipe = function pipe(target) {
    if (target.subscribe instanceof Function) return target.subscribe(this);

    var downstreamCtx = (target instanceof Function) ? this.downstreamFn : this.downstream;
    var index = downstreamCtx.indexOf(target);
    if (index < 0) downstreamCtx.push(target);

    if (target instanceof Function) target('pipe', null);
    else if (target.trigger) target.trigger('pipe', null);

    return target;
};

/**
 * Remove handler object from set of downstream handlers.
 *   Undoes work of "pipe".
 *
 * @method unpipe
 *
 * @param {EventHandler} target target handler object
 * @return {EventHandler} provided target
 */
EventHandler.prototype.unpipe = function unpipe(target) {
    if (target.unsubscribe instanceof Function) return target.unsubscribe(this);

    var downstreamCtx = (target instanceof Function) ? this.downstreamFn : this.downstream;
    var index = downstreamCtx.indexOf(target);
    if (index >= 0) {
        downstreamCtx.splice(index, 1);
        if (target instanceof Function) target('unpipe', null);
        else if (target.trigger) target.trigger('unpipe', null);
        return target;
    }
    else return false;
};

/**
 * Bind a callback function to an event type handled by this object.
 *
 * @method "on"
 *
 * @param {string} type event type key (for example, 'click')
 * @param {function(string, Object)} handler callback
 * @return {EventHandler} this
 */
EventHandler.prototype.on = function on(type, handler) {
    EventEmitter.prototype.on.apply(this, arguments);
    if (!(type in this.upstreamListeners)) {
        var upstreamListener = this.trigger.bind(this, type);
        this.upstreamListeners[type] = upstreamListener;
        for (var i = 0; i < this.upstream.length; i++) {
            this.upstream[i].on(type, upstreamListener);
        }
    }
    return this;
};

/**
 * Alias for "on"
 * @method addListener
 */
EventHandler.prototype.addListener = EventHandler.prototype.on;

/**
 * Listen for events from an upstream event handler.
 *
 * @method subscribe
 *
 * @param {EventEmitter} source source emitter object
 * @return {EventHandler} this
 */
EventHandler.prototype.subscribe = function subscribe(source) {
    var index = this.upstream.indexOf(source);
    if (index < 0) {
        this.upstream.push(source);
        for (var type in this.upstreamListeners) {
            source.on(type, this.upstreamListeners[type]);
        }
    }
    return this;
};

/**
 * Stop listening to events from an upstream event handler.
 *
 * @method unsubscribe
 *
 * @param {EventEmitter} source source emitter object
 * @return {EventHandler} this
 */
EventHandler.prototype.unsubscribe = function unsubscribe(source) {
    var index = this.upstream.indexOf(source);
    if (index >= 0) {
        this.upstream.splice(index, 1);
        for (var type in this.upstreamListeners) {
            source.removeListener(type, this.upstreamListeners[type]);
        }
    }
    return this;
};

module.exports = EventHandler;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/core/EventHandler.js","/../../node_modules/famous/core")
},{"./EventEmitter":5,"buffer":26,"oMfpAn":29}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var Transform = require('./Transform');
var Transitionable = require('../transitions/Transitionable');
var TransitionableTransform = require('../transitions/TransitionableTransform');

/**
 *
 *  A collection of visual changes to be
 *    applied to another renderable component. This collection includes a
 *    transform matrix, an opacity constant, a size, an origin specifier.
 *    Modifier objects can be added to any RenderNode or object
 *    capable of displaying renderables.  The Modifier's children and descendants
 *    are transformed by the amounts specified in the Modifier's properties.
 *
 * @class Modifier
 * @constructor
 * @param {Object} [options] overrides of default options
 * @param {Transform} [options.transform] affine transformation matrix
 * @param {Number} [options.opacity]
 * @param {Array.Number} [options.origin] origin adjustment
 * @param {Array.Number} [options.size] size to apply to descendants
 */
function Modifier(options) {
    this._transformGetter = null;
    this._opacityGetter = null;
    this._originGetter = null;
    this._alignGetter = null;
    this._sizeGetter = null;

    /* TODO: remove this when deprecation complete */
    this._legacyStates = {};

    this._output = {
        transform: Transform.identity,
        opacity: 1,
        origin: null,
        align: null,
        size: null,
        target: null
    };

    if (options) {
        if (options.transform) this.transformFrom(options.transform);
        if (options.opacity !== undefined) this.opacityFrom(options.opacity);
        if (options.origin) this.originFrom(options.origin);
        if (options.align) this.alignFrom(options.align);
        if (options.size) this.sizeFrom(options.size);
    }
}

/**
 * Function, object, or static transform matrix which provides the transform.
 *   This is evaluated on every tick of the engine.
 *
 * @method transformFrom
 *
 * @param {Object} transform transform provider object
 * @return {Modifier} this
 */
Modifier.prototype.transformFrom = function transformFrom(transform) {
    if (transform instanceof Function) this._transformGetter = transform;
    else if (transform instanceof Object && transform.get) this._transformGetter = transform.get.bind(transform);
    else {
        this._transformGetter = null;
        this._output.transform = transform;
    }
    return this;
};

/**
 * Set function, object, or number to provide opacity, in range [0,1].
 *
 * @method opacityFrom
 *
 * @param {Object} opacity provider object
 * @return {Modifier} this
 */
Modifier.prototype.opacityFrom = function opacityFrom(opacity) {
    if (opacity instanceof Function) this._opacityGetter = opacity;
    else if (opacity instanceof Object && opacity.get) this._opacityGetter = opacity.get.bind(opacity);
    else {
        this._opacityGetter = null;
        this._output.opacity = opacity;
    }
    return this;
};

/**
 * Set function, object, or numerical array to provide origin, as [x,y],
 *   where x and y are in the range [0,1].
 *
 * @method originFrom
 *
 * @param {Object} origin provider object
 * @return {Modifier} this
 */
Modifier.prototype.originFrom = function originFrom(origin) {
    if (origin instanceof Function) this._originGetter = origin;
    else if (origin instanceof Object && origin.get) this._originGetter = origin.get.bind(origin);
    else {
        this._originGetter = null;
        this._output.origin = origin;
    }
    return this;
};

/**
 * Set function, object, or numerical array to provide align, as [x,y],
 *   where x and y are in the range [0,1].
 *
 * @method alignFrom
 *
 * @param {Object} align provider object
 * @return {Modifier} this
 */
Modifier.prototype.alignFrom = function alignFrom(align) {
    if (align instanceof Function) this._alignGetter = align;
    else if (align instanceof Object && align.get) this._alignGetter = align.get.bind(align);
    else {
        this._alignGetter = null;
        this._output.align = align;
    }
    return this;
};

/**
 * Set function, object, or numerical array to provide size, as [width, height].
 *
 * @method sizeFrom
 *
 * @param {Object} size provider object
 * @return {Modifier} this
 */
Modifier.prototype.sizeFrom = function sizeFrom(size) {
    if (size instanceof Function) this._sizeGetter = size;
    else if (size instanceof Object && size.get) this._sizeGetter = size.get.bind(size);
    else {
        this._sizeGetter = null;
        this._output.size = size;
    }
    return this;
};

 /**
 * Deprecated: Prefer transformFrom with static Transform, or use a TransitionableTransform.
 * @deprecated
 * @method setTransform
 *
 * @param {Transform} transform Transform to transition to
 * @param {Transitionable} transition Valid transitionable object
 * @param {Function} callback callback to call after transition completes
 * @return {Modifier} this
 */
Modifier.prototype.setTransform = function setTransform(transform, transition, callback) {
    if (transition || this._legacyStates.transform) {
        if (!this._legacyStates.transform) {
            this._legacyStates.transform = new TransitionableTransform(this._output.transform);
        }
        if (!this._transformGetter) this.transformFrom(this._legacyStates.transform);

        this._legacyStates.transform.set(transform, transition, callback);
        return this;
    }
    else return this.transformFrom(transform);
};

/**
 * Deprecated: Prefer opacityFrom with static opacity array, or use a Transitionable with that opacity.
 * @deprecated
 * @method setOpacity
 *
 * @param {Number} opacity Opacity value to transition to.
 * @param {Transitionable} transition Valid transitionable object
 * @param {Function} callback callback to call after transition completes
 * @return {Modifier} this
 */
Modifier.prototype.setOpacity = function setOpacity(opacity, transition, callback) {
    if (transition || this._legacyStates.opacity) {
        if (!this._legacyStates.opacity) {
            this._legacyStates.opacity = new Transitionable(this._output.opacity);
        }
        if (!this._opacityGetter) this.opacityFrom(this._legacyStates.opacity);

        return this._legacyStates.opacity.set(opacity, transition, callback);
    }
    else return this.opacityFrom(opacity);
};

/**
 * Deprecated: Prefer originFrom with static origin array, or use a Transitionable with that origin.
 * @deprecated
 * @method setOrigin
 *
 * @param {Array.Number} origin two element array with values between 0 and 1.
 * @param {Transitionable} transition Valid transitionable object
 * @param {Function} callback callback to call after transition completes
 * @return {Modifier} this
 */
Modifier.prototype.setOrigin = function setOrigin(origin, transition, callback) {
    /* TODO: remove this if statement when deprecation complete */
    if (transition || this._legacyStates.origin) {

        if (!this._legacyStates.origin) {
            this._legacyStates.origin = new Transitionable(this._output.origin || [0, 0]);
        }
        if (!this._originGetter) this.originFrom(this._legacyStates.origin);

        this._legacyStates.origin.set(origin, transition, callback);
        return this;
    }
    else return this.originFrom(origin);
};

/**
 * Deprecated: Prefer alignFrom with static align array, or use a Transitionable with that align.
 * @deprecated
 * @method setAlign
 *
 * @param {Array.Number} align two element array with values between 0 and 1.
 * @param {Transitionable} transition Valid transitionable object
 * @param {Function} callback callback to call after transition completes
 * @return {Modifier} this
 */
Modifier.prototype.setAlign = function setAlign(align, transition, callback) {
    /* TODO: remove this if statement when deprecation complete */
    if (transition || this._legacyStates.align) {

        if (!this._legacyStates.align) {
            this._legacyStates.align = new Transitionable(this._output.align || [0, 0]);
        }
        if (!this._alignGetter) this.alignFrom(this._legacyStates.align);

        this._legacyStates.align.set(align, transition, callback);
        return this;
    }
    else return this.alignFrom(align);
};

/**
 * Deprecated: Prefer sizeFrom with static origin array, or use a Transitionable with that size.
 * @deprecated
 * @method setSize
 * @param {Array.Number} size two element array of [width, height]
 * @param {Transitionable} transition Valid transitionable object
 * @param {Function} callback callback to call after transition completes
 * @return {Modifier} this
 */
Modifier.prototype.setSize = function setSize(size, transition, callback) {
    if (size && (transition || this._legacyStates.size)) {
        if (!this._legacyStates.size) {
            this._legacyStates.size = new Transitionable(this._output.size || [0, 0]);
        }
        if (!this._sizeGetter) this.sizeFrom(this._legacyStates.size);

        this._legacyStates.size.set(size, transition, callback);
        return this;
    }
    else return this.sizeFrom(size);
};

/**
 * Deprecated: Prefer to stop transform in your provider object.
 * @deprecated
 * @method halt
 */
Modifier.prototype.halt = function halt() {
    if (this._legacyStates.transform) this._legacyStates.transform.halt();
    if (this._legacyStates.opacity) this._legacyStates.opacity.halt();
    if (this._legacyStates.origin) this._legacyStates.origin.halt();
    if (this._legacyStates.align) this._legacyStates.align.halt();
    if (this._legacyStates.size) this._legacyStates.size.halt();
    this._transformGetter = null;
    this._opacityGetter = null;
    this._originGetter = null;
    this._alignGetter = null;
    this._sizeGetter = null;
};

/**
 * Deprecated: Prefer to use your provided transform or output of your transform provider.
 * @deprecated
 * @method getTransform
 * @return {Object} transform provider object
 */
Modifier.prototype.getTransform = function getTransform() {
    return this._transformGetter();
};

/**
 * Deprecated: Prefer to determine the end state of your transform from your transform provider
 * @deprecated
 * @method getFinalTransform
 * @return {Transform} transform matrix
 */
Modifier.prototype.getFinalTransform = function getFinalTransform() {
    return this._legacyStates.transform ? this._legacyStates.transform.getFinal() : this._output.transform;
};

/**
 * Deprecated: Prefer to use your provided opacity or output of your opacity provider.
 * @deprecated
 * @method getOpacity
 * @return {Object} opacity provider object
 */
Modifier.prototype.getOpacity = function getOpacity() {
    return this._opacityGetter();
};

/**
 * Deprecated: Prefer to use your provided origin or output of your origin provider.
 * @deprecated
 * @method getOrigin
 * @return {Object} origin provider object
 */
Modifier.prototype.getOrigin = function getOrigin() {
    return this._originGetter();
};

/**
 * Deprecated: Prefer to use your provided align or output of your align provider.
 * @deprecated
 * @method getAlign
 * @return {Object} align provider object
 */
Modifier.prototype.getAlign = function getAlign() {
    return this._alignGetter();
};

/**
 * Deprecated: Prefer to use your provided size or output of your size provider.
 * @deprecated
 * @method getSize
 * @return {Object} size provider object
 */
Modifier.prototype.getSize = function getSize() {
    return this._sizeGetter ? this._sizeGetter() : this._output.size;
};

// call providers on tick to receive render spec elements to apply
function _update() {
    if (this._transformGetter) this._output.transform = this._transformGetter();
    if (this._opacityGetter) this._output.opacity = this._opacityGetter();
    if (this._originGetter) this._output.origin = this._originGetter();
    if (this._alignGetter) this._output.align = this._alignGetter();
    if (this._sizeGetter) this._output.size = this._sizeGetter();
}

/**
 * Return render spec for this Modifier, applying to the provided
 *    target component.  This is similar to render() for Surfaces.
 *
 * @private
 * @method modify
 *
 * @param {Object} target (already rendered) render spec to
 *    which to apply the transform.
 * @return {Object} render spec for this Modifier, including the
 *    provided target
 */
Modifier.prototype.modify = function modify(target) {
    _update.call(this);
    this._output.target = target;
    return this._output;
};

module.exports = Modifier;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/core/Modifier.js","/../../node_modules/famous/core")
},{"../transitions/Transitionable":22,"../transitions/TransitionableTransform":23,"./Transform":12,"buffer":26,"oMfpAn":29}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var EventHandler = require('./EventHandler');

/**
 *  A collection of methods for setting options which can be extended
 *  onto other classes.
 *
 *
 *  **** WARNING ****
 *  You can only pass through objects that will compile into valid JSON.
 *
 *  Valid options:
 *      Strings,
 *      Arrays,
 *      Objects,
 *      Numbers,
 *      Nested Objects,
 *      Nested Arrays.
 *
 *    This excludes:
 *        Document Fragments,
 *        Functions
 * @class OptionsManager
 * @constructor
 * @param {Object} value options dictionary
 */
function OptionsManager(value) {
    this._value = value;
    this.eventOutput = null;
}

/**
 * Create options manager from source dictionary with arguments overriden by patch dictionary.
 *
 * @static
 * @method OptionsManager.patch
 *
 * @param {Object} source source arguments
 * @param {...Object} data argument additions and overwrites
 * @return {Object} source object
 */
OptionsManager.patch = function patchObject(source, data) {
    var manager = new OptionsManager(source);
    for (var i = 1; i < arguments.length; i++) manager.patch(arguments[i]);
    return source;
};

function _createEventOutput() {
    this.eventOutput = new EventHandler();
    this.eventOutput.bindThis(this);
    EventHandler.setOutputHandler(this, this.eventOutput);
}

/**
 * Create OptionsManager from source with arguments overriden by patches.
 *   Triggers 'change' event on this object's event handler if the state of
 *   the OptionsManager changes as a result.
 *
 * @method patch
 *
 * @param {...Object} arguments list of patch objects
 * @return {OptionsManager} this
 */
OptionsManager.prototype.patch = function patch() {
    var myState = this._value;
    for (var i = 0; i < arguments.length; i++) {
        var data = arguments[i];
        for (var k in data) {
            if ((k in myState) && (data[k] && data[k].constructor === Object) && (myState[k] && myState[k].constructor === Object)) {
                if (!myState.hasOwnProperty(k)) myState[k] = Object.create(myState[k]);
                this.key(k).patch(data[k]);
                if (this.eventOutput) this.eventOutput.emit('change', {id: k, value: this.key(k).value()});
            }
            else this.set(k, data[k]);
        }
    }
    return this;
};

/**
 * Alias for patch
 *
 * @method setOptions
 *
 */
OptionsManager.prototype.setOptions = OptionsManager.prototype.patch;

/**
 * Return OptionsManager based on sub-object retrieved by key
 *
 * @method key
 *
 * @param {string} identifier key
 * @return {OptionsManager} new options manager with the value
 */
OptionsManager.prototype.key = function key(identifier) {
    var result = new OptionsManager(this._value[identifier]);
    if (!(result._value instanceof Object) || result._value instanceof Array) result._value = {};
    return result;
};

/**
 * Look up value by key
 * @method get
 *
 * @param {string} key key
 * @return {Object} associated object
 */
OptionsManager.prototype.get = function get(key) {
    return this._value[key];
};

/**
 * Alias for get
 * @method getOptions
 */
OptionsManager.prototype.getOptions = OptionsManager.prototype.get;

/**
 * Set key to value.  Outputs 'change' event if a value is overwritten.
 *
 * @method set
 *
 * @param {string} key key string
 * @param {Object} value value object
 * @return {OptionsManager} new options manager based on the value object
 */
OptionsManager.prototype.set = function set(key, value) {
    var originalValue = this.get(key);
    this._value[key] = value;
    if (this.eventOutput && value !== originalValue) this.eventOutput.emit('change', {id: key, value: value});
    return this;
};

/**
 * Return entire object contents of this OptionsManager.
 *
 * @method value
 *
 * @return {Object} current state of options
 */
OptionsManager.prototype.value = function value() {
    return this._value;
};

/**
 * Bind a callback function to an event type handled by this object.
 *
 * @method "on"
 *
 * @param {string} type event type key (for example, 'change')
 * @param {function(string, Object)} handler callback
 * @return {EventHandler} this
 */
OptionsManager.prototype.on = function on() {
    _createEventOutput.call(this);
    return this.on.apply(this, arguments);
};

/**
 * Unbind an event by type and handler.
 *   This undoes the work of "on".
 *
 * @method removeListener
 *
 * @param {string} type event type key (for example, 'change')
 * @param {function} handler function object to remove
 * @return {EventHandler} internal event handler object (for chaining)
 */
OptionsManager.prototype.removeListener = function removeListener() {
    _createEventOutput.call(this);
    return this.removeListener.apply(this, arguments);
};

/**
 * Add event handler object to set of downstream handlers.
 *
 * @method pipe
 *
 * @param {EventHandler} target event handler target object
 * @return {EventHandler} passed event handler
 */
OptionsManager.prototype.pipe = function pipe() {
    _createEventOutput.call(this);
    return this.pipe.apply(this, arguments);
};

/**
 * Remove handler object from set of downstream handlers.
 * Undoes work of "pipe"
 *
 * @method unpipe
 *
 * @param {EventHandler} target target handler object
 * @return {EventHandler} provided target
 */
OptionsManager.prototype.unpipe = function unpipe() {
    _createEventOutput.call(this);
    return this.unpipe.apply(this, arguments);
};

module.exports = OptionsManager;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/core/OptionsManager.js","/../../node_modules/famous/core")
},{"./EventHandler":6,"buffer":26,"oMfpAn":29}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var Entity = require('./Entity');
var SpecParser = require('./SpecParser');

/**
 * A wrapper for inserting a renderable component (like a Modifer or
 *   Surface) into the render tree.
 *
 * @class RenderNode
 * @constructor
 *
 * @param {Object} object Target renderable component
 */
function RenderNode(object) {
    this._object = null;
    this._child = null;
    this._hasMultipleChildren = false;
    this._isRenderable = false;
    this._isModifier = false;

    this._resultCache = {};
    this._prevResults = {};

    this._childResult = null;

    if (object) this.set(object);
}

/**
 * Append a renderable to the list of this node's children.
 *   This produces a new RenderNode in the tree.
 *   Note: Does not double-wrap if child is a RenderNode already.
 *
 * @method add
 * @param {Object} child renderable object
 * @return {RenderNode} new render node wrapping child
 */
RenderNode.prototype.add = function add(child) {
    var childNode = (child instanceof RenderNode) ? child : new RenderNode(child);
    if (this._child instanceof Array) this._child.push(childNode);
    else if (this._child) {
        this._child = [this._child, childNode];
        this._hasMultipleChildren = true;
        this._childResult = []; // to be used later
    }
    else this._child = childNode;

    return childNode;
};

/**
 * Return the single wrapped object.  Returns null if this node has multiple child nodes.
 *
 * @method get
 *
 * @return {Ojbect} contained renderable object
 */
RenderNode.prototype.get = function get() {
    return this._object || (this._hasMultipleChildren ? null : (this._child ? this._child.get() : null));
};

/**
 * Overwrite the list of children to contain the single provided object
 *
 * @method set
 * @param {Object} child renderable object
 * @return {RenderNode} this render node, or child if it is a RenderNode
 */
RenderNode.prototype.set = function set(child) {
    this._childResult = null;
    this._hasMultipleChildren = false;
    this._isRenderable = child.render ? true : false;
    this._isModifier = child.modify ? true : false;
    this._object = child;
    this._child = null;
    if (child instanceof RenderNode) return child;
    else return this;
};

/**
 * Get render size of contained object.
 *
 * @method getSize
 * @return {Array.Number} size of this or size of single child.
 */
RenderNode.prototype.getSize = function getSize() {
    var result = null;
    var target = this.get();
    if (target && target.getSize) result = target.getSize();
    if (!result && this._child && this._child.getSize) result = this._child.getSize();
    return result;
};

// apply results of rendering this subtree to the document
function _applyCommit(spec, context, cacheStorage) {
    var result = SpecParser.parse(spec, context);
    var keys = Object.keys(result);
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var childNode = Entity.get(id);
        var commitParams = result[id];
        commitParams.allocator = context.allocator;
        var commitResult = childNode.commit(commitParams);
        if (commitResult) _applyCommit(commitResult, context, cacheStorage);
        else cacheStorage[id] = commitParams;
    }
}

/**
 * Commit the content change from this node to the document.
 *
 * @private
 * @method commit
 * @param {Context} context render context
 */
RenderNode.prototype.commit = function commit(context) {
    // free up some divs from the last loop
    var prevKeys = Object.keys(this._prevResults);
    for (var i = 0; i < prevKeys.length; i++) {
        var id = prevKeys[i];
        if (this._resultCache[id] === undefined) {
            var object = Entity.get(id);
            if (object.cleanup) object.cleanup(context.allocator);
        }
    }

    this._prevResults = this._resultCache;
    this._resultCache = {};
    _applyCommit(this.render(), context, this._resultCache);
};

/**
 * Generate a render spec from the contents of the wrapped component.
 *
 * @private
 * @method render
 *
 * @return {Object} render specification for the component subtree
 *    only under this node.
 */
RenderNode.prototype.render = function render() {
    if (this._isRenderable) return this._object.render();

    var result = null;
    if (this._hasMultipleChildren) {
        result = this._childResult;
        var children = this._child;
        for (var i = 0; i < children.length; i++) {
            result[i] = children[i].render();
        }
    }
    else if (this._child) result = this._child.render();

    return this._isModifier ? this._object.modify(result) : result;
};

module.exports = RenderNode;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/core/RenderNode.js","/../../node_modules/famous/core")
},{"./Entity":4,"./SpecParser":10,"buffer":26,"oMfpAn":29}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var Transform = require('./Transform');

/**
 *
 * This object translates the rendering instructions ("render specs")
 *   that renderable components generate into document update
 *   instructions ("update specs").  Private.
 *
 * @private
 * @class SpecParser
 * @constructor
 */
function SpecParser() {
    this.result = {};
}
SpecParser._instance = new SpecParser();

/**
 * Convert a render spec coming from the context's render chain to an
 *    update spec for the update chain. This is the only major entry point
 *    for a consumer of this class.
 *
 * @method parse
 * @static
 * @private
 *
 * @param {renderSpec} spec input render spec
 * @param {Object} context context to do the parse in
 * @return {Object} the resulting update spec (if no callback
 *   specified, else none)
 */
SpecParser.parse = function parse(spec, context) {
    return SpecParser._instance.parse(spec, context);
};

/**
 * Convert a renderSpec coming from the context's render chain to an update
 *    spec for the update chain. This is the only major entrypoint for a
 *    consumer of this class.
 *
 * @method parse
 *
 * @private
 * @param {renderSpec} spec input render spec
 * @param {Context} context
 * @return {updateSpec} the resulting update spec
 */
SpecParser.prototype.parse = function parse(spec, context) {
    this.reset();
    this._parseSpec(spec, context, Transform.identity);
    return this.result;
};

/**
 * Prepare SpecParser for re-use (or first use) by setting internal state
 *  to blank.
 *
 * @private
 * @method reset
 */
SpecParser.prototype.reset = function reset() {
    this.result = {};
};

// Multiply matrix M by vector v
function _vecInContext(v, m) {
    return [
        v[0] * m[0] + v[1] * m[4] + v[2] * m[8],
        v[0] * m[1] + v[1] * m[5] + v[2] * m[9],
        v[0] * m[2] + v[1] * m[6] + v[2] * m[10]
    ];
}

var _originZeroZero = [0, 0];

// From the provided renderSpec tree, recursively compose opacities,
//    origins, transforms, and sizes corresponding to each surface id from
//    the provided renderSpec tree structure. On completion, those
//    properties of 'this' object should be ready to use to build an
//    updateSpec.
SpecParser.prototype._parseSpec = function _parseSpec(spec, parentContext, sizeContext) {
    var id;
    var target;
    var transform;
    var opacity;
    var origin;
    var align;
    var size;

    if (typeof spec === 'number') {
        id = spec;
        transform = parentContext.transform;
        align = parentContext.align || parentContext.origin;
        if (parentContext.size && align && (align[0] || align[1])) {
            var alignAdjust = [align[0] * parentContext.size[0], align[1] * parentContext.size[1], 0];
            transform = Transform.thenMove(transform, _vecInContext(alignAdjust, sizeContext));
        }
        this.result[id] = {
            transform: transform,
            opacity: parentContext.opacity,
            origin: parentContext.origin || _originZeroZero,
            align: parentContext.align || parentContext.origin || _originZeroZero,
            size: parentContext.size
        };
    }
    else if (!spec) { // placed here so 0 will be cached earlier
        return;
    }
    else if (spec instanceof Array) {
        for (var i = 0; i < spec.length; i++) {
            this._parseSpec(spec[i], parentContext, sizeContext);
        }
    }
    else {
        target = spec.target;
        transform = parentContext.transform;
        opacity = parentContext.opacity;
        origin = parentContext.origin;
        align = parentContext.align;
        size = parentContext.size;
        var nextSizeContext = sizeContext;

        if (spec.opacity !== undefined) opacity = parentContext.opacity * spec.opacity;
        if (spec.transform) transform = Transform.multiply(parentContext.transform, spec.transform);
        if (spec.origin) {
            origin = spec.origin;
            nextSizeContext = parentContext.transform;
        }
        if (spec.align) align = spec.align;
        if (spec.size) {
            var parentSize = parentContext.size;
            size = [
                spec.size[0] !== undefined ? spec.size[0] : parentSize[0],
                spec.size[1] !== undefined ? spec.size[1] : parentSize[1]
            ];
            if (parentSize) {
                if (!align) align = origin;
                if (align && (align[0] || align[1])) transform = Transform.thenMove(transform, _vecInContext([align[0] * parentSize[0], align[1] * parentSize[1], 0], sizeContext));
                if (origin && (origin[0] || origin[1])) transform = Transform.moveThen([-origin[0] * size[0], -origin[1] * size[1], 0], transform);
            }
            nextSizeContext = parentContext.transform;
            origin = null;
            align = null;
        }

        this._parseSpec(target, {
            transform: transform,
            opacity: opacity,
            origin: origin,
            align: align,
            size: size
        }, nextSizeContext);
    }
};

module.exports = SpecParser;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/core/SpecParser.js","/../../node_modules/famous/core")
},{"./Transform":12,"buffer":26,"oMfpAn":29}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var Entity = require('./Entity');
var EventHandler = require('./EventHandler');
var Transform = require('./Transform');

var devicePixelRatio = window.devicePixelRatio || 1;
var usePrefix = document.createElement('div').style.webkitTransform !== undefined;

/**
 * A base class for viewable content and event
 *   targets inside a Famo.us application, containing a renderable document
 *   fragment. Like an HTML div, it can accept internal markup,
 *   properties, classes, and handle events.
 *
 * @class Surface
 * @constructor
 *
 * @param {Object} [options] default option overrides
 * @param {Array.Number} [options.size] [width, height] in pixels
 * @param {Array.string} [options.classes] CSS classes to set on inner content
 * @param {Array} [options.properties] string dictionary of HTML attributes to set on target div
 * @param {string} [options.content] inner (HTML) content of surface
 */
function Surface(options) {
    this.options = {};

    this.properties = {};
    this.content = '';
    this.classList = [];
    this.size = null;

    this._classesDirty = true;
    this._stylesDirty = true;
    this._sizeDirty = true;
    this._contentDirty = true;

    this._dirtyClasses = [];

    this._matrix = null;
    this._opacity = 1;
    this._origin = null;
    this._size = null;

    /** @ignore */
    this.eventForwarder = function eventForwarder(event) {
        this.emit(event.type, event);
    }.bind(this);
    this.eventHandler = new EventHandler();
    this.eventHandler.bindThis(this);

    this.id = Entity.register(this);

    if (options) this.setOptions(options);

    this._currTarget = null;
}
Surface.prototype.elementType = 'div';
Surface.prototype.elementClass = 'famous-surface';

/**
 * Bind a callback function to an event type handled by this object.
 *
 * @method "on"
 *
 * @param {string} type event type key (for example, 'click')
 * @param {function(string, Object)} fn handler callback
 * @return {EventHandler} this
 */
Surface.prototype.on = function on(type, fn) {
    if (this._currTarget) this._currTarget.addEventListener(type, this.eventForwarder);
    this.eventHandler.on(type, fn);
};

/**
 * Unbind an event by type and handler.
 *   This undoes the work of "on"
 *
 * @method removeListener
 * @param {string} type event type key (for example, 'click')
 * @param {function(string, Object)} fn handler
 */
Surface.prototype.removeListener = function removeListener(type, fn) {
    this.eventHandler.removeListener(type, fn);
};

/**
 * Trigger an event, sending to all downstream handlers
 *   listening for provided 'type' key.
 *
 * @method emit
 *
 * @param {string} type event type key (for example, 'click')
 * @param {Object} [event] event data
 * @return {EventHandler} this
 */
Surface.prototype.emit = function emit(type, event) {
    if (event && !event.origin) event.origin = this;
    var handled = this.eventHandler.emit(type, event);
    if (handled && event && event.stopPropagation) event.stopPropagation();
    return handled;
};

/**
 * Add event handler object to set of downstream handlers.
 *
 * @method pipe
 *
 * @param {EventHandler} target event handler target object
 * @return {EventHandler} passed event handler
 */
Surface.prototype.pipe = function pipe(target) {
    return this.eventHandler.pipe(target);
};

/**
 * Remove handler object from set of downstream handlers.
 *   Undoes work of "pipe"
 *
 * @method unpipe
 *
 * @param {EventHandler} target target handler object
 * @return {EventHandler} provided target
 */
Surface.prototype.unpipe = function unpipe(target) {
    return this.eventHandler.unpipe(target);
};

/**
 * Return spec for this surface. Note that for a base surface, this is
 *    simply an id.
 *
 * @method render
 * @private
 * @return {Object} render spec for this surface (spec id)
 */
Surface.prototype.render = function render() {
    return this.id;
};

/**
 * Set CSS-style properties on this Surface. Note that this will cause
 *    dirtying and thus re-rendering, even if values do not change.
 *
 * @method setProperties
 * @param {Object} properties property dictionary of "key" => "value"
 */
Surface.prototype.setProperties = function setProperties(properties) {
    for (var n in properties) {
        this.properties[n] = properties[n];
    }
    this._stylesDirty = true;
};

/**
 * Get CSS-style properties on this Surface.
 *
 * @method getProperties
 *
 * @return {Object} Dictionary of this Surface's properties.
 */
Surface.prototype.getProperties = function getProperties() {
    return this.properties;
};

/**
 * Add CSS-style class to the list of classes on this Surface. Note
 *   this will map directly to the HTML property of the actual
 *   corresponding rendered <div>.
 *
 * @method addClass
 * @param {string} className name of class to add
 */
Surface.prototype.addClass = function addClass(className) {
    if (this.classList.indexOf(className) < 0) {
        this.classList.push(className);
        this._classesDirty = true;
    }
};

/**
 * Remove CSS-style class from the list of classes on this Surface.
 *   Note this will map directly to the HTML property of the actual
 *   corresponding rendered <div>.
 *
 * @method removeClass
 * @param {string} className name of class to remove
 */
Surface.prototype.removeClass = function removeClass(className) {
    var i = this.classList.indexOf(className);
    if (i >= 0) {
        this._dirtyClasses.push(this.classList.splice(i, 1)[0]);
        this._classesDirty = true;
    }
};

/**
 * Reset class list to provided dictionary.
 * @method setClasses
 * @param {Array.string} classList
 */
Surface.prototype.setClasses = function setClasses(classList) {
    var i = 0;
    var removal = [];
    for (i = 0; i < this.classList.length; i++) {
        if (classList.indexOf(this.classList[i]) < 0) removal.push(this.classList[i]);
    }
    for (i = 0; i < removal.length; i++) this.removeClass(removal[i]);
    // duplicates are already checked by addClass()
    for (i = 0; i < classList.length; i++) this.addClass(classList[i]);
};

/**
 * Get array of CSS-style classes attached to this div.
 *
 * @method getClasslist
 * @return {Array.string} array of class names
 */
Surface.prototype.getClassList = function getClassList() {
    return this.classList;
};

/**
 * Set or overwrite inner (HTML) content of this surface. Note that this
 *    causes a re-rendering if the content has changed.
 *
 * @method setContent
 * @param {string|Document Fragment} content HTML content
 */
Surface.prototype.setContent = function setContent(content) {
    if (this.content !== content) {
        this.content = content;
        this._contentDirty = true;
    }
};

/**
 * Return inner (HTML) content of this surface.
 *
 * @method getContent
 *
 * @return {string} inner (HTML) content
 */
Surface.prototype.getContent = function getContent() {
    return this.content;
};

/**
 * Set options for this surface
 *
 * @method setOptions
 * @param {Object} [options] overrides for default options.  See constructor.
 */
Surface.prototype.setOptions = function setOptions(options) {
    if (options.size) this.setSize(options.size);
    if (options.classes) this.setClasses(options.classes);
    if (options.properties) this.setProperties(options.properties);
    if (options.content) this.setContent(options.content);
};

//  Attach Famous event handling to document events emanating from target
//    document element.  This occurs just after deployment to the document.
//    Calling this enables methods like #on and #pipe.
function _addEventListeners(target) {
    for (var i in this.eventHandler.listeners) {
        target.addEventListener(i, this.eventForwarder);
    }
}

//  Detach Famous event handling from document events emanating from target
//  document element.  This occurs just before recall from the document.
function _removeEventListeners(target) {
    for (var i in this.eventHandler.listeners) {
        target.removeEventListener(i, this.eventForwarder);
    }
}

 //  Apply to document all changes from removeClass() since last setup().
function _cleanupClasses(target) {
    for (var i = 0; i < this._dirtyClasses.length; i++) target.classList.remove(this._dirtyClasses[i]);
    this._dirtyClasses = [];
}

// Apply values of all Famous-managed styles to the document element.
//  These will be deployed to the document on call to #setup().
function _applyStyles(target) {
    for (var n in this.properties) {
        target.style[n] = this.properties[n];
    }
}

// Clear all Famous-managed styles from the document element.
// These will be deployed to the document on call to #setup().
function _cleanupStyles(target) {
    for (var n in this.properties) {
        target.style[n] = '';
    }
}

/**
 * Return a Matrix's webkit css representation to be used with the
 *    CSS3 -webkit-transform style.
 *    Example: -webkit-transform: matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,716,243,0,1)
 *
 * @method _formatCSSTransform
 * @private
 * @param {FamousMatrix} m matrix
 * @return {string} matrix3d CSS style representation of the transform
 */
function _formatCSSTransform(m) {
    m[12] = Math.round(m[12] * devicePixelRatio) / devicePixelRatio;
    m[13] = Math.round(m[13] * devicePixelRatio) / devicePixelRatio;

    var result = 'matrix3d(';
    for (var i = 0; i < 15; i++) {
        result += (m[i] < 0.000001 && m[i] > -0.000001) ? '0,' : m[i] + ',';
    }
    result += m[15] + ')';
    return result;
}

/**
 * Directly apply given FamousMatrix to the document element as the
 *   appropriate webkit CSS style.
 *
 * @method setMatrix
 *
 * @static
 * @private
 * @param {Element} element document element
 * @param {FamousMatrix} matrix
 */

var _setMatrix;
if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
    _setMatrix = function(element, matrix) {
        element.style.zIndex = (matrix[14] * 1000000) | 0;    // fix for Firefox z-buffer issues
        element.style.transform = _formatCSSTransform(matrix);
    };
}
else if (usePrefix) {
    _setMatrix = function(element, matrix) {
        element.style.webkitTransform = _formatCSSTransform(matrix);
    };
}
else {
    _setMatrix = function(element, matrix) {
        element.style.transform = _formatCSSTransform(matrix);
    };
}

// format origin as CSS percentage string
function _formatCSSOrigin(origin) {
    return (100 * origin[0]) + '% ' + (100 * origin[1]) + '%';
}

 // Directly apply given origin coordinates to the document element as the
 // appropriate webkit CSS style.
var _setOrigin = usePrefix ? function(element, origin) {
    element.style.webkitTransformOrigin = _formatCSSOrigin(origin);
} : function(element, origin) {
    element.style.transformOrigin = _formatCSSOrigin(origin);
};

 // Shrink given document element until it is effectively invisible.
var _setInvisible = usePrefix ? function(element) {
    element.style.webkitTransform = 'scale3d(0.0001,0.0001,1)';
    element.style.opacity = 0;
} : function(element) {
    element.style.transform = 'scale3d(0.0001,0.0001,1)';
    element.style.opacity = 0;
};

function _xyNotEquals(a, b) {
    return (a && b) ? (a[0] !== b[0] || a[1] !== b[1]) : a !== b;
}

/**
 * One-time setup for an element to be ready for commits to document.
 *
 * @private
 * @method setup
 *
 * @param {ElementAllocator} allocator document element pool for this context
 */
Surface.prototype.setup = function setup(allocator) {
    var target = allocator.allocate(this.elementType);
    if (this.elementClass) {
        if (this.elementClass instanceof Array) {
            for (var i = 0; i < this.elementClass.length; i++) {
                target.classList.add(this.elementClass[i]);
            }
        }
        else {
            target.classList.add(this.elementClass);
        }
    }
    target.style.display = '';
    _addEventListeners.call(this, target);
    this._currTarget = target;
    this._stylesDirty = true;
    this._classesDirty = true;
    this._sizeDirty = true;
    this._contentDirty = true;
    this._matrix = null;
    this._opacity = undefined;
    this._origin = null;
    this._size = null;
};

/**
 * Apply changes from this component to the corresponding document element.
 * This includes changes to classes, styles, size, content, opacity, origin,
 * and matrix transforms.
 *
 * @private
 * @method commit
 * @param {Context} context commit context
 */
Surface.prototype.commit = function commit(context) {
    if (!this._currTarget) this.setup(context.allocator);
    var target = this._currTarget;

    var matrix = context.transform;
    var opacity = context.opacity;
    var origin = context.origin;
    var size = context.size;

    if (this._classesDirty) {
        _cleanupClasses.call(this, target);
        var classList = this.getClassList();
        for (var i = 0; i < classList.length; i++) target.classList.add(classList[i]);
        this._classesDirty = false;
    }

    if (this._stylesDirty) {
        _applyStyles.call(this, target);
        this._stylesDirty = false;
    }

    if (this._contentDirty) {
        this.deploy(target);
        this.eventHandler.emit('deploy');
        this._contentDirty = false;
    }

    if (this.size) {
        var origSize = size;
        size = [this.size[0], this.size[1]];
        if (size[0] === undefined && origSize[0]) size[0] = origSize[0];
        if (size[1] === undefined && origSize[1]) size[1] = origSize[1];
    }

    if (size[0] === true) size[0] = target.clientWidth;
    if (size[1] === true) size[1] = target.clientHeight;

    if (_xyNotEquals(this._size, size)) {
        if (!this._size) this._size = [0, 0];
        this._size[0] = size[0];
        this._size[1] = size[1];
        this._sizeDirty = true;
    }

    if (!matrix && this._matrix) {
        this._matrix = null;
        this._opacity = 0;
        _setInvisible(target);
        return;
    }

    if (this._opacity !== opacity) {
        this._opacity = opacity;
        target.style.opacity = (opacity >= 1) ? '0.999999' : opacity;
    }

    if (_xyNotEquals(this._origin, origin) || Transform.notEquals(this._matrix, matrix) || this._sizeDirty) {
        if (!matrix) matrix = Transform.identity;
        this._matrix = matrix;
        var aaMatrix = matrix;
        if (origin) {
            if (!this._origin) this._origin = [0, 0];
            this._origin[0] = origin[0];
            this._origin[1] = origin[1];
            aaMatrix = Transform.thenMove(matrix, [-this._size[0] * origin[0], -this._size[1] * origin[1], 0]);
            _setOrigin(target, origin);
        }
        _setMatrix(target, aaMatrix);
    }

    if (this._sizeDirty) {
        if (this._size) {
            target.style.width = (this.size && this.size[0] === true) ? '' : this._size[0] + 'px';
            target.style.height = (this.size && this.size[1] === true) ?  '' : this._size[1] + 'px';
        }
        this._sizeDirty = false;
    }
};

/**
 *  Remove all Famous-relevant attributes from a document element.
 *    This is called by SurfaceManager's detach().
 *    This is in some sense the reverse of .deploy().
 *
 * @private
 * @method cleanup
 * @param {ElementAllocator} allocator
 */
Surface.prototype.cleanup = function cleanup(allocator) {
    var i = 0;
    var target = this._currTarget;
    this.eventHandler.emit('recall');
    this.recall(target);
    target.style.display = 'none';
    target.style.width = '';
    target.style.height = '';
    this._size = null;
    _cleanupStyles.call(this, target);
    var classList = this.getClassList();
    _cleanupClasses.call(this, target);
    for (i = 0; i < classList.length; i++) target.classList.remove(classList[i]);
    if (this.elementClass) {
        if (this.elementClass instanceof Array) {
            for (i = 0; i < this.elementClass.length; i++) {
                target.classList.remove(this.elementClass[i]);
            }
        }
        else {
            target.classList.remove(this.elementClass);
        }
    }
    _removeEventListeners.call(this, target);
    this._currTarget = null;
    allocator.deallocate(target);
    _setInvisible(target);
};

/**
 * Place the document element that this component manages into the document.
 *
 * @private
 * @method deploy
 * @param {Node} target document parent of this container
 */
Surface.prototype.deploy = function deploy(target) {
    var content = this.getContent();
    if (content instanceof Node) {
        while (target.hasChildNodes()) target.removeChild(target.firstChild);
        target.appendChild(content);
    }
    else target.innerHTML = content;
};

/**
 * Remove any contained document content associated with this surface
 *   from the actual document.
 *
 * @private
 * @method recall
 */
Surface.prototype.recall = function recall(target) {
    var df = document.createDocumentFragment();
    while (target.hasChildNodes()) df.appendChild(target.firstChild);
    this.setContent(df);
};

/**
 *  Get the x and y dimensions of the surface.
 *
 * @method getSize
 * @param {boolean} actual return computed size rather than provided
 * @return {Array.Number} [x,y] size of surface
 */
Surface.prototype.getSize = function getSize(actual) {
    return actual ? this._size : (this.size || this._size);
};

/**
 * Set x and y dimensions of the surface.
 *
 * @method setSize
 * @param {Array.Number} size as [width, height]
 */
Surface.prototype.setSize = function setSize(size) {
    this.size = size ? [size[0], size[1]] : null;
    this._sizeDirty = true;
};

module.exports = Surface;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/core/Surface.js","/../../node_modules/famous/core")
},{"./Entity":4,"./EventHandler":6,"./Transform":12,"buffer":26,"oMfpAn":29}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */




/**
 *  A high-performance static matrix math library used to calculate
 *    affine transforms on surfaces and other renderables.
 *    Famo.us uses 4x4 matrices corresponding directly to
 *    WebKit matrices (column-major order).
 *
 *    The internal "type" of a Matrix is a 16-long float array in
 *    row-major order, with:
 *    elements [0],[1],[2],[4],[5],[6],[8],[9],[10] forming the 3x3
 *          transformation matrix;
 *    elements [12], [13], [14] corresponding to the t_x, t_y, t_z
 *           translation;
 *    elements [3], [7], [11] set to 0;
 *    element [15] set to 1.
 *    All methods are static.
 *
 * @static
 *
 * @class Transform
 */
var Transform = {};

// WARNING: these matrices correspond to WebKit matrices, which are
//    transposed from their math counterparts
Transform.precision = 1e-6;
Transform.identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/**
 * Multiply two or more Transform matrix types to return a Transform matrix.
 *
 * @method multiply4x4
 * @static
 * @param {Transform} a left Transform
 * @param {Transform} b right Transform
 * @return {Transform}
 */
Transform.multiply4x4 = function multiply4x4(a, b) {
    return [
        a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3],
        a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3],
        a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3],
        a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3],
        a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7],
        a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7],
        a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7],
        a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7],
        a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11],
        a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11],
        a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11],
        a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11],
        a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15],
        a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15],
        a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15],
        a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15]
    ];
};

/**
 * Fast-multiply two or more Transform matrix types to return a
 *    Matrix, assuming bottom row on each is [0 0 0 1].
 *
 * @method multiply
 * @static
 * @param {Transform} a left Transform
 * @param {Transform} b right Transform
 * @return {Transform}
 */
Transform.multiply = function multiply(a, b) {
    return [
        a[0] * b[0] + a[4] * b[1] + a[8] * b[2],
        a[1] * b[0] + a[5] * b[1] + a[9] * b[2],
        a[2] * b[0] + a[6] * b[1] + a[10] * b[2],
        0,
        a[0] * b[4] + a[4] * b[5] + a[8] * b[6],
        a[1] * b[4] + a[5] * b[5] + a[9] * b[6],
        a[2] * b[4] + a[6] * b[5] + a[10] * b[6],
        0,
        a[0] * b[8] + a[4] * b[9] + a[8] * b[10],
        a[1] * b[8] + a[5] * b[9] + a[9] * b[10],
        a[2] * b[8] + a[6] * b[9] + a[10] * b[10],
        0,
        a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12],
        a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13],
        a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14],
        1
    ];
};

/**
 * Return a Transform translated by additional amounts in each
 *    dimension. This is equivalent to the result of
 *
 *    Transform.multiply(Matrix.translate(t[0], t[1], t[2]), m).
 *
 * @method thenMove
 * @static
 * @param {Transform} m a Transform
 * @param {Array.Number} t floats delta vector of length 2 or 3
 * @return {Transform}
 */
Transform.thenMove = function thenMove(m, t) {
    if (!t[2]) t[2] = 0;
    return [m[0], m[1], m[2], 0, m[4], m[5], m[6], 0, m[8], m[9], m[10], 0, m[12] + t[0], m[13] + t[1], m[14] + t[2], 1];
};

/**
 * Return a Transform atrix which represents the result of a transform matrix
 *    applied after a move. This is faster than the equivalent multiply.
 *    This is equivalent to the result of:
 *
 *    Transform.multiply(m, Transform.translate(t[0], t[1], t[2])).
 *
 * @method moveThen
 * @static
 * @param {Array.Number} v vector representing initial movement
 * @param {Transform} m matrix to apply afterwards
 * @return {Transform} the resulting matrix
 */
Transform.moveThen = function moveThen(v, m) {
    if (!v[2]) v[2] = 0;
    var t0 = v[0] * m[0] + v[1] * m[4] + v[2] * m[8];
    var t1 = v[0] * m[1] + v[1] * m[5] + v[2] * m[9];
    var t2 = v[0] * m[2] + v[1] * m[6] + v[2] * m[10];
    return Transform.thenMove(m, [t0, t1, t2]);
};

/**
 * Return a Transform which represents a translation by specified
 *    amounts in each dimension.
 *
 * @method translate
 * @static
 * @param {Number} x x translation
 * @param {Number} y y translation
 * @param {Number} z z translation
 * @return {Transform}
 */
Transform.translate = function translate(x, y, z) {
    if (z === undefined) z = 0;
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
};

/**
 * Return a Transform scaled by a vector in each
 *    dimension. This is a more performant equivalent to the result of
 *
 *    Transform.multiply(Transform.scale(s[0], s[1], s[2]), m).
 *
 * @method thenScale
 * @static
 * @param {Transform} m a matrix
 * @param {Array.Number} s delta vector (array of floats &&
 *    array.length == 3)
 * @return {Transform}
 */
Transform.thenScale = function thenScale(m, s) {
    return [
        s[0] * m[0], s[1] * m[1], s[2] * m[2], 0,
        s[0] * m[4], s[1] * m[5], s[2] * m[6], 0,
        s[0] * m[8], s[1] * m[9], s[2] * m[10], 0,
        s[0] * m[12], s[1] * m[13], s[2] * m[14], 1
    ];
};

/**
 * Return a Transform which represents a scale by specified amounts
 *    in each dimension.
 *
 * @method scale
 * @static
 * @param {Number} x x scale factor
 * @param {Number} y y scale factor
 * @param {Number} z z scale factor
 * @return {Transform}
 */
Transform.scale = function scale(x, y, z) {
    if (z === undefined) z = 1;
    return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
};

/**
 * Return a Transform which represents a clockwise
 *    rotation around the x axis.
 *
 * @method rotateX
 * @static
 * @param {Number} theta radians
 * @return {Transform}
 */
Transform.rotateX = function rotateX(theta) {
    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);
    return [1, 0, 0, 0, 0, cosTheta, sinTheta, 0, 0, -sinTheta, cosTheta, 0, 0, 0, 0, 1];
};

/**
 * Return a Transform which represents a clockwise
 *    rotation around the y axis.
 *
 * @method rotateY
 * @static
 * @param {Number} theta radians
 * @return {Transform}
 */
Transform.rotateY = function rotateY(theta) {
    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);
    return [cosTheta, 0, -sinTheta, 0, 0, 1, 0, 0, sinTheta, 0, cosTheta, 0, 0, 0, 0, 1];
};

/**
 * Return a Transform which represents a clockwise
 *    rotation around the z axis.
 *
 * @method rotateZ
 * @static
 * @param {Number} theta radians
 * @return {Transform}
 */
Transform.rotateZ = function rotateZ(theta) {
    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);
    return [cosTheta, sinTheta, 0, 0, -sinTheta, cosTheta, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
};

/**
 * Return a Transform which represents composed clockwise
 *    rotations along each of the axes. Equivalent to the result of
 *    Matrix.multiply(rotateX(phi), rotateY(theta), rotateZ(psi)).
 *
 * @method rotate
 * @static
 * @param {Number} phi radians to rotate about the positive x axis
 * @param {Number} theta radians to rotate about the positive y axis
 * @param {Number} psi radians to rotate about the positive z axis
 * @return {Transform}
 */
Transform.rotate = function rotate(phi, theta, psi) {
    var cosPhi = Math.cos(phi);
    var sinPhi = Math.sin(phi);
    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);
    var cosPsi = Math.cos(psi);
    var sinPsi = Math.sin(psi);
    var result = [
        cosTheta * cosPsi,
        cosPhi * sinPsi + sinPhi * sinTheta * cosPsi,
        sinPhi * sinPsi - cosPhi * sinTheta * cosPsi,
        0,
        -cosTheta * sinPsi,
        cosPhi * cosPsi - sinPhi * sinTheta * sinPsi,
        sinPhi * cosPsi + cosPhi * sinTheta * sinPsi,
        0,
        sinTheta,
        -sinPhi * cosTheta,
        cosPhi * cosTheta,
        0,
        0, 0, 0, 1
    ];
    return result;
};

/**
 * Return a Transform which represents an axis-angle rotation
 *
 * @method rotateAxis
 * @static
 * @param {Array.Number} v unit vector representing the axis to rotate about
 * @param {Number} theta radians to rotate clockwise about the axis
 * @return {Transform}
 */
Transform.rotateAxis = function rotateAxis(v, theta) {
    var sinTheta = Math.sin(theta);
    var cosTheta = Math.cos(theta);
    var verTheta = 1 - cosTheta; // versine of theta

    var xxV = v[0] * v[0] * verTheta;
    var xyV = v[0] * v[1] * verTheta;
    var xzV = v[0] * v[2] * verTheta;
    var yyV = v[1] * v[1] * verTheta;
    var yzV = v[1] * v[2] * verTheta;
    var zzV = v[2] * v[2] * verTheta;
    var xs = v[0] * sinTheta;
    var ys = v[1] * sinTheta;
    var zs = v[2] * sinTheta;

    var result = [
        xxV + cosTheta, xyV + zs, xzV - ys, 0,
        xyV - zs, yyV + cosTheta, yzV + xs, 0,
        xzV + ys, yzV - xs, zzV + cosTheta, 0,
        0, 0, 0, 1
    ];
    return result;
};

/**
 * Return a Transform which represents a transform matrix applied about
 * a separate origin point.
 *
 * @method aboutOrigin
 * @static
 * @param {Array.Number} v origin point to apply matrix
 * @param {Transform} m matrix to apply
 * @return {Transform}
 */
Transform.aboutOrigin = function aboutOrigin(v, m) {
    var t0 = v[0] - (v[0] * m[0] + v[1] * m[4] + v[2] * m[8]);
    var t1 = v[1] - (v[0] * m[1] + v[1] * m[5] + v[2] * m[9]);
    var t2 = v[2] - (v[0] * m[2] + v[1] * m[6] + v[2] * m[10]);
    return Transform.thenMove(m, [t0, t1, t2]);
};

/**
 * Return a Transform representation of a skew transformation
 *
 * @method skew
 * @static
 * @param {Number} phi scale factor skew in the x axis
 * @param {Number} theta scale factor skew in the y axis
 * @param {Number} psi scale factor skew in the z axis
 * @return {Transform}
 */
Transform.skew = function skew(phi, theta, psi) {
    return [1, 0, 0, 0, Math.tan(psi), 1, 0, 0, Math.tan(theta), Math.tan(phi), 1, 0, 0, 0, 0, 1];
};

/**
 * Return a Transform representation of a skew in the x-direction
 *
 * @method skewX
 * @static
 * @param {Number} angle the angle between the top and left sides
 * @return {Transform}
 */
Transform.skewX = function skewX(angle) {
    return [1, 0, 0, 0, Math.tan(angle), 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
};

/**
 * Return a Transform representation of a skew in the y-direction
 *
 * @method skewY
 * @static
 * @param {Number} angle the angle between the top and right sides
 * @return {Transform}
 */
Transform.skewY = function skewY(angle) {
    return [1, Math.tan(angle), 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
};

/**
 * Returns a perspective Transform matrix
 *
 * @method perspective
 * @static
 * @param {Number} focusZ z position of focal point
 * @return {Transform}
 */
Transform.perspective = function perspective(focusZ) {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -1 / focusZ, 0, 0, 0, 1];
};

/**
 * Return translation vector component of given Transform
 *
 * @method getTranslate
 * @static
 * @param {Transform} m Transform
 * @return {Array.Number} the translation vector [t_x, t_y, t_z]
 */
Transform.getTranslate = function getTranslate(m) {
    return [m[12], m[13], m[14]];
};

/**
 * Return inverse affine transform for given Transform.
 *   Note: This assumes m[3] = m[7] = m[11] = 0, and m[15] = 1.
 *   Will provide incorrect results if not invertible or preconditions not met.
 *
 * @method inverse
 * @static
 * @param {Transform} m Transform
 * @return {Transform}
 */
Transform.inverse = function inverse(m) {
    // only need to consider 3x3 section for affine
    var c0 = m[5] * m[10] - m[6] * m[9];
    var c1 = m[4] * m[10] - m[6] * m[8];
    var c2 = m[4] * m[9] - m[5] * m[8];
    var c4 = m[1] * m[10] - m[2] * m[9];
    var c5 = m[0] * m[10] - m[2] * m[8];
    var c6 = m[0] * m[9] - m[1] * m[8];
    var c8 = m[1] * m[6] - m[2] * m[5];
    var c9 = m[0] * m[6] - m[2] * m[4];
    var c10 = m[0] * m[5] - m[1] * m[4];
    var detM = m[0] * c0 - m[1] * c1 + m[2] * c2;
    var invD = 1 / detM;
    var result = [
        invD * c0, -invD * c4, invD * c8, 0,
        -invD * c1, invD * c5, -invD * c9, 0,
        invD * c2, -invD * c6, invD * c10, 0,
        0, 0, 0, 1
    ];
    result[12] = -m[12] * result[0] - m[13] * result[4] - m[14] * result[8];
    result[13] = -m[12] * result[1] - m[13] * result[5] - m[14] * result[9];
    result[14] = -m[12] * result[2] - m[13] * result[6] - m[14] * result[10];
    return result;
};

/**
 * Returns the transpose of a 4x4 matrix
 *
 * @method transpose
 * @static
 * @param {Transform} m matrix
 * @return {Transform} the resulting transposed matrix
 */
Transform.transpose = function transpose(m) {
    return [m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13], m[2], m[6], m[10], m[14], m[3], m[7], m[11], m[15]];
};

function _normSquared(v) {
    return (v.length === 2) ? v[0] * v[0] + v[1] * v[1] : v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
}
function _norm(v) {
    return Math.sqrt(_normSquared(v));
}
function _sign(n) {
    return (n < 0) ? -1 : 1;
}

/**
 * Decompose Transform into separate .translate, .rotate, .scale,
 *    and .skew components.
 *
 * @method interpret
 * @static
 * @param {Transform} M transform matrix
 * @return {Object} matrix spec object with component matrices .translate,
 *    .rotate, .scale, .skew
 */
Transform.interpret = function interpret(M) {

    // QR decomposition via Householder reflections
    //FIRST ITERATION

    //default Q1 to the identity matrix;
    var x = [M[0], M[1], M[2]];                // first column vector
    var sgn = _sign(x[0]);                     // sign of first component of x (for stability)
    var xNorm = _norm(x);                      // norm of first column vector
    var v = [x[0] + sgn * xNorm, x[1], x[2]];  // v = x + sign(x[0])|x|e1
    var mult = 2 / _normSquared(v);            // mult = 2/v'v

    //bail out if our Matrix is singular
    if (mult >= Infinity) {
        return {translate: Transform.getTranslate(M), rotate: [0, 0, 0], scale: [0, 0, 0], skew: [0, 0, 0]};
    }

    //evaluate Q1 = I - 2vv'/v'v
    var Q1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];

    //diagonals
    Q1[0]  = 1 - mult * v[0] * v[0];    // 0,0 entry
    Q1[5]  = 1 - mult * v[1] * v[1];    // 1,1 entry
    Q1[10] = 1 - mult * v[2] * v[2];    // 2,2 entry

    //upper diagonal
    Q1[1] = -mult * v[0] * v[1];        // 0,1 entry
    Q1[2] = -mult * v[0] * v[2];        // 0,2 entry
    Q1[6] = -mult * v[1] * v[2];        // 1,2 entry

    //lower diagonal
    Q1[4] = Q1[1];                      // 1,0 entry
    Q1[8] = Q1[2];                      // 2,0 entry
    Q1[9] = Q1[6];                      // 2,1 entry

    //reduce first column of M
    var MQ1 = Transform.multiply(Q1, M);

    //SECOND ITERATION on (1,1) minor
    var x2 = [MQ1[5], MQ1[6]];
    var sgn2 = _sign(x2[0]);                    // sign of first component of x (for stability)
    var x2Norm = _norm(x2);                     // norm of first column vector
    var v2 = [x2[0] + sgn2 * x2Norm, x2[1]];    // v = x + sign(x[0])|x|e1
    var mult2 = 2 / _normSquared(v2);           // mult = 2/v'v

    //evaluate Q2 = I - 2vv'/v'v
    var Q2 = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];

    //diagonal
    Q2[5]  = 1 - mult2 * v2[0] * v2[0]; // 1,1 entry
    Q2[10] = 1 - mult2 * v2[1] * v2[1]; // 2,2 entry

    //off diagonals
    Q2[6] = -mult2 * v2[0] * v2[1];     // 2,1 entry
    Q2[9] = Q2[6];                      // 1,2 entry

    //calc QR decomposition. Q = Q1*Q2, R = Q'*M
    var Q = Transform.multiply(Q2, Q1);      //note: really Q transpose
    var R = Transform.multiply(Q, M);

    //remove negative scaling
    var remover = Transform.scale(R[0] < 0 ? -1 : 1, R[5] < 0 ? -1 : 1, R[10] < 0 ? -1 : 1);
    R = Transform.multiply(R, remover);
    Q = Transform.multiply(remover, Q);

    //decompose into rotate/scale/skew matrices
    var result = {};
    result.translate = Transform.getTranslate(M);
    result.rotate = [Math.atan2(-Q[6], Q[10]), Math.asin(Q[2]), Math.atan2(-Q[1], Q[0])];
    if (!result.rotate[0]) {
        result.rotate[0] = 0;
        result.rotate[2] = Math.atan2(Q[4], Q[5]);
    }
    result.scale = [R[0], R[5], R[10]];
    result.skew = [Math.atan2(R[9], result.scale[2]), Math.atan2(R[8], result.scale[2]), Math.atan2(R[4], result.scale[0])];

    //double rotation workaround
    if (Math.abs(result.rotate[0]) + Math.abs(result.rotate[2]) > 1.5 * Math.PI) {
        result.rotate[1] = Math.PI - result.rotate[1];
        if (result.rotate[1] > Math.PI) result.rotate[1] -= 2 * Math.PI;
        if (result.rotate[1] < -Math.PI) result.rotate[1] += 2 * Math.PI;
        if (result.rotate[0] < 0) result.rotate[0] += Math.PI;
        else result.rotate[0] -= Math.PI;
        if (result.rotate[2] < 0) result.rotate[2] += Math.PI;
        else result.rotate[2] -= Math.PI;
    }

    return result;
};

/**
 * Weighted average between two matrices by averaging their
 *     translation, rotation, scale, skew components.
 *     f(M1,M2,t) = (1 - t) * M1 + t * M2
 *
 * @method average
 * @static
 * @param {Transform} M1 f(M1,M2,0) = M1
 * @param {Transform} M2 f(M1,M2,1) = M2
 * @param {Number} t
 * @return {Transform}
 */
Transform.average = function average(M1, M2, t) {
    t = (t === undefined) ? 0.5 : t;
    var specM1 = Transform.interpret(M1);
    var specM2 = Transform.interpret(M2);

    var specAvg = {
        translate: [0, 0, 0],
        rotate: [0, 0, 0],
        scale: [0, 0, 0],
        skew: [0, 0, 0]
    };

    for (var i = 0; i < 3; i++) {
        specAvg.translate[i] = (1 - t) * specM1.translate[i] + t * specM2.translate[i];
        specAvg.rotate[i] = (1 - t) * specM1.rotate[i] + t * specM2.rotate[i];
        specAvg.scale[i] = (1 - t) * specM1.scale[i] + t * specM2.scale[i];
        specAvg.skew[i] = (1 - t) * specM1.skew[i] + t * specM2.skew[i];
    }
    return Transform.build(specAvg);
};

/**
 * Compose .translate, .rotate, .scale, .skew components into
 * Transform matrix
 *
 * @method build
 * @static
 * @param {matrixSpec} spec object with component matrices .translate,
 *    .rotate, .scale, .skew
 * @return {Transform} composed transform
 */
Transform.build = function build(spec) {
    var scaleMatrix = Transform.scale(spec.scale[0], spec.scale[1], spec.scale[2]);
    var skewMatrix = Transform.skew(spec.skew[0], spec.skew[1], spec.skew[2]);
    var rotateMatrix = Transform.rotate(spec.rotate[0], spec.rotate[1], spec.rotate[2]);
    return Transform.thenMove(Transform.multiply(Transform.multiply(rotateMatrix, skewMatrix), scaleMatrix), spec.translate);
};

/**
 * Determine if two Transforms are component-wise equal
 *   Warning: breaks on perspective Transforms
 *
 * @method equals
 * @static
 * @param {Transform} a matrix
 * @param {Transform} b matrix
 * @return {boolean}
 */
Transform.equals = function equals(a, b) {
    return !Transform.notEquals(a, b);
};

/**
 * Determine if two Transforms are component-wise unequal
 *   Warning: breaks on perspective Transforms
 *
 * @method notEquals
 * @static
 * @param {Transform} a matrix
 * @param {Transform} b matrix
 * @return {boolean}
 */
Transform.notEquals = function notEquals(a, b) {
    if (a === b) return false;

    // shortci
    return !(a && b) ||
        a[12] !== b[12] || a[13] !== b[13] || a[14] !== b[14] ||
        a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2] ||
        a[4] !== b[4] || a[5] !== b[5] || a[6] !== b[6] ||
        a[8] !== b[8] || a[9] !== b[9] || a[10] !== b[10];
};

/**
 * Constrain angle-trio components to range of [-pi, pi).
 *
 * @method normalizeRotation
 * @static
 * @param {Array.Number} rotation phi, theta, psi (array of floats
 *    && array.length == 3)
 * @return {Array.Number} new phi, theta, psi triplet
 *    (array of floats && array.length == 3)
 */
Transform.normalizeRotation = function normalizeRotation(rotation) {
    var result = rotation.slice(0);
    if (result[0] === Math.PI * 0.5 || result[0] === -Math.PI * 0.5) {
        result[0] = -result[0];
        result[1] = Math.PI - result[1];
        result[2] -= Math.PI;
    }
    if (result[0] > Math.PI * 0.5) {
        result[0] = result[0] - Math.PI;
        result[1] = Math.PI - result[1];
        result[2] -= Math.PI;
    }
    if (result[0] < -Math.PI * 0.5) {
        result[0] = result[0] + Math.PI;
        result[1] = -Math.PI - result[1];
        result[2] -= Math.PI;
    }
    while (result[1] < -Math.PI) result[1] += 2 * Math.PI;
    while (result[1] >= Math.PI) result[1] -= 2 * Math.PI;
    while (result[2] < -Math.PI) result[2] += 2 * Math.PI;
    while (result[2] >= Math.PI) result[2] -= 2 * Math.PI;
    return result;
};

/**
 * (Property) Array defining a translation forward in z by 1
 *
 * @property {array} inFront
 * @static
 * @final
 */
Transform.inFront = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1e-3, 1];

/**
 * (Property) Array defining a translation backwards in z by 1
 *
 * @property {array} behind
 * @static
 * @final
 */
Transform.behind = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1e-3, 1];

module.exports = Transform;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/core/Transform.js","/../../node_modules/famous/core")
},{"buffer":26,"oMfpAn":29}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */




/**
 * Three-element floating point vector.
 *
 * @class Vector
 * @constructor
 *
 * @param {number} x x element value
 * @param {number} y y element value
 * @param {number} z z element value
 */
function Vector(x,y,z) {
    if (arguments.length === 1) this.set(x);
    else {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }
    return this;
}

var _register = new Vector(0,0,0);

/**
 * Add this element-wise to another Vector, element-wise.
 *   Note: This sets the internal result register, so other references to that vector will change.
 *
 * @method add
 * @param {Vector} v addend
 * @return {Vector} vector sum
 */
Vector.prototype.add = function add(v) {
    return _setXYZ.call(_register,
        this.x + v.x,
        this.y + v.y,
        this.z + v.z
    );
};

/**
 * Subtract another vector from this vector, element-wise.
 *   Note: This sets the internal result register, so other references to that vector will change.
 *
 * @method sub
 * @param {Vector} v subtrahend
 * @return {Vector} vector difference
 */
Vector.prototype.sub = function sub(v) {
    return _setXYZ.call(_register,
        this.x - v.x,
        this.y - v.y,
        this.z - v.z
    );
};

/**
 * Scale Vector by floating point r.
 *   Note: This sets the internal result register, so other references to that vector will change.
 *
 * @method mult
 *
 * @param {number} r scalar
 * @return {Vector} vector result
 */
Vector.prototype.mult = function mult(r) {
    return _setXYZ.call(_register,
        r * this.x,
        r * this.y,
        r * this.z
    );
};

/**
 * Scale Vector by floating point 1/r.
 *   Note: This sets the internal result register, so other references to that vector will change.
 *
 * @method div
 *
 * @param {number} r scalar
 * @return {Vector} vector result
 */
Vector.prototype.div = function div(r) {
    return this.mult(1 / r);
};

/**
 * Given another vector v, return cross product (v)x(this).
 *   Note: This sets the internal result register, so other references to that vector will change.
 *
 * @method cross
 * @param {Vector} v Left Hand Vector
 * @return {Vector} vector result
 */
Vector.prototype.cross = function cross(v) {
    var x = this.x;
    var y = this.y;
    var z = this.z;
    var vx = v.x;
    var vy = v.y;
    var vz = v.z;

    return _setXYZ.call(_register,
        z * vy - y * vz,
        x * vz - z * vx,
        y * vx - x * vy
    );
};

/**
 * Component-wise equality test between this and Vector v.
 * @method equals
 * @param {Vector} v vector to compare
 * @return {boolean}
 */
Vector.prototype.equals = function equals(v) {
    return (v.x === this.x && v.y === this.y && v.z === this.z);
};

/**
 * Rotate clockwise around x-axis by theta radians.
 *   Note: This sets the internal result register, so other references to that vector will change.
 * @method rotateX
 * @param {number} theta radians
 * @return {Vector} rotated vector
 */
Vector.prototype.rotateX = function rotateX(theta) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    return _setXYZ.call(_register,
        x,
        y * cosTheta - z * sinTheta,
        y * sinTheta + z * cosTheta
    );
};

/**
 * Rotate clockwise around y-axis by theta radians.
 *   Note: This sets the internal result register, so other references to that vector will change.
 * @method rotateY
 * @param {number} theta radians
 * @return {Vector} rotated vector
 */
Vector.prototype.rotateY = function rotateY(theta) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    return _setXYZ.call(_register,
        z * sinTheta + x * cosTheta,
        y,
        z * cosTheta - x * sinTheta
    );
};

/**
 * Rotate clockwise around z-axis by theta radians.
 *   Note: This sets the internal result register, so other references to that vector will change.
 * @method rotateZ
 * @param {number} theta radians
 * @return {Vector} rotated vector
 */
Vector.prototype.rotateZ = function rotateZ(theta) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    return _setXYZ.call(_register,
        x * cosTheta - y * sinTheta,
        x * sinTheta + y * cosTheta,
        z
    );
};

/**
 * Return dot product of this with a second Vector
 * @method dot
 * @param {Vector} v second vector
 * @return {number} dot product
 */
Vector.prototype.dot = function dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
};

/**
 * Return squared length of this vector
 * @method normSquared
 * @return {number} squared length
 */
Vector.prototype.normSquared = function normSquared() {
    return this.dot(this);
};

/**
 * Return length of this vector
 * @method norm
 * @return {number} length
 */
Vector.prototype.norm = function norm() {
    return Math.sqrt(this.normSquared());
};

/**
 * Scale Vector to specified length.
 *   If length is less than internal tolerance, set vector to [length, 0, 0].
 *   Note: This sets the internal result register, so other references to that vector will change.
 * @method normalize
 *
 * @param {number} length target length, default 1.0
 * @return {Vector}
 */
Vector.prototype.normalize = function normalize(length) {
    if (arguments.length === 0) length = 1;
    var norm = this.norm();

    if (norm > 1e-7) return _setFromVector.call(_register, this.mult(length / norm));
    else return _setXYZ.call(_register, length, 0, 0);
};

/**
 * Make a separate copy of the Vector.
 *
 * @method clone
 *
 * @return {Vector}
 */
Vector.prototype.clone = function clone() {
    return new Vector(this);
};

/**
 * True if and only if every value is 0 (or falsy)
 *
 * @method isZero
 *
 * @return {boolean}
 */
Vector.prototype.isZero = function isZero() {
    return !(this.x || this.y || this.z);
};

function _setXYZ(x,y,z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
}

function _setFromArray(v) {
    return _setXYZ.call(this,v[0],v[1],v[2] || 0);
}

function _setFromVector(v) {
    return _setXYZ.call(this, v.x, v.y, v.z);
}

function _setFromNumber(x) {
    return _setXYZ.call(this,x,0,0);
}

/**
 * Set this Vector to the values in the provided Array or Vector.
 *
 * @method set
 * @param {object} v array, Vector, or number
 * @return {Vector} this
 */
Vector.prototype.set = function set(v) {
    if (v instanceof Array)    return _setFromArray.call(this, v);
    if (v instanceof Vector)   return _setFromVector.call(this, v);
    if (typeof v === 'number') return _setFromNumber.call(this, v);
};

Vector.prototype.setXYZ = function(x,y,z) {
    return _setXYZ.apply(this, arguments);
};

Vector.prototype.set1D = function(x) {
    return _setFromNumber.call(this, x);
};

/**
 * Put result of last internal register calculation in specified output vector.
 *
 * @method put
 * @param {Vector} v destination vector
 * @return {Vector} destination vector
 */

Vector.prototype.put = function put(v) {
    if (this === _register) _setFromVector.call(v, _register);
    else _setFromVector.call(v, this);
};

/**
 * Set this vector to [0,0,0]
 *
 * @method clear
 */
Vector.prototype.clear = function clear() {
    return _setXYZ.call(this,0,0,0);
};

/**
 * Scale this Vector down to specified "cap" length.
 *   If Vector shorter than cap, or cap is Infinity, do nothing.
 *   Note: This sets the internal result register, so other references to that vector will change.
 *
 * @method cap
 * @return {Vector} capped vector
 */
Vector.prototype.cap = function cap(cap) {
    if (cap === Infinity) return _setFromVector.call(_register, this);
    var norm = this.norm();
    if (norm > cap) return _setFromVector.call(_register, this.mult(cap / norm));
    else return _setFromVector.call(_register, this);
};

/**
 * Return projection of this Vector onto another.
 *   Note: This sets the internal result register, so other references to that vector will change.
 *
 * @method project
 * @param {Vector} n vector to project upon
 * @return {Vector} projected vector
 */
Vector.prototype.project = function project(n) {
    return n.mult(this.dot(n));
};

/**
 * Reflect this Vector across provided vector.
 *   Note: This sets the internal result register, so other references to that vector will change.
 *
 * @method reflectAcross
 * @param {Vector} n vector to reflect across
 * @return {Vector} reflected vector
 */
Vector.prototype.reflectAcross = function reflectAcross(n) {
    n.normalize().put(n);
    return _setFromVector(_register, this.sub(this.project(n).mult(2)));
};

/**
 * Convert Vector to three-element array.
 *
 * @method get
 * @return {array<number>} three-element array
 */
Vector.prototype.get = function get() {
    return [this.x, this.y, this.z];
};

Vector.prototype.get1D = function() {
    return this.x;
};

module.exports = Vector;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/math/Vector.js","/../../node_modules/famous/math")
},{"buffer":26,"oMfpAn":29}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var Modifier = require('../core/Modifier');
var Transform = require('../core/Transform');
var Transitionable = require('../transitions/Transitionable');
var TransitionableTransform = require('../transitions/TransitionableTransform');

/**
 *  A collection of visual changes to be
 *    applied to another renderable component, strongly coupled with the state that defines
 *    those changes. This collection includes a
 *    transform matrix, an opacity constant, a size, an origin specifier, and an alignment specifier.
 *    StateModifier objects can be added to any RenderNode or object
 *    capable of displaying renderables.  The StateModifier's children and descendants
 *    are transformed by the amounts specified in the modifier's properties.
 *
 * @class StateModifier
 * @constructor
 * @param {Object} [options] overrides of default options
 * @param {Transform} [options.transform] affine transformation matrix
 * @param {Number} [options.opacity]
 * @param {Array.Number} [options.origin] origin adjustment
 * @param {Array.Number} [options.align] align adjustment
 * @param {Array.Number} [options.size] size to apply to descendants
 */
function StateModifier(options) {
    this._transformState = new TransitionableTransform(Transform.identity);
    this._opacityState = new Transitionable(1);
    this._originState = new Transitionable([0, 0]);
    this._alignState = new Transitionable([0, 0]);
    this._sizeState = new Transitionable([0, 0]);

    this._modifier = new Modifier({
        transform: this._transformState,
        opacity: this._opacityState,
        origin: null,
        align: null,
        size: null
    });

    this._hasOrigin = false;
    this._hasAlign = false;
    this._hasSize = false;

    if (options) {
        if (options.transform) this.setTransform(options.transform);
        if (options.opacity !== undefined) this.setOpacity(options.opacity);
        if (options.origin) this.setOrigin(options.origin);
        if (options.align) this.setAlign(options.align);
        if (options.size) this.setSize(options.size);
    }
}

/**
 * Set the transform matrix of this modifier, either statically or
 *   through a provided Transitionable.
 *
 * @method setTransform
 *
 * @param {Transform} transform Transform to transition to.
 * @param {Transitionable} [transition] Valid transitionable object
 * @param {Function} [callback] callback to call after transition completes
 * @return {StateModifier} this
 */
StateModifier.prototype.setTransform = function setTransform(transform, transition, callback) {
    this._transformState.set(transform, transition, callback);
    return this;
};

/**
 * Set the opacity of this modifier, either statically or
 *   through a provided Transitionable.
 *
 * @method setOpacity
 *
 * @param {Number} opacity Opacity value to transition to.
 * @param {Transitionable} transition Valid transitionable object
 * @param {Function} callback callback to call after transition completes
 * @return {StateModifier} this
 */
StateModifier.prototype.setOpacity = function setOpacity(opacity, transition, callback) {
    this._opacityState.set(opacity, transition, callback);
    return this;
};

/**
 * Set the origin of this modifier, either statically or
 *   through a provided Transitionable.
 *
 * @method setOrigin
 *
 * @param {Array.Number} origin two element array with values between 0 and 1.
 * @param {Transitionable} transition Valid transitionable object
 * @param {Function} callback callback to call after transition completes
 * @return {StateModifier} this
 */
StateModifier.prototype.setOrigin = function setOrigin(origin, transition, callback) {
    if (origin === null) {
        if (this._hasOrigin) {
            this._modifier.originFrom(null);
            this._hasOrigin = false;
        }
        return this;
    }
    else if (!this._hasOrigin) {
        this._hasOrigin = true;
        this._modifier.originFrom(this._originState);
    }
    this._originState.set(origin, transition, callback);
    return this;
};

/**
 * Set the alignment of this modifier, either statically or
 *   through a provided Transitionable.
 *
 * @method setAlign
 *
 * @param {Array.Number} align two element array with values between 0 and 1.
 * @param {Transitionable} transition Valid transitionable object
 * @param {Function} callback callback to call after transition completes
 * @return {StateModifier} this
 */
StateModifier.prototype.setAlign = function setOrigin(align, transition, callback) {
    if (align === null) {
        if (this._hasAlign) {
            this._modifier.alignFrom(null);
            this._hasAlign = false;
        }
        return this;
    }
    else if (!this._hasAlign) {
        this._hasAlign = true;
        this._modifier.alignFrom(this._alignState);
    }
    this._alignState.set(align, transition, callback);
    return this;
};

/**
 * Set the size of this modifier, either statically or
 *   through a provided Transitionable.
 *
 * @method setSize
 *
 * @param {Array.Number} size two element array with values between 0 and 1.
 * @param {Transitionable} transition Valid transitionable object
 * @param {Function} callback callback to call after transition completes
 * @return {StateModifier} this
 */
StateModifier.prototype.setSize = function setSize(size, transition, callback) {
    if (size === null) {
        if (this._hasSize) {
            this._modifier.sizeFrom(null);
            this._hasSize = false;
        }
        return this;
    }
    else if (!this._hasSize) {
        this._hasSize = true;
        this._modifier.sizeFrom(this._sizeState);
    }
    this._sizeState.set(size, transition, callback);
    return this;
};

/**
 * Stop the transition.
 *
 * @method halt
 */
StateModifier.prototype.halt = function halt() {
    this._transformState.halt();
    this._opacityState.halt();
    this._originState.halt();
    this._alignState.halt();
    this._sizeState.halt();
};

/**
 * Get the current state of the transform matrix component.
 *
 * @method getTransform
 * @return {Object} transform provider object
 */
StateModifier.prototype.getTransform = function getTransform() {
    return this._transformState.get();
};

/**
 * Get the destination state of the transform component.
 *
 * @method getFinalTransform
 * @return {Transform} transform matrix
 */
StateModifier.prototype.getFinalTransform = function getFinalTransform() {
    return this._transformState.getFinal();
};

/**
 * Get the current state of the opacity component.
 *
 * @method getOpacity
 * @return {Object} opacity provider object
 */
StateModifier.prototype.getOpacity = function getOpacity() {
    return this._opacityState.get();
};

/**
 * Get the current state of the origin component.
 *
 * @method getOrigin
 * @return {Object} origin provider object
 */
StateModifier.prototype.getOrigin = function getOrigin() {
    return this._hasOrigin ? this._originState.get() : null;
};

/**
 * Get the current state of the align component.
 *
 * @method getAlign
 * @return {Object} align provider object
 */
StateModifier.prototype.getAlign = function getAlign() {
    return this._hasAlign ? this._alignState.get() : null;
};

/**
 * Get the current state of the size component.
 *
 * @method getSize
 * @return {Object} size provider object
 */
StateModifier.prototype.getSize = function getSize() {
    return this._hasSize ? this._sizeState.get() : null;
};

/**
 * Return render spec for this StateModifier, applying to the provided
 *    target component.  This is similar to render() for Surfaces.
 *
 * @private
 * @method modify
 *
 * @param {Object} target (already rendered) render spec to
 *    which to apply the transform.
 * @return {Object} render spec for this StateModifier, including the
 *    provided target
 */
StateModifier.prototype.modify = function modify(target) {
    return this._modifier.modify(target);
};

module.exports = StateModifier;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/modifiers/StateModifier.js","/../../node_modules/famous/modifiers")
},{"../core/Modifier":7,"../core/Transform":12,"../transitions/Transitionable":22,"../transitions/TransitionableTransform":23,"buffer":26,"oMfpAn":29}],15:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */
var EventHandler = require('../core/EventHandler');

/**
 * The Physics Engine is responsible for mediating Bodies and their
 * interaction with forces and constraints. The Physics Engine handles the
 * logic of adding and removing bodies, updating their state of the over
 * time.
 *
 * @class PhysicsEngine
 * @constructor
 * @param options {Object} options
 */
function PhysicsEngine(options) {
    this.options = Object.create(PhysicsEngine.DEFAULT_OPTIONS);
    if (options) this.setOptions(options);

    this._particles      = [];   //list of managed particles
    this._bodies         = [];   //list of managed bodies
    this._agents         = {};   //hash of managed agents
    this._forces         = [];   //list of IDs of agents that are forces
    this._constraints    = [];   //list of IDs of agents that are constraints

    this._buffer         = 0.0;
    this._prevTime       = now();
    this._isSleeping     = false;
    this._eventHandler   = null;
    this._currAgentId    = 0;
    this._hasBodies      = false;
}

var TIMESTEP = 17;
var MIN_TIME_STEP = 1000 / 120;
var MAX_TIME_STEP = 17;

/**
 * @property PhysicsEngine.DEFAULT_OPTIONS
 * @type Object
 * @protected
 * @static
 */
PhysicsEngine.DEFAULT_OPTIONS = {

    /**
     * The number of iterations the engine takes to resolve constraints
     * @attribute constraintSteps
     * @type Number
     */
    constraintSteps : 1,

    /**
     * The energy threshold before the Engine stops updating
     * @attribute sleepTolerance
     * @type Number
     */
    sleepTolerance  : 1e-7
};

var now = (function() {
    return Date.now;
})();

/**
 * Options setter
 * @method setOptions
 * @param options {Object}
 */
PhysicsEngine.prototype.setOptions = function setOptions(opts) {
    for (var key in opts) if (this.options[key]) this.options[key] = opts[key];
};

/**
 * Method to add a physics body to the engine. Necessary to update the
 * body over time.
 *
 * @method addBody
 * @param body {Body}
 * @return body {Body}
 */
PhysicsEngine.prototype.addBody = function addBody(body) {
    body._engine = this;
    if (body.isBody) {
        this._bodies.push(body);
        this._hasBodies = true;
    }
    else this._particles.push(body);
    return body;
};

/**
 * Remove a body from the engine. Detaches body from all forces and
 * constraints.
 *
 * @method removeBody
 * @param body {Body}
 */
PhysicsEngine.prototype.removeBody = function removeBody(body) {
    var array = (body.isBody) ? this._bodies : this._particles;
    var index = array.indexOf(body);
    if (index > -1) {
        for (var i = 0; i < Object.keys(this._agents).length; i++) this.detachFrom(i, body);
        array.splice(index,1);
    }
    if (this.getBodies().length === 0) this._hasBodies = false;
};

function _mapAgentArray(agent) {
    if (agent.applyForce)      return this._forces;
    if (agent.applyConstraint) return this._constraints;
}

function _attachOne(agent, targets, source) {
    if (targets === undefined) targets = this.getParticlesAndBodies();
    if (!(targets instanceof Array)) targets = [targets];

    this._agents[this._currAgentId] = {
        agent   : agent,
        targets : targets,
        source  : source
    };

    _mapAgentArray.call(this, agent).push(this._currAgentId);
    return this._currAgentId++;
}

/**
 * Attaches a force or constraint to a Body. Returns an AgentId of the
 * attached agent which can be used to detach the agent.
 *
 * @method attach
 * @param agent {Agent|Array.Agent} A force, constraint, or array of them.
 * @param [targets=All] {Body|Array.Body} The Body or Bodies affected by the agent
 * @param [source] {Body} The source of the agent
 * @return AgentId {Number}
 */
PhysicsEngine.prototype.attach = function attach(agents, targets, source) {
    if (agents instanceof Array) {
        var agentIDs = [];
        for (var i = 0; i < agents.length; i++)
            agentIDs[i] = _attachOne.call(this, agents[i], targets, source);
        return agentIDs;
    }
    else return _attachOne.call(this, agents, targets, source);
};

/**
 * Append a body to the targets of a previously defined physics agent.
 *
 * @method attachTo
 * @param agentID {AgentId} The agentId of a previously defined agent
 * @param target {Body} The Body affected by the agent
 */
PhysicsEngine.prototype.attachTo = function attachTo(agentID, target) {
    _getBoundAgent.call(this, agentID).targets.push(target);
};

/**
 * Undoes PhysicsEngine.attach. Removes an agent and its associated
 * effect on its affected Bodies.
 *
 * @method detach
 * @param agentID {AgentId} The agentId of a previously defined agent
 */
PhysicsEngine.prototype.detach = function detach(id) {
    // detach from forces/constraints array
    var agent = this.getAgent(id);
    var agentArray = _mapAgentArray.call(this, agent);
    var index = agentArray.indexOf(id);
    agentArray.splice(index,1);

    // detach agents array
    delete this._agents[id];
};

/**
 * Remove a single Body from a previously defined agent.
 *
 * @method detach
 * @param agentID {AgentId} The agentId of a previously defined agent
 * @param target {Body} The body to remove from the agent
 */
PhysicsEngine.prototype.detachFrom = function detachFrom(id, target) {
    var boundAgent = _getBoundAgent.call(this, id);
    if (boundAgent.source === target) this.detach(id);
    else {
        var targets = boundAgent.targets;
        var index = targets.indexOf(target);
        if (index > -1) targets.splice(index,1);
    }
};

/**
 * A convenience method to give the Physics Engine a clean slate of
 * agents. Preserves all added Body objects.
 *
 * @method detachAll
 */
PhysicsEngine.prototype.detachAll = function detachAll() {
    this._agents        = {};
    this._forces        = [];
    this._constraints   = [];
    this._currAgentId   = 0;
};

function _getBoundAgent(id) {
    return this._agents[id];
}

/**
 * Returns the corresponding agent given its agentId.
 *
 * @method getAgent
 * @param id {AgentId}
 */
PhysicsEngine.prototype.getAgent = function getAgent(id) {
    return _getBoundAgent.call(this, id).agent;
};

/**
 * Returns all particles that are currently managed by the Physics Engine.
 *
 * @method getParticles
 * @return particles {Array.Particles}
 */
PhysicsEngine.prototype.getParticles = function getParticles() {
    return this._particles;
};

/**
 * Returns all bodies, except particles, that are currently managed by the Physics Engine.
 *
 * @method getBodies
 * @return bodies {Array.Bodies}
 */
PhysicsEngine.prototype.getBodies = function getBodies() {
    return this._bodies;
};

/**
 * Returns all bodies that are currently managed by the Physics Engine.
 *
 * @method getBodies
 * @return bodies {Array.Bodies}
 */
PhysicsEngine.prototype.getParticlesAndBodies = function getParticlesAndBodies() {
    return this.getParticles().concat(this.getBodies());
};

/**
 * Iterates over every Particle and applies a function whose first
 * argument is the Particle
 *
 * @method forEachParticle
 * @param fn {Function} Function to iterate over
 * @param [dt] {Number} Delta time
 */
PhysicsEngine.prototype.forEachParticle = function forEachParticle(fn, dt) {
    var particles = this.getParticles();
    for (var index = 0, len = particles.length; index < len; index++)
        fn.call(this, particles[index], dt);
};

/**
 * Iterates over every Body that isn't a Particle and applies
 * a function whose first argument is the Body
 *
 * @method forEachBody
 * @param fn {Function} Function to iterate over
 * @param [dt] {Number} Delta time
 */
PhysicsEngine.prototype.forEachBody = function forEachBody(fn, dt) {
    if (!this._hasBodies) return;
    var bodies = this.getBodies();
    for (var index = 0, len = bodies.length; index < len; index++)
        fn.call(this, bodies[index], dt);
};

/**
 * Iterates over every Body and applies a function whose first
 * argument is the Body
 *
 * @method forEach
 * @param fn {Function} Function to iterate over
 * @param [dt] {Number} Delta time
 */
PhysicsEngine.prototype.forEach = function forEach(fn, dt) {
    this.forEachParticle(fn, dt);
    this.forEachBody(fn, dt);
};

function _updateForce(index) {
    var boundAgent = _getBoundAgent.call(this, this._forces[index]);
    boundAgent.agent.applyForce(boundAgent.targets, boundAgent.source);
}

function _updateForces() {
    for (var index = this._forces.length - 1; index > -1; index--)
        _updateForce.call(this, index);
}

function _updateConstraint(index, dt) {
    var boundAgent = this._agents[this._constraints[index]];
    return boundAgent.agent.applyConstraint(boundAgent.targets, boundAgent.source, dt);
}

function _updateConstraints(dt) {
    var iteration = 0;
    while (iteration < this.options.constraintSteps) {
        for (var index = this._constraints.length - 1; index > -1; index--)
            _updateConstraint.call(this, index, dt);
        iteration++;
    }
}

function _updateVelocities(particle, dt) {
    particle.integrateVelocity(dt);
}

function _updateAngularVelocities(body, dt) {
    body.integrateAngularMomentum(dt);
    body.updateAngularVelocity();
}

function _updateOrientations(body, dt) {
    body.integrateOrientation(dt);
}

function _updatePositions(particle, dt) {
    particle.integratePosition(dt);
    particle.emit('update', particle);
}

function _integrate(dt) {
    _updateForces.call(this, dt);
    this.forEach(_updateVelocities, dt);
    this.forEachBody(_updateAngularVelocities, dt);
    _updateConstraints.call(this, dt);
    this.forEachBody(_updateOrientations, dt);
    this.forEach(_updatePositions, dt);
}

function _getEnergyParticles() {
    var energy = 0.0;
    var particleEnergy = 0.0;
    this.forEach(function(particle) {
        particleEnergy = particle.getEnergy();
        energy += particleEnergy;
        if (particleEnergy < particle.sleepTolerance) particle.sleep();
    });
    return energy;
}

function _getEnergyForces() {
    var energy = 0;
    for (var index = this._forces.length - 1; index > -1; index--)
        energy += this._forces[index].getEnergy() || 0.0;
    return energy;
}

function _getEnergyConstraints() {
    var energy = 0;
    for (var index = this._constraints.length - 1; index > -1; index--)
        energy += this._constraints[index].getEnergy() || 0.0;
    return energy;
}

/**
 * Calculates the kinetic energy of all Body objects and potential energy
 * of all attached agents.
 *
 * TODO: implement.
 * @method getEnergy
 * @return energy {Number}
 */
PhysicsEngine.prototype.getEnergy = function getEnergy() {
    return _getEnergyParticles.call(this) + _getEnergyForces.call(this) + _getEnergyConstraints.call(this);
};

/**
 * Updates all Body objects managed by the physics engine over the
 * time duration since the last time step was called.
 *
 * @method step
 */
PhysicsEngine.prototype.step = function step() {
//        if (this.getEnergy() < this.options.sleepTolerance) {
//            this.sleep();
//            return;
//        };

    //set current frame's time
    var currTime = now();

    //milliseconds elapsed since last frame
    var dtFrame = currTime - this._prevTime;

    this._prevTime = currTime;

    if (dtFrame < MIN_TIME_STEP) return;
    if (dtFrame > MAX_TIME_STEP) dtFrame = MAX_TIME_STEP;

    //robust integration
//        this._buffer += dtFrame;
//        while (this._buffer > this._timestep){
//            _integrate.call(this, this._timestep);
//            this._buffer -= this._timestep;
//        };
//        _integrate.call(this, this._buffer);
//        this._buffer = 0.0;
    _integrate.call(this, TIMESTEP);

//        this.emit('update', this);
};

/**
 * Tells whether the Physics Engine is sleeping or awake.
 * @method isSleeping
 * @return {Boolean}
 */
PhysicsEngine.prototype.isSleeping = function isSleeping() {
    return this._isSleeping;
};

/**
 * Stops the Physics Engine from updating. Emits an 'end' event.
 * @method sleep
 */
PhysicsEngine.prototype.sleep = function sleep() {
    this.emit('end', this);
    this._isSleeping = true;
};

/**
 * Starts the Physics Engine from updating. Emits an 'start' event.
 * @method wake
 */
PhysicsEngine.prototype.wake = function wake() {
    this._prevTime = now();
    this.emit('start', this);
    this._isSleeping = false;
};

PhysicsEngine.prototype.emit = function emit(type, data) {
    if (this._eventHandler === null) return;
    this._eventHandler.emit(type, data);
};

PhysicsEngine.prototype.on = function on(event, fn) {
    if (this._eventHandler === null) this._eventHandler = new EventHandler();
    this._eventHandler.on(event, fn);
};

module.exports = PhysicsEngine;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/physics/PhysicsEngine.js","/../../node_modules/famous/physics")
},{"../core/EventHandler":6,"buffer":26,"oMfpAn":29}],16:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var Vector = require('../../math/Vector');
var Transform = require('../../core/Transform');
var EventHandler = require('../../core/EventHandler');
var Integrator = require('../integrators/SymplecticEuler');

/**
 * A point body that is controlled by the Physics Engine. A particle has
 *   position and velocity states that are updated by the Physics Engine.
 *   Ultimately, a particle is a _special type of modifier, and can be added to
 *   the Famous render tree like any other modifier.
 *
 * @constructor
 * @class Particle
 * @uses EventHandler
 * @uses Modifier
 * @extensionfor Body
 * @param {Options} [options] An object of configurable options.
 * @param {Array} [options.position] The position of the particle.
 * @param {Array} [options.velocity] The velocity of the particle.
 * @param {Number} [options.mass] The mass of the particle.
 * @param {Hexadecimal} [options.axis] The axis a particle can move along. Can be bitwise ORed e.g., Particle.AXES.X, Particle.AXES.X | Particle.AXES.Y
 *
 */
 function Particle(options) {
    options = options || {};

    // registers
    this.position = new Vector();
    this.velocity = new Vector();
    this.force    = new Vector();

    var defaults  = Particle.DEFAULT_OPTIONS;

    // set vectors
    this.setPosition(options.position || defaults.position);
    this.setVelocity(options.velocity || defaults.velocity);
    this.force.set(options.force || [0,0,0]);

    // set scalars
    this.mass = (options.mass !== undefined)
        ? options.mass
        : defaults.mass;

    this.axis = (options.axis !== undefined)
        ? options.axis
        : defaults.axis;

    this.inverseMass = 1 / this.mass;

    // state variables
    this._isSleeping     = false;
    this._engine         = null;
    this._eventOutput    = null;
    this._positionGetter = null;

    this.transform = Transform.identity.slice();

    // cached _spec
    this._spec = {
        transform : this.transform,
        target    : null
    };
}

Particle.DEFAULT_OPTIONS = {
    position : [0,0,0],
    velocity : [0,0,0],
    mass : 1,
    axis : undefined
};

/**
 * Kinetic energy threshold needed to update the body
 *
 * @property SLEEP_TOLERANCE
 * @type Number
 * @static
 * @default 1e-7
 */
Particle.SLEEP_TOLERANCE = 1e-7;

/**
 * Axes by which a body can translate
 *
 * @property AXES
 * @type Hexadecimal
 * @static
 * @default 1e-7
 */
Particle.AXES = {
    X : 0x00, // hexadecimal for 0
    Y : 0x01, // hexadecimal for 1
    Z : 0x02  // hexadecimal for 2
};

// Integrator for updating the particle's state
// TODO: make this a singleton
Particle.INTEGRATOR = new Integrator();

//Catalogue of outputted events
var _events = {
    start  : 'start',
    update : 'update',
    end    : 'end'
};

// Cached timing function
var now = (function() {
    return Date.now;
})();

/**
 * Stops the particle from updating
 * @method sleep
 */
Particle.prototype.sleep = function sleep() {
    if (this._isSleeping) return;
    this.emit(_events.end, this);
    this._isSleeping = true;
};

/**
 * Starts the particle update
 * @method wake
 */
Particle.prototype.wake = function wake() {
    if (!this._isSleeping) return;
    this.emit(_events.start, this);
    this._isSleeping = false;
    this._prevTime = now();
};

/**
 * @attribute isBody
 * @type Boolean
 * @static
 */
Particle.prototype.isBody = false;

/**
 * Basic setter for position
 * @method getPosition
 * @param position {Array|Vector}
 */
Particle.prototype.setPosition = function setPosition(position) {
    this.position.set(position);
};

/**
 * 1-dimensional setter for position
 * @method setPosition1D
 * @param value {Number}
 */
Particle.prototype.setPosition1D = function setPosition1D(x) {
    this.position.x = x;
};

/**
 * Basic getter function for position
 * @method getPosition
 * @return position {Array}
 */
Particle.prototype.getPosition = function getPosition() {
    if (this._positionGetter instanceof Function)
        this.setPosition(this._positionGetter());

    this._engine.step();

    return this.position.get();
};

/**
 * 1-dimensional getter for position
 * @method getPosition1D
 * @return value {Number}
 */
Particle.prototype.getPosition1D = function getPosition1D() {
    this._engine.step();
    return this.position.x;
};

/**
 * Defines the position from outside the Physics Engine
 * @method positionFrom
 * @param positionGetter {Function}
 */
Particle.prototype.positionFrom = function positionFrom(positionGetter) {
    this._positionGetter = positionGetter;
};

/**
 * Basic setter function for velocity Vector
 * @method setVelocity
 * @function
 */
Particle.prototype.setVelocity = function setVelocity(velocity) {
    this.velocity.set(velocity);
    this.wake();
};

/**
 * 1-dimensional setter for velocity
 * @method setVelocity1D
 * @param velocity {Number}
 */
Particle.prototype.setVelocity1D = function setVelocity1D(x) {
    this.velocity.x = x;
    this.wake();
};

/**
 * Basic getter function for velocity Vector
 * @method getVelocity
 * @return velocity {Array}
 */
Particle.prototype.getVelocity = function getVelocity() {
    return this.velocity.get();
};

/**
 * 1-dimensional getter for velocity
 * @method getVelocity1D
 * @return velocity {Number}
 */
Particle.prototype.getVelocity1D = function getVelocity1D() {
    return this.velocity.x;
};

/**
 * Basic setter function for mass quantity
 * @method setMass
 * @param mass {Number} mass
 */
Particle.prototype.setMass = function setMass(mass) {
    this.mass = mass;
    this.inverseMass = 1 / mass;
};

/**
 * Basic getter function for mass quantity
 * @method getMass
 * @return mass {Number}
 */
Particle.prototype.getMass = function getMass() {
    return this.mass;
};

/**
 * Reset position and velocity
 * @method reset
 * @param position {Array|Vector}
 * @param velocity {Array|Vector}
 */
Particle.prototype.reset = function reset(position, velocity) {
    this.setPosition(position || [0,0,0]);
    this.setVelocity(velocity || [0,0,0]);
};

/**
 * Add force vector to existing internal force Vector
 * @method applyForce
 * @param force {Vector}
 */
Particle.prototype.applyForce = function applyForce(force) {
    if (force.isZero()) return;
    this.force.add(force).put(this.force);
    this.wake();
};

/**
 * Add impulse (change in velocity) Vector to this Vector's velocity.
 * @method applyImpulse
 * @param impulse {Vector}
 */
Particle.prototype.applyImpulse = function applyImpulse(impulse) {
    if (impulse.isZero()) return;
    var velocity = this.velocity;
    velocity.add(impulse.mult(this.inverseMass)).put(velocity);
};

/**
 * Update a particle's velocity from its force accumulator
 * @method integrateVelocity
 * @param dt {Number} Time differential
 */
Particle.prototype.integrateVelocity = function integrateVelocity(dt) {
    Particle.INTEGRATOR.integrateVelocity(this, dt);
};

/**
 * Update a particle's position from its velocity
 * @method integratePosition
 * @param dt {Number} Time differential
 */
Particle.prototype.integratePosition = function integratePosition(dt) {
    Particle.INTEGRATOR.integratePosition(this, dt);
};

/**
 * Update the position and velocity of the particle
 * @method _integrate
 * @protected
 * @param dt {Number} Time differential
 */
Particle.prototype._integrate = function _integrate(dt) {
    this.integrateVelocity(dt);
    this.integratePosition(dt);
};

/**
 * Get kinetic energy of the particle.
 * @method getEnergy
 * @function
 */
Particle.prototype.getEnergy = function getEnergy() {
    return 0.5 * this.mass * this.velocity.normSquared();
};

/**
 * Generate transform from the current position state
 * @method getTransform
 * @return Transform {Transform}
 */
Particle.prototype.getTransform = function getTransform() {
    this._engine.step();

    var position = this.position;
    var axis = this.axis;
    var transform = this.transform;

    if (axis !== undefined) {
        if (axis & ~Particle.AXES.X) {
            position.x = 0;
        }
        if (axis & ~Particle.AXES.Y) {
            position.y = 0;
        }
        if (axis & ~Particle.AXES.Z) {
            position.z = 0;
        }
    }

    transform[12] = position.x;
    transform[13] = position.y;
    transform[14] = position.z;

    return transform;
};

/**
 * The modify interface of a Modifier
 * @method modify
 * @param target {Spec}
 * @return Spec {Spec}
 */
Particle.prototype.modify = function modify(target) {
    var _spec = this._spec;
    _spec.transform = this.getTransform();
    _spec.target = target;
    return _spec;
};

// private
function _createEventOutput() {
    this._eventOutput = new EventHandler();
    this._eventOutput.bindThis(this);
    //overrides on/removeListener/pipe/unpipe methods
    EventHandler.setOutputHandler(this, this._eventOutput);
}

Particle.prototype.emit = function emit(type, data) {
    if (!this._eventOutput) return;
    this._eventOutput.emit(type, data);
};

Particle.prototype.on = function on() {
    _createEventOutput.call(this);
    return this.on.apply(this, arguments);
};
Particle.prototype.removeListener = function removeListener() {
    _createEventOutput.call(this);
    return this.removeListener.apply(this, arguments);
};
Particle.prototype.pipe = function pipe() {
    _createEventOutput.call(this);
    return this.pipe.apply(this, arguments);
};
Particle.prototype.unpipe = function unpipe() {
    _createEventOutput.call(this);
    return this.unpipe.apply(this, arguments);
};

module.exports = Particle;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/physics/bodies/Particle.js","/../../node_modules/famous/physics/bodies")
},{"../../core/EventHandler":6,"../../core/Transform":12,"../../math/Vector":13,"../integrators/SymplecticEuler":19,"buffer":26,"oMfpAn":29}],17:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var Vector = require('../../math/Vector');
var EventHandler = require('../../core/EventHandler');

/**
 * Force base class.
 *
 * @class Force
 * @uses EventHandler
 * @constructor
 */
function Force(force) {
    this.force = new Vector(force);
    this._energy = 0.0;
    this._eventOutput = null;
}

/**
 * Basic setter for options
 *
 * @method setOptions
 * @param options {Objects}
 */
Force.prototype.setOptions = function setOptions(options) {
    for (var key in options) this.options[key] = options[key];
};

/**
 * Adds a force to a physics body's force accumulator.
 *
 * @method applyForce
 * @param body {Body}
 */
Force.prototype.applyForce = function applyForce(body) {
    body.applyForce(this.force);
};

/**
 * Getter for a force's potential energy.
 *
 * @method getEnergy
 * @return energy {Number}
 */
Force.prototype.getEnergy = function getEnergy() {
    return this._energy;
};

/*
 * Setter for a force's potential energy.
 *
 * @method setEnergy
 * @param energy {Number}
 */
Force.prototype.setEnergy = function setEnergy(energy) {
    this._energy = energy;
};

function _createEventOutput() {
    this._eventOutput = new EventHandler();
    this._eventOutput.bindThis(this);
    EventHandler.setOutputHandler(this, this._eventOutput);
}

Force.prototype.on = function on() {
    _createEventOutput.call(this);
    return this.on.apply(this, arguments);
};
Force.prototype.addListener = function addListener() {
    _createEventOutput.call(this);
    return this.addListener.apply(this, arguments);
};
Force.prototype.pipe = function pipe() {
    _createEventOutput.call(this);
    return this.pipe.apply(this, arguments);
};
Force.prototype.removeListener = function removeListener() {
    return this.removeListener.apply(this, arguments);
};
Force.prototype.unpipe = function unpipe() {
    return this.unpipe.apply(this, arguments);
};

module.exports = Force;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/physics/forces/Force.js","/../../node_modules/famous/physics/forces")
},{"../../core/EventHandler":6,"../../math/Vector":13,"buffer":26,"oMfpAn":29}],18:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var Force = require('./Force');
var Vector = require('../../math/Vector');

/**
 *  A force that moves a physics body to a location with a spring motion.
 *    The body can be moved to another physics body, or an anchor point.
 *
 *  @class Spring
 *  @constructor
 *  @extends Force
 *  @param {Object} options options to set on drag
 */
function Spring(options) {
    this.options = Object.create(this.constructor.DEFAULT_OPTIONS);
    if (options) this.setOptions(options);

    //registers
    this.disp = new Vector(0,0,0);

    _init.call(this);
    Force.call(this);
}

Spring.prototype = Object.create(Force.prototype);
Spring.prototype.constructor = Spring;

/** @const */ var pi = Math.PI;

/**
 * @property Spring.FORCE_FUNCTIONS
 * @type Object
 * @protected
 * @static
 */
Spring.FORCE_FUNCTIONS = {

    /**
     * A FENE (Finitely Extensible Nonlinear Elastic) spring force
     *      see: http://en.wikipedia.org/wiki/FENE
     * @attribute FENE
     * @type Function
     * @param {Number} dist current distance target is from source body
     * @param {Number} rMax maximum range of influence
     * @return {Number} unscaled force
     */
    FENE : function(dist, rMax) {
        var rMaxSmall = rMax * .99;
        var r = Math.max(Math.min(dist, rMaxSmall), -rMaxSmall);
        return r / (1 - r * r/(rMax * rMax));
    },

    /**
     * A Hookean spring force, linear in the displacement
     *      see: http://en.wikipedia.org/wiki/FENE
     * @attribute FENE
     * @type Function
     * @param {Number} dist current distance target is from source body
     * @return {Number} unscaled force
     */
    HOOK : function(dist) {
        return dist;
    }
};

/**
 * @property Spring.DEFAULT_OPTIONS
 * @type Object
 * @protected
 * @static
 */
Spring.DEFAULT_OPTIONS = {

    /**
     * The amount of time in milliseconds taken for one complete oscillation
     * when there is no damping
     *    Range : [150, Infinity]
     * @attribute period
     * @type Number
     * @default 300
     */
    period        : 300,

    /**
     * The damping of the spring.
     *    Range : [0, 1]
     *    0 = no damping, and the spring will oscillate forever
     *    1 = critically damped (the spring will never oscillate)
     * @attribute dampingRatio
     * @type Number
     * @default 0.1
     */
    dampingRatio : 0.1,

    /**
     * The rest length of the spring
     *    Range : [0, Infinity]
     * @attribute length
     * @type Number
     * @default 0
     */
    length : 0,

    /**
     * The maximum length of the spring (for a FENE spring)
     *    Range : [0, Infinity]
     * @attribute length
     * @type Number
     * @default Infinity
     */
    maxLength : Infinity,

    /**
     * The location of the spring's anchor, if not another physics body
     *
     * @attribute anchor
     * @type Array
     * @optional
     */
    anchor : undefined,

    /**
     * The type of spring force
     * @attribute forceFunction
     * @type Function
     */
    forceFunction : Spring.FORCE_FUNCTIONS.HOOK
};

function _setForceFunction(fn) {
    this.forceFunction = fn;
}

function _calcStiffness() {
    var options = this.options;
    options.stiffness = Math.pow(2 * pi / options.period, 2);
}

function _calcDamping() {
    var options = this.options;
    options.damping = 4 * pi * options.dampingRatio / options.period;
}

function _calcEnergy(strength, dist) {
    return 0.5 * strength * dist * dist;
}

function _init() {
    _setForceFunction.call(this, this.options.forceFunction);
    _calcStiffness.call(this);
    _calcDamping.call(this);
}

/**
 * Basic options setter
 *
 * @method setOptions
 * @param options {Objects}
 */
Spring.prototype.setOptions = function setOptions(options) {
    if (options.anchor !== undefined) {
        if (options.anchor.position instanceof Vector) this.options.anchor = options.anchor.position;
        if (options.anchor   instanceof Vector)  this.options.anchor = options.anchor;
        if (options.anchor   instanceof Array)  this.options.anchor = new Vector(options.anchor);
    }
    if (options.period !== undefined) this.options.period = options.period;
    if (options.dampingRatio !== undefined) this.options.dampingRatio = options.dampingRatio;
    if (options.length !== undefined) this.options.length = options.length;
    if (options.forceFunction !== undefined) this.options.forceFunction = options.forceFunction;
    if (options.maxLength !== undefined) this.options.maxLength = options.maxLength;

    _init.call(this);
};

/**
 * Adds a spring force to a physics body's force accumulator.
 *
 * @method applyForce
 * @param targets {Array.Body} Array of bodies to apply force to.
 */
Spring.prototype.applyForce = function applyForce(targets, source) {
    var force        = this.force;
    var disp         = this.disp;
    var options      = this.options;

    var stiffness    = options.stiffness;
    var damping      = options.damping;
    var restLength   = options.length;
    var lMax         = options.maxLength;
    var anchor       = options.anchor || source.position;

    for (var i = 0; i < targets.length; i++) {
        var target = targets[i];
        var p2 = target.position;
        var v2 = target.velocity;

        anchor.sub(p2).put(disp);
        var dist = disp.norm() - restLength;

        if (dist === 0) return;

        //if dampingRatio specified, then override strength and damping
        var m      = target.mass;
        stiffness *= m;
        damping   *= m;

        disp.normalize(stiffness * this.forceFunction(dist, lMax))
            .put(force);

        if (damping)
            if (source) force.add(v2.sub(source.velocity).mult(-damping)).put(force);
            else force.add(v2.mult(-damping)).put(force);

        target.applyForce(force);
        if (source) source.applyForce(force.mult(-1));

        this.setEnergy(_calcEnergy(stiffness, dist));
    }
};

/**
 * Calculates the potential energy of the spring.
 *
 * @method getEnergy
 * @param target {Body}     The physics body attached to the spring
 * @return energy {Number}
 */
Spring.prototype.getEnergy = function getEnergy(target) {
    var options        = this.options;
    var restLength  = options.length;
    var anchor      = options.anchor;
    var strength    = options.stiffness;

    var dist = anchor.sub(target.position).norm() - restLength;
    return 0.5 * strength * dist * dist;
};

/**
 * Sets the anchor to a new position
 *
 * @method setAnchor
 * @param anchor {Array}    New anchor of the spring
 */
Spring.prototype.setAnchor = function setAnchor(anchor) {
    if (!this.options.anchor) this.options.anchor = new Vector();
    this.options.anchor.set(anchor);
};

module.exports = Spring;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/physics/forces/Spring.js","/../../node_modules/famous/physics/forces")
},{"../../math/Vector":13,"./Force":17,"buffer":26,"oMfpAn":29}],19:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var OptionsManager = require('../../core/OptionsManager');

/**
 * Ordinary Differential Equation (ODE) Integrator.
 * Manages updating a physics body's state over time.
 *
 *  p = position, v = velocity, m = mass, f = force, dt = change in time
 *
 *      v <- v + dt * f / m
 *      p <- p + dt * v
 *
 *  q = orientation, w = angular velocity, L = angular momentum
 *
 *      L <- L + dt * t
 *      q <- q + dt/2 * q * w
 *
 * @class SymplecticEuler
 * @constructor
 * @param {Object} options Options to set
 */
function SymplecticEuler(options) {
    this.options = Object.create(SymplecticEuler.DEFAULT_OPTIONS);
    this._optionsManager = new OptionsManager(this.options);

    if (options) this.setOptions(options);
}

/**
 * @property SymplecticEuler.DEFAULT_OPTIONS
 * @type Object
 * @protected
 * @static
 */
SymplecticEuler.DEFAULT_OPTIONS = {

    /**
     * The maximum velocity of a physics body
     *      Range : [0, Infinity]
     * @attribute velocityCap
     * @type Number
     */

    velocityCap : undefined,

    /**
     * The maximum angular velocity of a physics body
     *      Range : [0, Infinity]
     * @attribute angularVelocityCap
     * @type Number
     */
    angularVelocityCap : undefined
};

/*
 * Setter for options
 *
 * @method setOptions
 * @param {Object} options
 */
SymplecticEuler.prototype.setOptions = function setOptions(options) {
    this._optionsManager.patch(options);
};

/*
 * Getter for options
 *
 * @method getOptions
 * @return {Object} options
 */
SymplecticEuler.prototype.getOptions = function getOptions() {
    return this._optionsManager.value();
};

/*
 * Updates the velocity of a physics body from its accumulated force.
 *      v <- v + dt * f / m
 *
 * @method integrateVelocity
 * @param {Body} physics body
 * @param {Number} dt delta time
 */
SymplecticEuler.prototype.integrateVelocity = function integrateVelocity(body, dt) {
    var v = body.velocity;
    var w = body.inverseMass;
    var f = body.force;

    if (f.isZero()) return;

    v.add(f.mult(dt * w)).put(v);
    f.clear();
};

/*
 * Updates the position of a physics body from its velocity.
 *      p <- p + dt * v
 *
 * @method integratePosition
 * @param {Body} physics body
 * @param {Number} dt delta time
 */
SymplecticEuler.prototype.integratePosition = function integratePosition(body, dt) {
    var p = body.position;
    var v = body.velocity;

    if (this.options.velocityCap) v.cap(this.options.velocityCap).put(v);
    p.add(v.mult(dt)).put(p);
};

/*
 * Updates the angular momentum of a physics body from its accumuled torque.
 *      L <- L + dt * t
 *
 * @method integrateAngularMomentum
 * @param {Body} physics body (except a particle)
 * @param {Number} dt delta time
 */
SymplecticEuler.prototype.integrateAngularMomentum = function integrateAngularMomentum(body, dt) {
    var L = body.angularMomentum;
    var t = body.torque;

    if (t.isZero()) return;

    if (this.options.angularVelocityCap) t.cap(this.options.angularVelocityCap).put(t);
    L.add(t.mult(dt)).put(L);
    t.clear();
};

/*
 * Updates the orientation of a physics body from its angular velocity.
 *      q <- q + dt/2 * q * w
 *
 * @method integrateOrientation
 * @param {Body} physics body (except a particle)
 * @param {Number} dt delta time
 */
SymplecticEuler.prototype.integrateOrientation = function integrateOrientation(body, dt) {
    var q = body.orientation;
    var w = body.angularVelocity;

    if (w.isZero()) return;
    q.add(q.multiply(w).scalarMultiply(0.5 * dt)).put(q);
//        q.normalize.put(q);
};

module.exports = SymplecticEuler;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/physics/integrators/SymplecticEuler.js","/../../node_modules/famous/physics/integrators")
},{"../../core/OptionsManager":8,"buffer":26,"oMfpAn":29}],20:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var Utility = require('../utilities/Utility');

/**
 * Transition meta-method to support transitioning multiple
 *   values with scalar-only methods.
 *
 *
 * @class MultipleTransition
 * @constructor
 *
 * @param {Object} method Transionable class to multiplex
 */
function MultipleTransition(method) {
    this.method = method;
    this._instances = [];
    this.state = [];
}

MultipleTransition.SUPPORTS_MULTIPLE = true;

/**
 * Get the state of each transition.
 *
 * @method get
 *
 * @return state {Number|Array} state array
 */
MultipleTransition.prototype.get = function get() {
    for (var i = 0; i < this._instances.length; i++) {
        this.state[i] = this._instances[i].get();
    }
    return this.state;
};

/**
 * Set the end states with a shared transition, with optional callback.
 *
 * @method set
 *
 * @param {Number|Array} endState Final State.  Use a multi-element argument for multiple transitions.
 * @param {Object} transition Transition definition, shared among all instances
 * @param {Function} callback called when all endStates have been reached.
 */
MultipleTransition.prototype.set = function set(endState, transition, callback) {
    var _allCallback = Utility.after(endState.length, callback);
    for (var i = 0; i < endState.length; i++) {
        if (!this._instances[i]) this._instances[i] = new (this.method)();
        this._instances[i].set(endState[i], transition, _allCallback);
    }
};

/**
 * Reset all transitions to start state.
 *
 * @method reset
 *
 * @param  {Number|Array} startState Start state
 */
MultipleTransition.prototype.reset = function reset(startState) {
    for (var i = 0; i < startState.length; i++) {
        if (!this._instances[i]) this._instances[i] = new (this.method)();
        this._instances[i].reset(startState[i]);
    }
};

module.exports = MultipleTransition;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/transitions/MultipleTransition.js","/../../node_modules/famous/transitions")
},{"../utilities/Utility":25,"buffer":26,"oMfpAn":29}],21:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

/*global console*/

var PE = require('../physics/PhysicsEngine');
var Particle = require('../physics/bodies/Particle');
var Spring = require('../physics/forces/Spring');
var Vector = require('../math/Vector');

/**
 * SpringTransition is a method of transitioning between two values (numbers,
 * or arrays of numbers) with a bounce. The transition will overshoot the target
 * state depending on the parameters of the transition.
 *
 * @class SpringTransition
 * @constructor
 *
 * @param {Number|Array} [state=0] Initial state
 */
function SpringTransition(state) {
    state = state || 0;
    this.endState  = new Vector(state);
    this.initState = new Vector();

    this._dimensions       = undefined;
    this._restTolerance    = 1e-10;
    this._absRestTolerance = this._restTolerance;
    this._callback         = undefined;

    this.PE       = new PE();
    this.spring   = new Spring({anchor : this.endState});
    this.particle = new Particle();

    this.PE.addBody(this.particle);
    this.PE.attach(this.spring, this.particle);
}

SpringTransition.SUPPORTS_MULTIPLE = 3;

/**
 * @property SpringTransition.DEFAULT_OPTIONS
 * @type Object
 * @protected
 * @static
 */
SpringTransition.DEFAULT_OPTIONS = {

    /**
     * The amount of time in milliseconds taken for one complete oscillation
     * when there is no damping
     *    Range : [0, Infinity]
     *
     * @attribute period
     * @type Number
     * @default 300
     */
    period : 300,

    /**
     * The damping of the snap.
     *    Range : [0, 1]
     *    0 = no damping, and the spring will oscillate forever
     *    1 = critically damped (the spring will never oscillate)
     *
     * @attribute dampingRatio
     * @type Number
     * @default 0.5
     */
    dampingRatio : 0.5,

    /**
     * The initial velocity of the transition.
     *
     * @attribute velocity
     * @type Number|Array
     * @default 0
     */
    velocity : 0
};

function _getEnergy() {
    return this.particle.getEnergy() + this.spring.getEnergy(this.particle);
}

function _setParticlePosition(p) {
    this.particle.setPosition(p);
}

function _setParticleVelocity(v) {
    this.particle.setVelocity(v);
}

function _getParticlePosition() {
    return (this._dimensions === 0)
        ? this.particle.getPosition1D()
        : this.particle.getPosition();
}

function _getParticleVelocity() {
    return (this._dimensions === 0)
        ? this.particle.getVelocity1D()
        : this.particle.getVelocity();
}

function _setCallback(callback) {
    this._callback = callback;
}

function _wake() {
    this.PE.wake();
}

function _sleep() {
    this.PE.sleep();
}

function _update() {
    if (this.PE.isSleeping()) {
        if (this._callback) {
            var cb = this._callback;
            this._callback = undefined;
            cb();
        }
        return;
    }

    if (_getEnergy.call(this) < this._absRestTolerance) {
        _setParticlePosition.call(this, this.endState);
        _setParticleVelocity.call(this, [0,0,0]);
        _sleep.call(this);
    }
}

function _setupDefinition(definition) {
    // TODO fix no-console error
    /* eslint no-console: 0 */
    var defaults = SpringTransition.DEFAULT_OPTIONS;
    if (definition.period === undefined)       definition.period       = defaults.period;
    if (definition.dampingRatio === undefined) definition.dampingRatio = defaults.dampingRatio;
    if (definition.velocity === undefined)     definition.velocity     = defaults.velocity;

    if (definition.period < 150) {
        definition.period = 150;
        console.warn('The period of a SpringTransition is capped at 150 ms. Use a SnapTransition for faster transitions');
    }

    //setup spring
    this.spring.setOptions({
        period       : definition.period,
        dampingRatio : definition.dampingRatio
    });

    //setup particle
    _setParticleVelocity.call(this, definition.velocity);
}

function _setAbsoluteRestTolerance() {
    var distance = this.endState.sub(this.initState).normSquared();
    this._absRestTolerance = (distance === 0)
        ? this._restTolerance
        : this._restTolerance * distance;
}

function _setTarget(target) {
    this.endState.set(target);
    _setAbsoluteRestTolerance.call(this);
}

/**
 * Resets the position and velocity
 *
 * @method reset
 *
 * @param {Number|Array.Number} pos positional state
 * @param {Number|Array} vel velocity
 */
SpringTransition.prototype.reset = function reset(pos, vel) {
    this._dimensions = (pos instanceof Array)
        ? pos.length
        : 0;

    this.initState.set(pos);
    _setParticlePosition.call(this, pos);
    _setTarget.call(this, pos);
    if (vel) _setParticleVelocity.call(this, vel);
    _setCallback.call(this, undefined);
};

/**
 * Getter for velocity
 *
 * @method getVelocity
 *
 * @return {Number|Array} velocity
 */
SpringTransition.prototype.getVelocity = function getVelocity() {
    return _getParticleVelocity.call(this);
};

/**
 * Setter for velocity
 *
 * @method setVelocity
 *
 * @return {Number|Array} velocity
 */
SpringTransition.prototype.setVelocity = function setVelocity(v) {
    this.call(this, _setParticleVelocity(v));
};

/**
 * Detects whether a transition is in progress
 *
 * @method isActive
 *
 * @return {Boolean}
 */
SpringTransition.prototype.isActive = function isActive() {
    return !this.PE.isSleeping();
};

/**
 * Halt the transition
 *
 * @method halt
 */
SpringTransition.prototype.halt = function halt() {
    this.set(this.get());
};

/**
 * Get the current position of the transition
 *
 * @method get
 *
 * @return {Number|Array} state
 */
SpringTransition.prototype.get = function get() {
    _update.call(this);
    return _getParticlePosition.call(this);
};

/**
 * Set the end position and transition, with optional callback on completion.
 *
 * @method set
 *
 * @param  {Number|Array} endState Final state
 * @param {Object}  definition  Transition definition
 * @param  {Function} callback Callback
 */
SpringTransition.prototype.set = function set(endState, definition, callback) {
    if (!definition) {
        this.reset(endState);
        if (callback) callback();
        return;
    }

    this._dimensions = (endState instanceof Array)
        ? endState.length
        : 0;

    _wake.call(this);
    _setupDefinition.call(this, definition);
    _setTarget.call(this, endState);
    _setCallback.call(this, callback);
};

module.exports = SpringTransition;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/transitions/SpringTransition.js","/../../node_modules/famous/transitions")
},{"../math/Vector":13,"../physics/PhysicsEngine":15,"../physics/bodies/Particle":16,"../physics/forces/Spring":18,"buffer":26,"oMfpAn":29}],22:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var MultipleTransition = require('./MultipleTransition');
var TweenTransition = require('./TweenTransition');

/**
 * A state maintainer for a smooth transition between
 *    numerically-specified states. Example numeric states include floats or
 *    Transform objects.
 *
 * An initial state is set with the constructor or set(startState). A
 *    corresponding end state and transition are set with set(endState,
 *    transition). Subsequent calls to set(endState, transition) begin at
 *    the last state. Calls to get(timestamp) provide the interpolated state
 *    along the way.
 *
 * Note that there is no event loop here - calls to get() are the only way
 *    to find state projected to the current (or provided) time and are
 *    the only way to trigger callbacks. Usually this kind of object would
 *    be part of the render() path of a visible component.
 *
 * @class Transitionable
 * @constructor
 * @param {number|Array.Number|Object.<number|string, number>} start
 *    beginning state
 */
function Transitionable(start) {
    this.currentAction = null;
    this.actionQueue = [];
    this.callbackQueue = [];

    this.state = 0;
    this.velocity = undefined;
    this._callback = undefined;
    this._engineInstance = null;
    this._currentMethod = null;

    this.set(start);
}

var transitionMethods = {};

Transitionable.registerMethod = function registerMethod(name, engineClass) {
    if (!(name in transitionMethods)) {
        transitionMethods[name] = engineClass;
        return true;
    }
    else return false;
};

Transitionable.unregisterMethod = function unregisterMethod(name) {
    if (name in transitionMethods) {
        delete transitionMethods[name];
        return true;
    }
    else return false;
};

function _loadNext() {
    if (this._callback) {
        var callback = this._callback;
        this._callback = undefined;
        callback();
    }
    if (this.actionQueue.length <= 0) {
        this.set(this.get()); // no update required
        return;
    }
    this.currentAction = this.actionQueue.shift();
    this._callback = this.callbackQueue.shift();

    var method = null;
    var endValue = this.currentAction[0];
    var transition = this.currentAction[1];
    if (transition instanceof Object && transition.method) {
        method = transition.method;
        if (typeof method === 'string') method = transitionMethods[method];
    }
    else {
        method = TweenTransition;
    }

    if (this._currentMethod !== method) {
        if (!(endValue instanceof Object) || method.SUPPORTS_MULTIPLE === true || endValue.length <= method.SUPPORTS_MULTIPLE) {
            this._engineInstance = new method();
        }
        else {
            this._engineInstance = new MultipleTransition(method);
        }
        this._currentMethod = method;
    }

    this._engineInstance.reset(this.state, this.velocity);
    if (this.velocity !== undefined) transition.velocity = this.velocity;
    this._engineInstance.set(endValue, transition, _loadNext.bind(this));
}

/**
 * Add transition to end state to the queue of pending transitions. Special
 *    Use: calling without a transition resets the object to that state with
 *    no pending actions
 *
 * @method set
 *
 * @param {number|FamousMatrix|Array.Number|Object.<number, number>} endState
 *    end state to which we interpolate
 * @param {transition=} transition object of type {duration: number, curve:
 *    f[0,1] -> [0,1] or name}. If transition is omitted, change will be
 *    instantaneous.
 * @param {function()=} callback Zero-argument function to call on observed
 *    completion (t=1)
 */
Transitionable.prototype.set = function set(endState, transition, callback) {
    if (!transition) {
        this.reset(endState);
        if (callback) callback();
        return this;
    }

    var action = [endState, transition];
    this.actionQueue.push(action);
    this.callbackQueue.push(callback);
    if (!this.currentAction) _loadNext.call(this);
    return this;
};

/**
 * Cancel all transitions and reset to a stable state
 *
 * @method reset
 *
 * @param {number|Array.Number|Object.<number, number>} startState
 *    stable state to set to
 */
Transitionable.prototype.reset = function reset(startState, startVelocity) {
    this._currentMethod = null;
    this._engineInstance = null;
    this._callback = undefined;
    this.state = startState;
    this.velocity = startVelocity;
    this.currentAction = null;
    this.actionQueue = [];
    this.callbackQueue = [];
};

/**
 * Add delay action to the pending action queue queue.
 *
 * @method delay
 *
 * @param {number} duration delay time (ms)
 * @param {function} callback Zero-argument function to call on observed
 *    completion (t=1)
 */
Transitionable.prototype.delay = function delay(duration, callback) {
    this.set(this.get(), {duration: duration,
        curve: function() {
            return 0;
        }},
        callback
    );
};

/**
 * Get interpolated state of current action at provided time. If the last
 *    action has completed, invoke its callback.
 *
 * @method get
 *
 * @param {number=} timestamp Evaluate the curve at a normalized version of this
 *    time. If omitted, use current time. (Unix epoch time)
 * @return {number|Object.<number|string, number>} beginning state
 *    interpolated to this point in time.
 */
Transitionable.prototype.get = function get(timestamp) {
    if (this._engineInstance) {
        if (this._engineInstance.getVelocity)
            this.velocity = this._engineInstance.getVelocity();
        this.state = this._engineInstance.get(timestamp);
    }
    return this.state;
};

/**
 * Is there at least one action pending completion?
 *
 * @method isActive
 *
 * @return {boolean}
 */
Transitionable.prototype.isActive = function isActive() {
    return !!this.currentAction;
};

/**
 * Halt transition at current state and erase all pending actions.
 *
 * @method halt
 */
Transitionable.prototype.halt = function halt() {
    this.set(this.get());
};

module.exports = Transitionable;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/transitions/Transitionable.js","/../../node_modules/famous/transitions")
},{"./MultipleTransition":20,"./TweenTransition":24,"buffer":26,"oMfpAn":29}],23:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

var Transitionable = require('./Transitionable');
var Transform = require('../core/Transform');
var Utility = require('../utilities/Utility');

/**
 * A class for transitioning the state of a Transform by transitioning
 * its translate, scale, skew and rotate components independently.
 *
 * @class TransitionableTransform
 * @constructor
 *
 * @param [transform=Transform.identity] {Transform} The initial transform state
 */
function TransitionableTransform(transform) {
    this._final = Transform.identity.slice();
    this.translate = new Transitionable([0, 0, 0]);
    this.rotate = new Transitionable([0, 0, 0]);
    this.skew = new Transitionable([0, 0, 0]);
    this.scale = new Transitionable([1, 1, 1]);

    if (transform) this.set(transform);
}

function _build() {
    return Transform.build({
        translate: this.translate.get(),
        rotate: this.rotate.get(),
        skew: this.skew.get(),
        scale: this.scale.get()
    });
}

/**
 * An optimized way of setting only the translation component of a Transform
 *
 * @method setTranslate
 * @chainable
 *
 * @param translate {Array}     New translation state
 * @param [transition] {Object} Transition definition
 * @param [callback] {Function} Callback
 * @return {TransitionableTransform}
 */
TransitionableTransform.prototype.setTranslate = function setTranslate(translate, transition, callback) {
    this.translate.set(translate, transition, callback);
    this._final = this._final.slice();
    this._final[12] = translate[0];
    this._final[13] = translate[1];
    if (translate[2] !== undefined) this._final[14] = translate[2];
    return this;
};

/**
 * An optimized way of setting only the scale component of a Transform
 *
 * @method setScale
 * @chainable
 *
 * @param scale {Array}         New scale state
 * @param [transition] {Object} Transition definition
 * @param [callback] {Function} Callback
 * @return {TransitionableTransform}
 */
TransitionableTransform.prototype.setScale = function setScale(scale, transition, callback) {
    this.scale.set(scale, transition, callback);
    this._final = this._final.slice();
    this._final[0] = scale[0];
    this._final[5] = scale[1];
    if (scale[2] !== undefined) this._final[10] = scale[2];
    return this;
};

/**
 * An optimized way of setting only the rotational component of a Transform
 *
 * @method setRotate
 * @chainable
 *
 * @param eulerAngles {Array}   Euler angles for new rotation state
 * @param [transition] {Object} Transition definition
 * @param [callback] {Function} Callback
 * @return {TransitionableTransform}
 */
TransitionableTransform.prototype.setRotate = function setRotate(eulerAngles, transition, callback) {
    this.rotate.set(eulerAngles, transition, callback);
    this._final = _build.call(this);
    this._final = Transform.build({
        translate: this.translate.get(),
        rotate: eulerAngles,
        scale: this.scale.get(),
        skew: this.skew.get()
    });
    return this;
};

/**
 * An optimized way of setting only the skew component of a Transform
 *
 * @method setSkew
 * @chainable
 *
 * @param skewAngles {Array}    New skew state
 * @param [transition] {Object} Transition definition
 * @param [callback] {Function} Callback
 * @return {TransitionableTransform}
 */
TransitionableTransform.prototype.setSkew = function setSkew(skewAngles, transition, callback) {
    this.skew.set(skewAngles, transition, callback);
    this._final = Transform.build({
        translate: this.translate.get(),
        rotate: this.rotate.get(),
        scale: this.scale.get(),
        skew: skewAngles
    });
    return this;
};

/**
 * Setter for a TransitionableTransform with optional parameters to transition
 * between Transforms
 *
 * @method set
 * @chainable
 *
 * @param transform {Array}     New transform state
 * @param [transition] {Object} Transition definition
 * @param [callback] {Function} Callback
 * @return {TransitionableTransform}
 */
TransitionableTransform.prototype.set = function set(transform, transition, callback) {
    this._final = transform;
    var components = Transform.interpret(transform);

    var _callback = callback ? Utility.after(4, callback) : null;
    this.translate.set(components.translate, transition, _callback);
    this.rotate.set(components.rotate, transition, _callback);
    this.skew.set(components.skew, transition, _callback);
    this.scale.set(components.scale, transition, _callback);
    return this;
};

/**
 * Sets the default transition to use for transitioning betwen Transform states
 *
 * @method setDefaultTransition
 *
 * @param transition {Object} Transition definition
 */
TransitionableTransform.prototype.setDefaultTransition = function setDefaultTransition(transition) {
    this.translate.setDefault(transition);
    this.rotate.setDefault(transition);
    this.skew.setDefault(transition);
    this.scale.setDefault(transition);
};

/**
 * Getter. Returns the current state of the Transform
 *
 * @method get
 *
 * @return {Transform}
 */
TransitionableTransform.prototype.get = function get() {
    if (this.isActive()) {
        return _build.call(this);
    }
    else return this._final;
};

/**
 * Get the destination state of the Transform
 *
 * @method getFinal
 *
 * @return Transform {Transform}
 */
TransitionableTransform.prototype.getFinal = function getFinal() {
    return this._final;
};

/**
 * Determine if the TransitionalTransform is currently transitioning
 *
 * @method isActive
 *
 * @return {Boolean}
 */
TransitionableTransform.prototype.isActive = function isActive() {
    return this.translate.isActive() || this.rotate.isActive() || this.scale.isActive() || this.skew.isActive();
};

/**
 * Halts the transition
 *
 * @method halt
 */
TransitionableTransform.prototype.halt = function halt() {
    this._final = this.get();
    this.translate.halt();
    this.rotate.halt();
    this.skew.halt();
    this.scale.halt();
};

module.exports = TransitionableTransform;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/transitions/TransitionableTransform.js","/../../node_modules/famous/transitions")
},{"../core/Transform":12,"../utilities/Utility":25,"./Transitionable":22,"buffer":26,"oMfpAn":29}],24:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */




/**
 *
 * A state maintainer for a smooth transition between
 *    numerically-specified states.  Example numeric states include floats or
 *    Transfornm objects.
 *
 *    An initial state is set with the constructor or set(startValue). A
 *    corresponding end state and transition are set with set(endValue,
 *    transition). Subsequent calls to set(endValue, transition) begin at
 *    the last state. Calls to get(timestamp) provide the _interpolated state
 *    along the way.
 *
 *   Note that there is no event loop here - calls to get() are the only way
 *    to find out state projected to the current (or provided) time and are
 *    the only way to trigger callbacks. Usually this kind of object would
 *    be part of the render() path of a visible component.
 *
 * @class TweenTransition
 * @constructor
 *
 * @param {Object} options TODO
 *    beginning state
 */
function TweenTransition(options) {
    this.options = Object.create(TweenTransition.DEFAULT_OPTIONS);
    if (options) this.setOptions(options);

    this._startTime = 0;
    this._startValue = 0;
    this._updateTime = 0;
    this._endValue = 0;
    this._curve = undefined;
    this._duration = 0;
    this._active = false;
    this._callback = undefined;
    this.state = 0;
    this.velocity = undefined;
}

/**
 * Transition curves mapping independent variable t from domain [0,1] to a
 *    range within [0,1]. Includes functions 'linear', 'easeIn', 'easeOut',
 *    'easeInOut', 'easeOutBounce', 'spring'.
 *
 * @property {object} Curve
 * @final
 */
TweenTransition.Curves = {
    linear: function(t) {
        return t;
    },
    easeIn: function(t) {
        return t*t;
    },
    easeOut: function(t) {
        return t*(2-t);
    },
    easeInOut: function(t) {
        if (t <= 0.5) return 2*t*t;
        else return -2*t*t + 4*t - 1;
    },
    easeOutBounce: function(t) {
        return t*(3 - 2*t);
    },
    spring: function(t) {
        return (1 - t) * Math.sin(6 * Math.PI * t) + t;
    }
};

TweenTransition.SUPPORTS_MULTIPLE = true;
TweenTransition.DEFAULT_OPTIONS = {
    curve: TweenTransition.Curves.linear,
    duration: 500,
    speed: 0 /* considered only if positive */
};

var registeredCurves = {};

/**
 * Add "unit" curve to internal dictionary of registered curves.
 *
 * @method registerCurve
 *
 * @static
 *
 * @param {string} curveName dictionary key
 * @param {unitCurve} curve function of one numeric variable mapping [0,1]
 *    to range inside [0,1]
 * @return {boolean} false if key is taken, else true
 */
TweenTransition.registerCurve = function registerCurve(curveName, curve) {
    if (!registeredCurves[curveName]) {
        registeredCurves[curveName] = curve;
        return true;
    }
    else {
        return false;
    }
};

/**
 * Remove object with key "curveName" from internal dictionary of registered
 *    curves.
 *
 * @method unregisterCurve
 *
 * @static
 *
 * @param {string} curveName dictionary key
 * @return {boolean} false if key has no dictionary value
 */
TweenTransition.unregisterCurve = function unregisterCurve(curveName) {
    if (registeredCurves[curveName]) {
        delete registeredCurves[curveName];
        return true;
    }
    else {
        return false;
    }
};

/**
 * Retrieve function with key "curveName" from internal dictionary of
 *    registered curves. Default curves are defined in the
 *    TweenTransition.Curves array, where the values represent
 *    unitCurve functions.
 *
 * @method getCurve
 *
 * @static
 *
 * @param {string} curveName dictionary key
 * @return {unitCurve} curve function of one numeric variable mapping [0,1]
 *    to range inside [0,1]
 */
TweenTransition.getCurve = function getCurve(curveName) {
    var curve = registeredCurves[curveName];
    if (curve !== undefined) return curve;
    else throw new Error('curve not registered');
};

/**
 * Retrieve all available curves.
 *
 * @method getCurves
 *
 * @static
 *
 * @return {object} curve functions of one numeric variable mapping [0,1]
 *    to range inside [0,1]
 */
TweenTransition.getCurves = function getCurves() {
    return registeredCurves;
};

 // Interpolate: If a linear function f(0) = a, f(1) = b, then return f(t)
function _interpolate(a, b, t) {
    return ((1 - t) * a) + (t * b);
}

function _clone(obj) {
    if (obj instanceof Object) {
        if (obj instanceof Array) return obj.slice(0);
        else return Object.create(obj);
    }
    else return obj;
}

// Fill in missing properties in "transition" with those in defaultTransition, and
//   convert internal named curve to function object, returning as new
//   object.
function _normalize(transition, defaultTransition) {
    var result = {curve: defaultTransition.curve};
    if (defaultTransition.duration) result.duration = defaultTransition.duration;
    if (defaultTransition.speed) result.speed = defaultTransition.speed;
    if (transition instanceof Object) {
        if (transition.duration !== undefined) result.duration = transition.duration;
        if (transition.curve) result.curve = transition.curve;
        if (transition.speed) result.speed = transition.speed;
    }
    if (typeof result.curve === 'string') result.curve = TweenTransition.getCurve(result.curve);
    return result;
}

/**
 * Set internal options, overriding any default options.
 *
 * @method setOptions
 *
 *
 * @param {Object} options options object
 * @param {Object} [options.curve] function mapping [0,1] to [0,1] or identifier
 * @param {Number} [options.duration] duration in ms
 * @param {Number} [options.speed] speed in pixels per ms
 */
TweenTransition.prototype.setOptions = function setOptions(options) {
    if (options.curve !== undefined) this.options.curve = options.curve;
    if (options.duration !== undefined) this.options.duration = options.duration;
    if (options.speed !== undefined) this.options.speed = options.speed;
};

/**
 * Add transition to end state to the queue of pending transitions. Special
 *    Use: calling without a transition resets the object to that state with
 *    no pending actions
 *
 * @method set
 *
 *
 * @param {number|FamousMatrix|Array.Number|Object.<number, number>} endValue
 *    end state to which we _interpolate
 * @param {transition=} transition object of type {duration: number, curve:
 *    f[0,1] -> [0,1] or name}. If transition is omitted, change will be
 *    instantaneous.
 * @param {function()=} callback Zero-argument function to call on observed
 *    completion (t=1)
 */
TweenTransition.prototype.set = function set(endValue, transition, callback) {
    if (!transition) {
        this.reset(endValue);
        if (callback) callback();
        return;
    }

    this._startValue = _clone(this.get());
    transition = _normalize(transition, this.options);
    if (transition.speed) {
        var startValue = this._startValue;
        if (startValue instanceof Object) {
            var variance = 0;
            for (var i in startValue) variance += (endValue[i] - startValue[i]) * (endValue[i] - startValue[i]);
            transition.duration = Math.sqrt(variance) / transition.speed;
        }
        else {
            transition.duration = Math.abs(endValue - startValue) / transition.speed;
        }
    }

    this._startTime = Date.now();
    this._endValue = _clone(endValue);
    this._startVelocity = _clone(transition.velocity);
    this._duration = transition.duration;
    this._curve = transition.curve;
    this._active = true;
    this._callback = callback;
};

/**
 * Cancel all transitions and reset to a stable state
 *
 * @method reset
 *
 * @param {number|Array.Number|Object.<number, number>} startValue
 *    starting state
 * @param {number} startVelocity
 *    starting velocity
 */
TweenTransition.prototype.reset = function reset(startValue, startVelocity) {
    if (this._callback) {
        var callback = this._callback;
        this._callback = undefined;
        callback();
    }
    this.state = _clone(startValue);
    this.velocity = _clone(startVelocity);
    this._startTime = 0;
    this._duration = 0;
    this._updateTime = 0;
    this._startValue = this.state;
    this._startVelocity = this.velocity;
    this._endValue = this.state;
    this._active = false;
};

/**
 * Get current velocity
 *
 * @method getVelocity
 *
 * @returns {Number} velocity
 */
TweenTransition.prototype.getVelocity = function getVelocity() {
    return this.velocity;
};

/**
 * Get interpolated state of current action at provided time. If the last
 *    action has completed, invoke its callback.
 *
 * @method get
 *
 *
 * @param {number=} timestamp Evaluate the curve at a normalized version of this
 *    time. If omitted, use current time. (Unix epoch time)
 * @return {number|Object.<number|string, number>} beginning state
 *    _interpolated to this point in time.
 */
TweenTransition.prototype.get = function get(timestamp) {
    this.update(timestamp);
    return this.state;
};

function _calculateVelocity(current, start, curve, duration, t) {
    var velocity;
    var eps = 1e-7;
    var speed = (curve(t) - curve(t - eps)) / eps;
    if (current instanceof Array) {
        velocity = [];
        for (var i = 0; i < current.length; i++){
            if (typeof current[i] === 'number')
                velocity[i] = speed * (current[i] - start[i]) / duration;
            else
                velocity[i] = 0;
        }

    }
    else velocity = speed * (current - start) / duration;
    return velocity;
}

function _calculateState(start, end, t) {
    var state;
    if (start instanceof Array) {
        state = [];
        for (var i = 0; i < start.length; i++) {
            if (typeof start[i] === 'number')
                state[i] = _interpolate(start[i], end[i], t);
            else
                state[i] = start[i];
        }
    }
    else state = _interpolate(start, end, t);
    return state;
}

/**
 * Update internal state to the provided timestamp. This may invoke the last
 *    callback and begin a new action.
 *
 * @method update
 *
 *
 * @param {number=} timestamp Evaluate the curve at a normalized version of this
 *    time. If omitted, use current time. (Unix epoch time)
 */
TweenTransition.prototype.update = function update(timestamp) {
    if (!this._active) {
        if (this._callback) {
            var callback = this._callback;
            this._callback = undefined;
            callback();
        }
        return;
    }

    if (!timestamp) timestamp = Date.now();
    if (this._updateTime >= timestamp) return;
    this._updateTime = timestamp;

    var timeSinceStart = timestamp - this._startTime;
    if (timeSinceStart >= this._duration) {
        this.state = this._endValue;
        this.velocity = _calculateVelocity(this.state, this._startValue, this._curve, this._duration, 1);
        this._active = false;
    }
    else if (timeSinceStart < 0) {
        this.state = this._startValue;
        this.velocity = this._startVelocity;
    }
    else {
        var t = timeSinceStart / this._duration;
        this.state = _calculateState(this._startValue, this._endValue, this._curve(t));
        this.velocity = _calculateVelocity(this.state, this._startValue, this._curve, this._duration, t);
    }
};

/**
 * Is there at least one action pending completion?
 *
 * @method isActive
 *
 *
 * @return {boolean}
 */
TweenTransition.prototype.isActive = function isActive() {
    return this._active;
};

/**
 * Halt transition at current state and erase all pending actions.
 *
 * @method halt
 *
 */
TweenTransition.prototype.halt = function halt() {
    this.reset(this.get());
};

// Register all the default curves
TweenTransition.registerCurve('linear', TweenTransition.Curves.linear);
TweenTransition.registerCurve('easeIn', TweenTransition.Curves.easeIn);
TweenTransition.registerCurve('easeOut', TweenTransition.Curves.easeOut);
TweenTransition.registerCurve('easeInOut', TweenTransition.Curves.easeInOut);
TweenTransition.registerCurve('easeOutBounce', TweenTransition.Curves.easeOutBounce);
TweenTransition.registerCurve('spring', TweenTransition.Curves.spring);

TweenTransition.customCurve = function customCurve(v1, v2) {
    v1 = v1 || 0; v2 = v2 || 0;
    return function(t) {
        return v1*t + (-2*v1 - v2 + 3)*t*t + (v1 + v2 - 2)*t*t*t;
    };
};

module.exports = TweenTransition;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/transitions/TweenTransition.js","/../../node_modules/famous/transitions")
},{"buffer":26,"oMfpAn":29}],25:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */



/**
 * This namespace holds standalone functionality.
 *  Currently includes name mapping for transition curves,
 *  name mapping for origin pairs, and the after() function.
 *
 * @class Utility
 * @static
 */
var Utility = {};

/**
 * Table of direction array positions
 *
 * @property {object} Direction
 * @final
 */
Utility.Direction = {
    X: 0,
    Y: 1,
    Z: 2
};

/**
 * Return wrapper around callback function. Once the wrapper is called N
 *   times, invoke the callback function. Arguments and scope preserved.
 *
 * @method after
 *
 * @param {number} count number of calls before callback function invoked
 * @param {Function} callback wrapped callback function
 *
 * @return {function} wrapped callback with coundown feature
 */
Utility.after = function after(count, callback) {
    var counter = count;
    return function() {
        counter--;
        if (counter === 0) callback.apply(this, arguments);
    };
};

/**
 * Load a URL and return its contents in a callback
 *
 * @method loadURL
 *
 * @param {string} url URL of object
 * @param {function} callback callback to dispatch with content
 */
Utility.loadURL = function loadURL(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function onreadystatechange() {
        if (this.readyState === 4) {
            if (callback) callback(this.responseText);
        }
    };
    xhr.open('GET', url);
    xhr.send();
};

/**
 * Create a document fragment from a string of HTML
 *
 * @method createDocumentFragmentFromHTML
 *
 * @param {string} html HTML to convert to DocumentFragment
 *
 * @return {DocumentFragment} DocumentFragment representing input HTML
 */
Utility.createDocumentFragmentFromHTML = function createDocumentFragmentFromHTML(html) {
    var element = document.createElement('div');
    element.innerHTML = html;
    var result = document.createDocumentFragment();
    while (element.hasChildNodes()) result.appendChild(element.firstChild);
    return result;
};

module.exports = Utility;
}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/famous/utilities/Utility.js","/../../node_modules/famous/utilities")
},{"buffer":26,"oMfpAn":29}],26:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/index.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer")
},{"base64-js":27,"buffer":26,"ieee754":28,"oMfpAn":29}],27:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib/b64.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/base64-js/lib")
},{"buffer":26,"oMfpAn":29}],28:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754/index.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/buffer/node_modules/ieee754")
},{"buffer":26,"oMfpAn":29}],29:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/process/browser.js","/../../node_modules/gulp-browserify/node_modules/browserify/node_modules/process")
},{"buffer":26,"oMfpAn":29}],30:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
//var React = require('react')
//


//console.log('fuuu')
//var React = require('react');

/** @jsx React.DOM */ /*
React.renderComponent(
  React.DOM.h1(null, 'Hello, world! I am God'),
  document.getElementById('example')
);

*/

/*
var Engine = require('famous/core/Engine');
var Surface = require('famous/core/Surface');

var mainContext = Engine.createContext();

var firstSurface = new Surface({
  content: 'hello world',
  size: [200, 400],
  properties: {
    color: 'blue',
    textAlign: 'center',
    backgroundColor: '#FA5C4F'
  }
});

firstSurface.setContent('<h1>HELLO WORLD, I am thine god on earth</h1>');

mainContext.add(firstSurface);
*/
var Engine = require('famous/core/Engine');
var Surface = require('famous/core/Surface');
var Transform = require('famous/core/Transform');
var StateModifier = require('famous/modifiers/StateModifier');
var Transitionable = require('famous/transitions/Transitionable');
var SpringTransition = require('famous/transitions/SpringTransition');
Transitionable.registerMethod('spring', SpringTransition);

var mainContext = Engine.createContext();

var surface = new Surface({
  size: [100, 100],
  properties: {
    color: 'white',
    textAlign: 'center',
    backgroundColor: '#FA5C4F'
  }
});

var stateModifier = new StateModifier({
  origin: [0.5, 0]
});

mainContext.add(stateModifier).add(surface);

var spring = {
  method: 'spring',
  period: 1000,
  dampingRatio: 0.3
};

stateModifier.setTransform(
  Transform.translate(0, 300, 0), spring
);


}).call(this,require("oMfpAn"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_97d0dd3d.js","/")
},{"buffer":26,"famous/core/Engine":3,"famous/core/Surface":11,"famous/core/Transform":12,"famous/modifiers/StateModifier":14,"famous/transitions/SpringTransition":21,"famous/transitions/Transitionable":22,"oMfpAn":29}]},{},[30])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jdWx0b2ZtZXRhdHJvbi9wcm9qZWN0cy9hdWRpb2xhdGhlL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9jdWx0b2ZtZXRhdHJvbi9wcm9qZWN0cy9hdWRpb2xhdGhlL25vZGVfbW9kdWxlcy9mYW1vdXMvY29yZS9Db250ZXh0LmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL0VsZW1lbnRBbGxvY2F0b3IuanMiLCIvVXNlcnMvY3VsdG9mbWV0YXRyb24vcHJvamVjdHMvYXVkaW9sYXRoZS9ub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvRW5naW5lLmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL0VudGl0eS5qcyIsIi9Vc2Vycy9jdWx0b2ZtZXRhdHJvbi9wcm9qZWN0cy9hdWRpb2xhdGhlL25vZGVfbW9kdWxlcy9mYW1vdXMvY29yZS9FdmVudEVtaXR0ZXIuanMiLCIvVXNlcnMvY3VsdG9mbWV0YXRyb24vcHJvamVjdHMvYXVkaW9sYXRoZS9ub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvRXZlbnRIYW5kbGVyLmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL01vZGlmaWVyLmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL09wdGlvbnNNYW5hZ2VyLmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL1JlbmRlck5vZGUuanMiLCIvVXNlcnMvY3VsdG9mbWV0YXRyb24vcHJvamVjdHMvYXVkaW9sYXRoZS9ub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvU3BlY1BhcnNlci5qcyIsIi9Vc2Vycy9jdWx0b2ZtZXRhdHJvbi9wcm9qZWN0cy9hdWRpb2xhdGhlL25vZGVfbW9kdWxlcy9mYW1vdXMvY29yZS9TdXJmYWNlLmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL1RyYW5zZm9ybS5qcyIsIi9Vc2Vycy9jdWx0b2ZtZXRhdHJvbi9wcm9qZWN0cy9hdWRpb2xhdGhlL25vZGVfbW9kdWxlcy9mYW1vdXMvbWF0aC9WZWN0b3IuanMiLCIvVXNlcnMvY3VsdG9mbWV0YXRyb24vcHJvamVjdHMvYXVkaW9sYXRoZS9ub2RlX21vZHVsZXMvZmFtb3VzL21vZGlmaWVycy9TdGF0ZU1vZGlmaWVyLmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvbm9kZV9tb2R1bGVzL2ZhbW91cy9waHlzaWNzL1BoeXNpY3NFbmdpbmUuanMiLCIvVXNlcnMvY3VsdG9mbWV0YXRyb24vcHJvamVjdHMvYXVkaW9sYXRoZS9ub2RlX21vZHVsZXMvZmFtb3VzL3BoeXNpY3MvYm9kaWVzL1BhcnRpY2xlLmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvbm9kZV9tb2R1bGVzL2ZhbW91cy9waHlzaWNzL2ZvcmNlcy9Gb3JjZS5qcyIsIi9Vc2Vycy9jdWx0b2ZtZXRhdHJvbi9wcm9qZWN0cy9hdWRpb2xhdGhlL25vZGVfbW9kdWxlcy9mYW1vdXMvcGh5c2ljcy9mb3JjZXMvU3ByaW5nLmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvbm9kZV9tb2R1bGVzL2ZhbW91cy9waHlzaWNzL2ludGVncmF0b3JzL1N5bXBsZWN0aWNFdWxlci5qcyIsIi9Vc2Vycy9jdWx0b2ZtZXRhdHJvbi9wcm9qZWN0cy9hdWRpb2xhdGhlL25vZGVfbW9kdWxlcy9mYW1vdXMvdHJhbnNpdGlvbnMvTXVsdGlwbGVUcmFuc2l0aW9uLmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvbm9kZV9tb2R1bGVzL2ZhbW91cy90cmFuc2l0aW9ucy9TcHJpbmdUcmFuc2l0aW9uLmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvbm9kZV9tb2R1bGVzL2ZhbW91cy90cmFuc2l0aW9ucy9UcmFuc2l0aW9uYWJsZS5qcyIsIi9Vc2Vycy9jdWx0b2ZtZXRhdHJvbi9wcm9qZWN0cy9hdWRpb2xhdGhlL25vZGVfbW9kdWxlcy9mYW1vdXMvdHJhbnNpdGlvbnMvVHJhbnNpdGlvbmFibGVUcmFuc2Zvcm0uanMiLCIvVXNlcnMvY3VsdG9mbWV0YXRyb24vcHJvamVjdHMvYXVkaW9sYXRoZS9ub2RlX21vZHVsZXMvZmFtb3VzL3RyYW5zaXRpb25zL1R3ZWVuVHJhbnNpdGlvbi5qcyIsIi9Vc2Vycy9jdWx0b2ZtZXRhdHJvbi9wcm9qZWN0cy9hdWRpb2xhdGhlL25vZGVfbW9kdWxlcy9mYW1vdXMvdXRpbGl0aWVzL1V0aWxpdHkuanMiLCIvVXNlcnMvY3VsdG9mbWV0YXRyb24vcHJvamVjdHMvYXVkaW9sYXRoZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCIvVXNlcnMvY3VsdG9mbWV0YXRyb24vcHJvamVjdHMvYXVkaW9sYXRoZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9pZWVlNzU0L2luZGV4LmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL1VzZXJzL2N1bHRvZm1ldGF0cm9uL3Byb2plY3RzL2F1ZGlvbGF0aGUvc3JjL3dlYi9mYWtlXzk3ZDBkZDNkLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMXFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25aQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNhQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2bENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IG1hcmtAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxudmFyIFJlbmRlck5vZGUgPSByZXF1aXJlKCcuL1JlbmRlck5vZGUnKTtcbnZhciBFdmVudEhhbmRsZXIgPSByZXF1aXJlKCcuL0V2ZW50SGFuZGxlcicpO1xudmFyIEVsZW1lbnRBbGxvY2F0b3IgPSByZXF1aXJlKCcuL0VsZW1lbnRBbGxvY2F0b3InKTtcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL1RyYW5zZm9ybScpO1xudmFyIFRyYW5zaXRpb25hYmxlID0gcmVxdWlyZSgnLi4vdHJhbnNpdGlvbnMvVHJhbnNpdGlvbmFibGUnKTtcblxudmFyIF9vcmlnaW5aZXJvWmVybyA9IFswLCAwXTtcblxuZnVuY3Rpb24gX2dldEVsZW1lbnRTaXplKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gW2VsZW1lbnQuY2xpZW50V2lkdGgsIGVsZW1lbnQuY2xpZW50SGVpZ2h0XTtcbn1cblxuLyoqXG4gKiBUaGUgdG9wLWxldmVsIGNvbnRhaW5lciBmb3IgYSBGYW1vdXMtcmVuZGVyYWJsZSBwaWVjZSBvZiB0aGUgZG9jdW1lbnQuXG4gKiAgIEl0IGlzIGRpcmVjdGx5IHVwZGF0ZWQgYnkgdGhlIHByb2Nlc3Mtd2lkZSBFbmdpbmUgb2JqZWN0LCBhbmQgbWFuYWdlcyBvbmVcbiAqICAgcmVuZGVyIHRyZWUgcm9vdCwgd2hpY2ggY2FuIGNvbnRhaW4gb3RoZXIgcmVuZGVyYWJsZXMuXG4gKlxuICogQGNsYXNzIENvbnRleHRcbiAqIEBjb25zdHJ1Y3RvclxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Tm9kZX0gY29udGFpbmVyIEVsZW1lbnQgaW4gd2hpY2ggY29udGVudCB3aWxsIGJlIGluc2VydGVkXG4gKi9cbmZ1bmN0aW9uIENvbnRleHQoY29udGFpbmVyKSB7XG4gICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XG4gICAgdGhpcy5fYWxsb2NhdG9yID0gbmV3IEVsZW1lbnRBbGxvY2F0b3IoY29udGFpbmVyKTtcblxuICAgIHRoaXMuX25vZGUgPSBuZXcgUmVuZGVyTm9kZSgpO1xuICAgIHRoaXMuX2V2ZW50T3V0cHV0ID0gbmV3IEV2ZW50SGFuZGxlcigpO1xuICAgIHRoaXMuX3NpemUgPSBfZ2V0RWxlbWVudFNpemUodGhpcy5jb250YWluZXIpO1xuXG4gICAgdGhpcy5fcGVyc3BlY3RpdmVTdGF0ZSA9IG5ldyBUcmFuc2l0aW9uYWJsZSgwKTtcbiAgICB0aGlzLl9wZXJzcGVjdGl2ZSA9IHVuZGVmaW5lZDtcblxuICAgIHRoaXMuX25vZGVDb250ZXh0ID0ge1xuICAgICAgICBhbGxvY2F0b3I6IHRoaXMuX2FsbG9jYXRvcixcbiAgICAgICAgdHJhbnNmb3JtOiBUcmFuc2Zvcm0uaWRlbnRpdHksXG4gICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgIG9yaWdpbjogX29yaWdpblplcm9aZXJvLFxuICAgICAgICBhbGlnbjogbnVsbCxcbiAgICAgICAgc2l6ZTogdGhpcy5fc2l6ZVxuICAgIH07XG5cbiAgICB0aGlzLl9ldmVudE91dHB1dC5vbigncmVzaXplJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc2V0U2l6ZShfZ2V0RWxlbWVudFNpemUodGhpcy5jb250YWluZXIpKTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG59XG5cbi8vIE5vdGU6IFVudXNlZFxuQ29udGV4dC5wcm90b3R5cGUuZ2V0QWxsb2NhdG9yID0gZnVuY3Rpb24gZ2V0QWxsb2NhdG9yKCkge1xuICAgIHJldHVybiB0aGlzLl9hbGxvY2F0b3I7XG59O1xuXG4vKipcbiAqIEFkZCByZW5kZXJhYmxlcyB0byB0aGlzIENvbnRleHQncyByZW5kZXIgdHJlZS5cbiAqXG4gKiBAbWV0aG9kIGFkZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogcmVuZGVyYWJsZSBvYmplY3RcbiAqIEByZXR1cm4ge1JlbmRlck5vZGV9IFJlbmRlck5vZGUgd3JhcHBpbmcgdGhpcyBvYmplY3QsIGlmIG5vdCBhbHJlYWR5IGEgUmVuZGVyTm9kZVxuICovXG5Db250ZXh0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiBhZGQob2JqKSB7XG4gICAgcmV0dXJuIHRoaXMuX25vZGUuYWRkKG9iaik7XG59O1xuXG4vKipcbiAqIE1vdmUgdGhpcyBDb250ZXh0IHRvIGFub3RoZXIgY29udGFpbmluZyBkb2N1bWVudCBlbGVtZW50LlxuICpcbiAqIEBtZXRob2QgbWlncmF0ZVxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gY29udGFpbmVyIEVsZW1lbnQgdG8gd2hpY2ggY29udGVudCB3aWxsIGJlIG1pZ3JhdGVkXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLm1pZ3JhdGUgPSBmdW5jdGlvbiBtaWdyYXRlKGNvbnRhaW5lcikge1xuICAgIGlmIChjb250YWluZXIgPT09IHRoaXMuY29udGFpbmVyKSByZXR1cm47XG4gICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XG4gICAgdGhpcy5fYWxsb2NhdG9yLm1pZ3JhdGUoY29udGFpbmVyKTtcbn07XG5cbi8qKlxuICogR2V0cyB2aWV3cG9ydCBzaXplIGZvciBDb250ZXh0LlxuICpcbiAqIEBtZXRob2QgZ2V0U2l6ZVxuICpcbiAqIEByZXR1cm4ge0FycmF5Lk51bWJlcn0gdmlld3BvcnQgc2l6ZSBhcyBbd2lkdGgsIGhlaWdodF1cbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuZ2V0U2l6ZSA9IGZ1bmN0aW9uIGdldFNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NpemU7XG59O1xuXG4vKipcbiAqIFNldHMgdmlld3BvcnQgc2l6ZSBmb3IgQ29udGV4dC5cbiAqXG4gKiBAbWV0aG9kIHNldFNpemVcbiAqXG4gKiBAcGFyYW0ge0FycmF5Lk51bWJlcn0gc2l6ZSBbd2lkdGgsIGhlaWdodF0uICBJZiB1bnNwZWNpZmllZCwgdXNlIHNpemUgb2Ygcm9vdCBkb2N1bWVudCBlbGVtZW50LlxuICovXG5Db250ZXh0LnByb3RvdHlwZS5zZXRTaXplID0gZnVuY3Rpb24gc2V0U2l6ZShzaXplKSB7XG4gICAgaWYgKCFzaXplKSBzaXplID0gX2dldEVsZW1lbnRTaXplKHRoaXMuY29udGFpbmVyKTtcbiAgICB0aGlzLl9zaXplWzBdID0gc2l6ZVswXTtcbiAgICB0aGlzLl9zaXplWzFdID0gc2l6ZVsxXTtcbn07XG5cbi8qKlxuICogQ29tbWl0IHRoaXMgQ29udGV4dCdzIGNvbnRlbnQgY2hhbmdlcyB0byB0aGUgZG9jdW1lbnQuXG4gKlxuICogQHByaXZhdGVcbiAqIEBtZXRob2QgdXBkYXRlXG4gKiBAcGFyYW0ge09iamVjdH0gY29udGV4dFBhcmFtZXRlcnMgZW5naW5lIGNvbW1pdCBzcGVjaWZpY2F0aW9uXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZShjb250ZXh0UGFyYW1ldGVycykge1xuICAgIGlmIChjb250ZXh0UGFyYW1ldGVycykge1xuICAgICAgICBpZiAoY29udGV4dFBhcmFtZXRlcnMudHJhbnNmb3JtKSB0aGlzLl9ub2RlQ29udGV4dC50cmFuc2Zvcm0gPSBjb250ZXh0UGFyYW1ldGVycy50cmFuc2Zvcm07XG4gICAgICAgIGlmIChjb250ZXh0UGFyYW1ldGVycy5vcGFjaXR5KSB0aGlzLl9ub2RlQ29udGV4dC5vcGFjaXR5ID0gY29udGV4dFBhcmFtZXRlcnMub3BhY2l0eTtcbiAgICAgICAgaWYgKGNvbnRleHRQYXJhbWV0ZXJzLm9yaWdpbikgdGhpcy5fbm9kZUNvbnRleHQub3JpZ2luID0gY29udGV4dFBhcmFtZXRlcnMub3JpZ2luO1xuICAgICAgICBpZiAoY29udGV4dFBhcmFtZXRlcnMuYWxpZ24pIHRoaXMuX25vZGVDb250ZXh0LmFsaWduID0gY29udGV4dFBhcmFtZXRlcnMuYWxpZ247XG4gICAgICAgIGlmIChjb250ZXh0UGFyYW1ldGVycy5zaXplKSB0aGlzLl9ub2RlQ29udGV4dC5zaXplID0gY29udGV4dFBhcmFtZXRlcnMuc2l6ZTtcbiAgICB9XG4gICAgdmFyIHBlcnNwZWN0aXZlID0gdGhpcy5fcGVyc3BlY3RpdmVTdGF0ZS5nZXQoKTtcbiAgICBpZiAocGVyc3BlY3RpdmUgIT09IHRoaXMuX3BlcnNwZWN0aXZlKSB7XG4gICAgICAgIHRoaXMuY29udGFpbmVyLnN0eWxlLnBlcnNwZWN0aXZlID0gcGVyc3BlY3RpdmUgPyBwZXJzcGVjdGl2ZS50b0ZpeGVkKCkgKyAncHgnIDogJyc7XG4gICAgICAgIHRoaXMuY29udGFpbmVyLnN0eWxlLndlYmtpdFBlcnNwZWN0aXZlID0gcGVyc3BlY3RpdmUgPyBwZXJzcGVjdGl2ZS50b0ZpeGVkKCkgOiAnJztcbiAgICAgICAgdGhpcy5fcGVyc3BlY3RpdmUgPSBwZXJzcGVjdGl2ZTtcbiAgICB9XG5cbiAgICB0aGlzLl9ub2RlLmNvbW1pdCh0aGlzLl9ub2RlQ29udGV4dCk7XG59O1xuXG4vKipcbiAqIEdldCBjdXJyZW50IHBlcnNwZWN0aXZlIG9mIHRoaXMgY29udGV4dCBpbiBwaXhlbHMuXG4gKlxuICogQG1ldGhvZCBnZXRQZXJzcGVjdGl2ZVxuICogQHJldHVybiB7TnVtYmVyfSBkZXB0aCBwZXJzcGVjdGl2ZSBpbiBwaXhlbHNcbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuZ2V0UGVyc3BlY3RpdmUgPSBmdW5jdGlvbiBnZXRQZXJzcGVjdGl2ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fcGVyc3BlY3RpdmVTdGF0ZS5nZXQoKTtcbn07XG5cbi8qKlxuICogU2V0IGN1cnJlbnQgcGVyc3BlY3RpdmUgb2YgdGhpcyBjb250ZXh0IGluIHBpeGVscy5cbiAqXG4gKiBAbWV0aG9kIHNldFBlcnNwZWN0aXZlXG4gKiBAcGFyYW0ge051bWJlcn0gcGVyc3BlY3RpdmUgaW4gcGl4ZWxzXG4gKiBAcGFyYW0ge09iamVjdH0gW3RyYW5zaXRpb25dIFRyYW5zaXRpb25hYmxlIG9iamVjdCBmb3IgYXBwbHlpbmcgdGhlIGNoYW5nZVxuICogQHBhcmFtIHtmdW5jdGlvbihPYmplY3QpfSBjYWxsYmFjayBmdW5jdGlvbiBjYWxsZWQgb24gY29tcGxldGlvbiBvZiB0cmFuc2l0aW9uXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLnNldFBlcnNwZWN0aXZlID0gZnVuY3Rpb24gc2V0UGVyc3BlY3RpdmUocGVyc3BlY3RpdmUsIHRyYW5zaXRpb24sIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuX3BlcnNwZWN0aXZlU3RhdGUuc2V0KHBlcnNwZWN0aXZlLCB0cmFuc2l0aW9uLCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIFRyaWdnZXIgYW4gZXZlbnQsIHNlbmRpbmcgdG8gYWxsIGRvd25zdHJlYW0gaGFuZGxlcnNcbiAqICAgbGlzdGVuaW5nIGZvciBwcm92aWRlZCAndHlwZScga2V5LlxuICpcbiAqIEBtZXRob2QgZW1pdFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCBldmVudCBkYXRhXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHRoaXNcbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQodHlwZSwgZXZlbnQpIHtcbiAgICByZXR1cm4gdGhpcy5fZXZlbnRPdXRwdXQuZW1pdCh0eXBlLCBldmVudCk7XG59O1xuXG4vKipcbiAqIEJpbmQgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBhbiBldmVudCB0eXBlIGhhbmRsZWQgYnkgdGhpcyBvYmplY3QuXG4gKlxuICogQG1ldGhvZCBcIm9uXCJcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBldmVudCB0eXBlIGtleSAoZm9yIGV4YW1wbGUsICdjbGljaycpXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHN0cmluZywgT2JqZWN0KX0gaGFuZGxlciBjYWxsYmFja1xuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSB0aGlzXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24odHlwZSwgaGFuZGxlcikge1xuICAgIHJldHVybiB0aGlzLl9ldmVudE91dHB1dC5vbih0eXBlLCBoYW5kbGVyKTtcbn07XG5cbi8qKlxuICogVW5iaW5kIGFuIGV2ZW50IGJ5IHR5cGUgYW5kIGhhbmRsZXIuXG4gKiAgIFRoaXMgdW5kb2VzIHRoZSB3b3JrIG9mIFwib25cIi5cbiAqXG4gKiBAbWV0aG9kIHJlbW92ZUxpc3RlbmVyXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtmdW5jdGlvbn0gaGFuZGxlciBmdW5jdGlvbiBvYmplY3QgdG8gcmVtb3ZlXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IGludGVybmFsIGV2ZW50IGhhbmRsZXIgb2JqZWN0IChmb3IgY2hhaW5pbmcpXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIodHlwZSwgaGFuZGxlcikge1xuICAgIHJldHVybiB0aGlzLl9ldmVudE91dHB1dC5yZW1vdmVMaXN0ZW5lcih0eXBlLCBoYW5kbGVyKTtcbn07XG5cbi8qKlxuICogQWRkIGV2ZW50IGhhbmRsZXIgb2JqZWN0IHRvIHNldCBvZiBkb3duc3RyZWFtIGhhbmRsZXJzLlxuICpcbiAqIEBtZXRob2QgcGlwZVxuICpcbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSB0YXJnZXQgZXZlbnQgaGFuZGxlciB0YXJnZXQgb2JqZWN0XG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHBhc3NlZCBldmVudCBoYW5kbGVyXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbiBwaXBlKHRhcmdldCkge1xuICAgIHJldHVybiB0aGlzLl9ldmVudE91dHB1dC5waXBlKHRhcmdldCk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBoYW5kbGVyIG9iamVjdCBmcm9tIHNldCBvZiBkb3duc3RyZWFtIGhhbmRsZXJzLlxuICogICBVbmRvZXMgd29yayBvZiBcInBpcGVcIi5cbiAqXG4gKiBAbWV0aG9kIHVucGlwZVxuICpcbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSB0YXJnZXQgdGFyZ2V0IGhhbmRsZXIgb2JqZWN0XG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHByb3ZpZGVkIHRhcmdldFxuICovXG5Db250ZXh0LnByb3RvdHlwZS51bnBpcGUgPSBmdW5jdGlvbiB1bnBpcGUodGFyZ2V0KSB7XG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50T3V0cHV0LnVucGlwZSh0YXJnZXQpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250ZXh0O1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvQ29udGV4dC5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvY29yZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IG1hcmtAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuXG5cblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgb2JqZWN0IHRvIENvbnRleHQgdGhhdCBoYW5kbGVzIHRoZSBwcm9jZXNzIG9mXG4gKiAgIGNyZWF0aW5nIGFuZCBhbGxvY2F0aW5nIERPTSBlbGVtZW50cyB3aXRoaW4gYSBtYW5hZ2VkIGRpdi5cbiAqICAgUHJpdmF0ZS5cbiAqXG4gKiBAY2xhc3MgRWxlbWVudEFsbG9jYXRvclxuICogQGNvbnN0cnVjdG9yXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtOb2RlfSBjb250YWluZXIgZG9jdW1lbnQgZWxlbWVudCBpbiB3aGljaCBGYW1vLnVzIGNvbnRlbnQgd2lsbCBiZSBpbnNlcnRlZFxuICovXG5mdW5jdGlvbiBFbGVtZW50QWxsb2NhdG9yKGNvbnRhaW5lcikge1xuICAgIGlmICghY29udGFpbmVyKSBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XG4gICAgdGhpcy5kZXRhY2hlZE5vZGVzID0ge307XG4gICAgdGhpcy5ub2RlQ291bnQgPSAwO1xufVxuXG4vKipcbiAqIE1vdmUgdGhlIGRvY3VtZW50IGVsZW1lbnRzIGZyb20gdGhlaXIgb3JpZ2luYWwgY29udGFpbmVyIHRvIGEgbmV3IG9uZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG1ldGhvZCBtaWdyYXRlXG4gKlxuICogQHBhcmFtIHtOb2RlfSBjb250YWluZXIgZG9jdW1lbnQgZWxlbWVudCB0byB3aGljaCBGYW1vLnVzIGNvbnRlbnQgd2lsbCBiZSBtaWdyYXRlZFxuICovXG5FbGVtZW50QWxsb2NhdG9yLnByb3RvdHlwZS5taWdyYXRlID0gZnVuY3Rpb24gbWlncmF0ZShjb250YWluZXIpIHtcbiAgICB2YXIgb2xkQ29udGFpbmVyID0gdGhpcy5jb250YWluZXI7XG4gICAgaWYgKGNvbnRhaW5lciA9PT0gb2xkQ29udGFpbmVyKSByZXR1cm47XG5cbiAgICBpZiAob2xkQ29udGFpbmVyIGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCkge1xuICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQob2xkQ29udGFpbmVyKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHdoaWxlIChvbGRDb250YWluZXIuaGFzQ2hpbGROb2RlcygpKSB7XG4gICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQob2xkQ29udGFpbmVyLnJlbW92ZUNoaWxkKG9sZENvbnRhaW5lci5maXJzdENoaWxkKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lcjtcbn07XG5cbi8qKlxuICogQWxsb2NhdGUgYW4gZWxlbWVudCBvZiBzcGVjaWZpZWQgdHlwZSBmcm9tIHRoZSBwb29sLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbWV0aG9kIGFsbG9jYXRlXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgdHlwZSBvZiBlbGVtZW50LCBlLmcuICdkaXYnXG4gKiBAcmV0dXJuIHtOb2RlfSBhbGxvY2F0ZWQgZG9jdW1lbnQgZWxlbWVudFxuICovXG5FbGVtZW50QWxsb2NhdG9yLnByb3RvdHlwZS5hbGxvY2F0ZSA9IGZ1bmN0aW9uIGFsbG9jYXRlKHR5cGUpIHtcbiAgICB0eXBlID0gdHlwZS50b0xvd2VyQ2FzZSgpO1xuICAgIGlmICghKHR5cGUgaW4gdGhpcy5kZXRhY2hlZE5vZGVzKSkgdGhpcy5kZXRhY2hlZE5vZGVzW3R5cGVdID0gW107XG4gICAgdmFyIG5vZGVTdG9yZSA9IHRoaXMuZGV0YWNoZWROb2Rlc1t0eXBlXTtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGlmIChub2RlU3RvcmUubGVuZ3RoID4gMCkge1xuICAgICAgICByZXN1bHQgPSBub2RlU3RvcmUucG9wKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXN1bHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHR5cGUpO1xuICAgICAgICB0aGlzLmNvbnRhaW5lci5hcHBlbmRDaGlsZChyZXN1bHQpO1xuICAgIH1cbiAgICB0aGlzLm5vZGVDb3VudCsrO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIERlLWFsbG9jYXRlIGFuIGVsZW1lbnQgb2Ygc3BlY2lmaWVkIHR5cGUgdG8gdGhlIHBvb2wuXG4gKlxuICogQHByaXZhdGVcbiAqIEBtZXRob2QgZGVhbGxvY2F0ZVxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gZWxlbWVudCBkb2N1bWVudCBlbGVtZW50IHRvIGRlYWxsb2NhdGVcbiAqL1xuRWxlbWVudEFsbG9jYXRvci5wcm90b3R5cGUuZGVhbGxvY2F0ZSA9IGZ1bmN0aW9uIGRlYWxsb2NhdGUoZWxlbWVudCkge1xuICAgIHZhciBub2RlVHlwZSA9IGVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgbm9kZVN0b3JlID0gdGhpcy5kZXRhY2hlZE5vZGVzW25vZGVUeXBlXTtcbiAgICBub2RlU3RvcmUucHVzaChlbGVtZW50KTtcbiAgICB0aGlzLm5vZGVDb3VudC0tO1xufTtcblxuLyoqXG4gKiBHZXQgY291bnQgb2YgdG90YWwgYWxsb2NhdGVkIG5vZGVzIGluIHRoZSBkb2N1bWVudC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG1ldGhvZCBnZXROb2RlQ291bnRcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRvdGFsIG5vZGUgY291bnRcbiAqL1xuRWxlbWVudEFsbG9jYXRvci5wcm90b3R5cGUuZ2V0Tm9kZUNvdW50ID0gZnVuY3Rpb24gZ2V0Tm9kZUNvdW50KCkge1xuICAgIHJldHVybiB0aGlzLm5vZGVDb3VudDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRWxlbWVudEFsbG9jYXRvcjtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL0VsZW1lbnRBbGxvY2F0b3IuanNcIixcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL2NvcmVcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyOiBtYXJrQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbi8qKlxuICogVGhlIHNpbmdsZXRvbiBvYmplY3QgaW5pdGlhdGVkIHVwb24gcHJvY2Vzc1xuICogICBzdGFydHVwIHdoaWNoIG1hbmFnZXMgYWxsIGFjdGl2ZSBDb250ZXh0IGluc3RhbmNlcywgcnVuc1xuICogICB0aGUgcmVuZGVyIGRpc3BhdGNoIGxvb3AsIGFuZCBhY3RzIGFzIGEgbGlzdGVuZXIgYW5kIGRpc3BhdGNoZXJcbiAqICAgZm9yIGV2ZW50cy4gIEFsbCBtZXRob2RzIGFyZSB0aGVyZWZvcmUgc3RhdGljLlxuICpcbiAqICAgT24gc3RhdGljIGluaXRpYWxpemF0aW9uLCB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIGlzIGNhbGxlZCB3aXRoXG4gKiAgICAgdGhlIGV2ZW50IGxvb3AgZnVuY3Rpb24uXG4gKlxuICogICBOb3RlOiBBbnkgd2luZG93IGluIHdoaWNoIEVuZ2luZSBydW5zIHdpbGwgcHJldmVudCBkZWZhdWx0XG4gKiAgICAgc2Nyb2xsaW5nIGJlaGF2aW9yIG9uIHRoZSAndG91Y2htb3ZlJyBldmVudC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAY2xhc3MgRW5naW5lXG4gKi9cbnZhciBDb250ZXh0ID0gcmVxdWlyZSgnLi9Db250ZXh0Jyk7XG52YXIgRXZlbnRIYW5kbGVyID0gcmVxdWlyZSgnLi9FdmVudEhhbmRsZXInKTtcbnZhciBPcHRpb25zTWFuYWdlciA9IHJlcXVpcmUoJy4vT3B0aW9uc01hbmFnZXInKTtcblxudmFyIEVuZ2luZSA9IHt9O1xuXG52YXIgY29udGV4dHMgPSBbXTtcbnZhciBuZXh0VGlja1F1ZXVlID0gW107XG52YXIgZGVmZXJRdWV1ZSA9IFtdO1xuXG52YXIgbGFzdFRpbWUgPSBEYXRlLm5vdygpO1xudmFyIGZyYW1lVGltZTtcbnZhciBmcmFtZVRpbWVMaW1pdDtcbnZhciBsb29wRW5hYmxlZCA9IHRydWU7XG52YXIgZXZlbnRGb3J3YXJkZXJzID0ge307XG52YXIgZXZlbnRIYW5kbGVyID0gbmV3IEV2ZW50SGFuZGxlcigpO1xuXG52YXIgb3B0aW9ucyA9IHtcbiAgICBjb250YWluZXJUeXBlOiAnZGl2JyxcbiAgICBjb250YWluZXJDbGFzczogJ2ZhbW91cy1jb250YWluZXInLFxuICAgIGZwc0NhcDogdW5kZWZpbmVkLFxuICAgIHJ1bkxvb3A6IHRydWVcbn07XG52YXIgb3B0aW9uc01hbmFnZXIgPSBuZXcgT3B0aW9uc01hbmFnZXIob3B0aW9ucyk7XG5cbi8qKiBAY29uc3QgKi9cbnZhciBNQVhfREVGRVJfRlJBTUVfVElNRSA9IDEwO1xuXG4vKipcbiAqIEluc2lkZSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgbG9vcCwgc3RlcCgpIGlzIGNhbGxlZCwgd2hpY2g6XG4gKiAgIGNhbGN1bGF0ZXMgY3VycmVudCBGUFMgKHRocm90dGxpbmcgbG9vcCBpZiBpdCBpcyBvdmVyIGxpbWl0IHNldCBpbiBzZXRGUFNDYXApLFxuICogICBlbWl0cyBkYXRhbGVzcyAncHJlcmVuZGVyJyBldmVudCBvbiBzdGFydCBvZiBsb29wLFxuICogICBjYWxscyBpbiBvcmRlciBhbnkgb25lLXNob3QgZnVuY3Rpb25zIHJlZ2lzdGVyZWQgYnkgbmV4dFRpY2sgb24gbGFzdCBsb29wLFxuICogICBjYWxscyBDb250ZXh0LnVwZGF0ZSBvbiBhbGwgQ29udGV4dCBvYmplY3RzIHJlZ2lzdGVyZWQsXG4gKiAgIGFuZCBlbWl0cyBkYXRhbGVzcyAncG9zdHJlbmRlcicgZXZlbnQgb24gZW5kIG9mIGxvb3AuXG4gKlxuICogQHN0YXRpY1xuICogQHByaXZhdGVcbiAqIEBtZXRob2Qgc3RlcFxuICovXG5FbmdpbmUuc3RlcCA9IGZ1bmN0aW9uIHN0ZXAoKSB7XG4gICAgdmFyIGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIC8vIHNraXAgZnJhbWUgaWYgd2UncmUgb3ZlciBvdXIgZnJhbWVyYXRlIGNhcFxuICAgIGlmIChmcmFtZVRpbWVMaW1pdCAmJiBjdXJyZW50VGltZSAtIGxhc3RUaW1lIDwgZnJhbWVUaW1lTGltaXQpIHJldHVybjtcblxuICAgIHZhciBpID0gMDtcblxuICAgIGZyYW1lVGltZSA9IGN1cnJlbnRUaW1lIC0gbGFzdFRpbWU7XG4gICAgbGFzdFRpbWUgPSBjdXJyZW50VGltZTtcblxuICAgIGV2ZW50SGFuZGxlci5lbWl0KCdwcmVyZW5kZXInKTtcblxuICAgIC8vIGVtcHR5IHRoZSBxdWV1ZVxuICAgIGZvciAoaSA9IDA7IGkgPCBuZXh0VGlja1F1ZXVlLmxlbmd0aDsgaSsrKSBuZXh0VGlja1F1ZXVlW2ldLmNhbGwodGhpcyk7XG4gICAgbmV4dFRpY2tRdWV1ZS5zcGxpY2UoMCk7XG5cbiAgICAvLyBsaW1pdCB0b3RhbCBleGVjdXRpb24gdGltZSBmb3IgZGVmZXJyYWJsZSBmdW5jdGlvbnNcbiAgICB3aGlsZSAoZGVmZXJRdWV1ZS5sZW5ndGggJiYgKERhdGUubm93KCkgLSBjdXJyZW50VGltZSkgPCBNQVhfREVGRVJfRlJBTUVfVElNRSkge1xuICAgICAgICBkZWZlclF1ZXVlLnNoaWZ0KCkuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgY29udGV4dHMubGVuZ3RoOyBpKyspIGNvbnRleHRzW2ldLnVwZGF0ZSgpO1xuXG4gICAgZXZlbnRIYW5kbGVyLmVtaXQoJ3Bvc3RyZW5kZXInKTtcbn07XG5cbi8vIGVuZ2FnZSByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbmZ1bmN0aW9uIGxvb3AoKSB7XG4gICAgaWYgKG9wdGlvbnMucnVuTG9vcCkge1xuICAgICAgICBFbmdpbmUuc3RlcCgpO1xuICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGxvb3ApO1xuICAgIH1cbiAgICBlbHNlIGxvb3BFbmFibGVkID0gZmFsc2U7XG59XG53aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGxvb3ApO1xuXG4vL1xuLy8gVXBvbiBtYWluIGRvY3VtZW50IHdpbmRvdyByZXNpemUgKHVubGVzcyBvbiBhbiBcImlucHV0XCIgSFRNTCBlbGVtZW50KTpcbi8vICAgc2Nyb2xsIHRvIHRoZSB0b3AgbGVmdCBjb3JuZXIgb2YgdGhlIHdpbmRvdyxcbi8vICAgYW5kIGZvciBlYWNoIG1hbmFnZWQgQ29udGV4dDogZW1pdCB0aGUgJ3Jlc2l6ZScgZXZlbnQgYW5kIHVwZGF0ZSBpdHMgc2l6ZS5cbi8vIEBwYXJhbSB7T2JqZWN0PX0gZXZlbnQgZG9jdW1lbnQgZXZlbnRcbi8vXG5mdW5jdGlvbiBoYW5kbGVSZXNpemUoZXZlbnQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnRleHRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnRleHRzW2ldLmVtaXQoJ3Jlc2l6ZScpO1xuICAgIH1cbiAgICBldmVudEhhbmRsZXIuZW1pdCgncmVzaXplJyk7XG59XG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgaGFuZGxlUmVzaXplLCBmYWxzZSk7XG5oYW5kbGVSZXNpemUoKTtcblxuLy8gcHJldmVudCBzY3JvbGxpbmcgdmlhIGJyb3dzZXJcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBmdW5jdGlvbihldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG59LCB0cnVlKTtcblxuLyoqXG4gKiBBZGQgZXZlbnQgaGFuZGxlciBvYmplY3QgdG8gc2V0IG9mIGRvd25zdHJlYW0gaGFuZGxlcnMuXG4gKlxuICogQG1ldGhvZCBwaXBlXG4gKlxuICogQHBhcmFtIHtFdmVudEhhbmRsZXJ9IHRhcmdldCBldmVudCBoYW5kbGVyIHRhcmdldCBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gcGFzc2VkIGV2ZW50IGhhbmRsZXJcbiAqL1xuRW5naW5lLnBpcGUgPSBmdW5jdGlvbiBwaXBlKHRhcmdldCkge1xuICAgIGlmICh0YXJnZXQuc3Vic2NyaWJlIGluc3RhbmNlb2YgRnVuY3Rpb24pIHJldHVybiB0YXJnZXQuc3Vic2NyaWJlKEVuZ2luZSk7XG4gICAgZWxzZSByZXR1cm4gZXZlbnRIYW5kbGVyLnBpcGUodGFyZ2V0KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGhhbmRsZXIgb2JqZWN0IGZyb20gc2V0IG9mIGRvd25zdHJlYW0gaGFuZGxlcnMuXG4gKiAgIFVuZG9lcyB3b3JrIG9mIFwicGlwZVwiLlxuICpcbiAqIEBtZXRob2QgdW5waXBlXG4gKlxuICogQHBhcmFtIHtFdmVudEhhbmRsZXJ9IHRhcmdldCB0YXJnZXQgaGFuZGxlciBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gcHJvdmlkZWQgdGFyZ2V0XG4gKi9cbkVuZ2luZS51bnBpcGUgPSBmdW5jdGlvbiB1bnBpcGUodGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldC51bnN1YnNjcmliZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSByZXR1cm4gdGFyZ2V0LnVuc3Vic2NyaWJlKEVuZ2luZSk7XG4gICAgZWxzZSByZXR1cm4gZXZlbnRIYW5kbGVyLnVucGlwZSh0YXJnZXQpO1xufTtcblxuLyoqXG4gKiBCaW5kIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYW4gZXZlbnQgdHlwZSBoYW5kbGVkIGJ5IHRoaXMgb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2QgXCJvblwiXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtmdW5jdGlvbihzdHJpbmcsIE9iamVjdCl9IGhhbmRsZXIgY2FsbGJhY2tcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FbmdpbmUub24gPSBmdW5jdGlvbiBvbih0eXBlLCBoYW5kbGVyKSB7XG4gICAgaWYgKCEodHlwZSBpbiBldmVudEZvcndhcmRlcnMpKSB7XG4gICAgICAgIGV2ZW50Rm9yd2FyZGVyc1t0eXBlXSA9IGV2ZW50SGFuZGxlci5lbWl0LmJpbmQoZXZlbnRIYW5kbGVyLCB0eXBlKTtcbiAgICAgICAgaWYgKGRvY3VtZW50LmJvZHkpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBldmVudEZvcndhcmRlcnNbdHlwZV0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgRW5naW5lLm5leHRUaWNrKGZ1bmN0aW9uKHR5cGUsIGZvcndhcmRlcikge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmb3J3YXJkZXIpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMsIHR5cGUsIGV2ZW50Rm9yd2FyZGVyc1t0eXBlXSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBldmVudEhhbmRsZXIub24odHlwZSwgaGFuZGxlcik7XG59O1xuXG4vKipcbiAqIFRyaWdnZXIgYW4gZXZlbnQsIHNlbmRpbmcgdG8gYWxsIGRvd25zdHJlYW0gaGFuZGxlcnNcbiAqICAgbGlzdGVuaW5nIGZvciBwcm92aWRlZCAndHlwZScga2V5LlxuICpcbiAqIEBtZXRob2QgZW1pdFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCBldmVudCBkYXRhXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHRoaXNcbiAqL1xuRW5naW5lLmVtaXQgPSBmdW5jdGlvbiBlbWl0KHR5cGUsIGV2ZW50KSB7XG4gICAgcmV0dXJuIGV2ZW50SGFuZGxlci5lbWl0KHR5cGUsIGV2ZW50KTtcbn07XG5cbi8qKlxuICogVW5iaW5kIGFuIGV2ZW50IGJ5IHR5cGUgYW5kIGhhbmRsZXIuXG4gKiAgIFRoaXMgdW5kb2VzIHRoZSB3b3JrIG9mIFwib25cIi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kIHJlbW92ZUxpc3RlbmVyXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtmdW5jdGlvbn0gaGFuZGxlciBmdW5jdGlvbiBvYmplY3QgdG8gcmVtb3ZlXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IGludGVybmFsIGV2ZW50IGhhbmRsZXIgb2JqZWN0IChmb3IgY2hhaW5pbmcpXG4gKi9cbkVuZ2luZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKHR5cGUsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gZXZlbnRIYW5kbGVyLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGhhbmRsZXIpO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIGN1cnJlbnQgY2FsY3VsYXRlZCBmcmFtZXMgcGVyIHNlY29uZCBvZiB0aGUgRW5naW5lLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2QgZ2V0RlBTXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBjYWxjdWxhdGVkIGZwc1xuICovXG5FbmdpbmUuZ2V0RlBTID0gZnVuY3Rpb24gZ2V0RlBTKCkge1xuICAgIHJldHVybiAxMDAwIC8gZnJhbWVUaW1lO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIG1heGltdW0gZnBzIGF0IHdoaWNoIHRoZSBzeXN0ZW0gc2hvdWxkIHJ1bi4gSWYgaW50ZXJuYWwgcmVuZGVyXG4gKiAgICBsb29wIGlzIGNhbGxlZCBhdCBhIGdyZWF0ZXIgZnJlcXVlbmN5IHRoYW4gdGhpcyBGUFNDYXAsIEVuZ2luZSB3aWxsXG4gKiAgICB0aHJvdHRsZSByZW5kZXIgYW5kIHVwZGF0ZSB1bnRpbCB0aGlzIHJhdGUgaXMgYWNoaWV2ZWQuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZCBzZXRGUFNDYXBcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gZnBzIG1heGltdW0gZnJhbWVzIHBlciBzZWNvbmRcbiAqL1xuRW5naW5lLnNldEZQU0NhcCA9IGZ1bmN0aW9uIHNldEZQU0NhcChmcHMpIHtcbiAgICBmcmFtZVRpbWVMaW1pdCA9IE1hdGguZmxvb3IoMTAwMCAvIGZwcyk7XG59O1xuXG4vKipcbiAqIFJldHVybiBlbmdpbmUgb3B0aW9ucy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kIGdldE9wdGlvbnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqIEByZXR1cm4ge09iamVjdH0gZW5naW5lIG9wdGlvbnNcbiAqL1xuRW5naW5lLmdldE9wdGlvbnMgPSBmdW5jdGlvbiBnZXRPcHRpb25zKCkge1xuICAgIHJldHVybiBvcHRpb25zTWFuYWdlci5nZXRPcHRpb25zLmFwcGx5KG9wdGlvbnNNYW5hZ2VyLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBTZXQgZW5naW5lIG9wdGlvbnNcbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kIHNldE9wdGlvbnNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIG92ZXJyaWRlcyBvZiBkZWZhdWx0IG9wdGlvbnNcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5mcHNDYXBdICBtYXhpbXVtIGZwcyBhdCB3aGljaCB0aGUgc3lzdGVtIHNob3VsZCBydW5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMucnVuTG9vcD10cnVlXSB3aGV0aGVyIHRoZSBydW4gbG9vcCBzaG91bGQgY29udGludWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0aW9ucy5jb250YWluZXJUeXBlPVwiZGl2XCJdIHR5cGUgb2YgY29udGFpbmVyIGVsZW1lbnQuICBEZWZhdWx0cyB0byAnZGl2Jy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0aW9ucy5jb250YWluZXJDbGFzcz1cImZhbW91cy1jb250YWluZXJcIl0gdHlwZSBvZiBjb250YWluZXIgZWxlbWVudC4gIERlZmF1bHRzIHRvICdmYW1vdXMtY29udGFpbmVyJy5cbiAqL1xuRW5naW5lLnNldE9wdGlvbnMgPSBmdW5jdGlvbiBzZXRPcHRpb25zKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gb3B0aW9uc01hbmFnZXIuc2V0T3B0aW9ucy5hcHBseShvcHRpb25zTWFuYWdlciwgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBDb250ZXh0IGZvciByZW5kZXJpbmcgYW5kIGV2ZW50IGhhbmRsaW5nIHdpdGhcbiAqICAgIHByb3ZpZGVkIGRvY3VtZW50IGVsZW1lbnQgYXMgdG9wIG9mIGVhY2ggdHJlZS4gVGhpcyB3aWxsIGJlIHRyYWNrZWQgYnkgdGhlXG4gKiAgICBwcm9jZXNzLXdpZGUgRW5naW5lLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2QgY3JlYXRlQ29udGV4dFxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gZWwgd2lsbCBiZSB0b3Agb2YgRmFtby51cyBkb2N1bWVudCBlbGVtZW50IHRyZWVcbiAqIEByZXR1cm4ge0NvbnRleHR9IG5ldyBDb250ZXh0IHdpdGhpbiBlbFxuICovXG5FbmdpbmUuY3JlYXRlQ29udGV4dCA9IGZ1bmN0aW9uIGNyZWF0ZUNvbnRleHQoZWwpIHtcbiAgICB2YXIgbmVlZE1vdW50Q29udGFpbmVyID0gZmFsc2U7XG4gICAgaWYgKCFlbCkge1xuICAgICAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQob3B0aW9ucy5jb250YWluZXJUeXBlKTtcbiAgICAgICAgZWwuY2xhc3NMaXN0LmFkZChvcHRpb25zLmNvbnRhaW5lckNsYXNzKTtcbiAgICAgICAgbmVlZE1vdW50Q29udGFpbmVyID0gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIGNvbnRleHQgPSBuZXcgQ29udGV4dChlbCk7XG4gICAgRW5naW5lLnJlZ2lzdGVyQ29udGV4dChjb250ZXh0KTtcbiAgICBpZiAobmVlZE1vdW50Q29udGFpbmVyKSB7XG4gICAgICAgIEVuZ2luZS5uZXh0VGljayhmdW5jdGlvbihjb250ZXh0LCBlbCkge1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgICAgICBjb250ZXh0LmVtaXQoJ3Jlc2l6ZScpO1xuICAgICAgICB9LmJpbmQodGhpcywgY29udGV4dCwgZWwpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRleHQ7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVycyBhbiBleGlzdGluZyBjb250ZXh0IHRvIGJlIHVwZGF0ZWQgd2l0aGluIHRoZSBydW4gbG9vcC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kIHJlZ2lzdGVyQ29udGV4dFxuICpcbiAqIEBwYXJhbSB7Q29udGV4dH0gY29udGV4dCBDb250ZXh0IHRvIHJlZ2lzdGVyXG4gKiBAcmV0dXJuIHtGYW1vdXNDb250ZXh0fSBwcm92aWRlZCBjb250ZXh0XG4gKi9cbkVuZ2luZS5yZWdpc3RlckNvbnRleHQgPSBmdW5jdGlvbiByZWdpc3RlckNvbnRleHQoY29udGV4dCkge1xuICAgIGNvbnRleHRzLnB1c2goY29udGV4dCk7XG4gICAgcmV0dXJuIGNvbnRleHQ7XG59O1xuXG4vKipcbiAqIFF1ZXVlIGEgZnVuY3Rpb24gdG8gYmUgZXhlY3V0ZWQgb24gdGhlIG5leHQgdGljayBvZiB0aGVcbiAqICAgIEVuZ2luZS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kIG5leHRUaWNrXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbihPYmplY3QpfSBmbiBmdW5jdGlvbiBhY2NlcHRpbmcgd2luZG93IG9iamVjdFxuICovXG5FbmdpbmUubmV4dFRpY2sgPSBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgIG5leHRUaWNrUXVldWUucHVzaChmbik7XG59O1xuXG4vKipcbiAqIFF1ZXVlIGEgZnVuY3Rpb24gdG8gYmUgZXhlY3V0ZWQgc29tZXRpbWUgc29vbiwgYXQgYSB0aW1lIHRoYXQgaXNcbiAqICAgIHVubGlrZWx5IHRvIGFmZmVjdCBmcmFtZSByYXRlLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2QgZGVmZXJcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICovXG5FbmdpbmUuZGVmZXIgPSBmdW5jdGlvbiBkZWZlcihmbikge1xuICAgIGRlZmVyUXVldWUucHVzaChmbik7XG59O1xuXG5vcHRpb25zTWFuYWdlci5vbignY2hhbmdlJywgZnVuY3Rpb24oZGF0YSkge1xuICAgIGlmIChkYXRhLmlkID09PSAnZnBzQ2FwJykgRW5naW5lLnNldEZQU0NhcChkYXRhLnZhbHVlKTtcbiAgICBlbHNlIGlmIChkYXRhLmlkID09PSAncnVuTG9vcCcpIHtcbiAgICAgICAgLy8ga2ljayBvZmYgdGhlIGxvb3Agb25seSBpZiBpdCB3YXMgc3RvcHBlZFxuICAgICAgICBpZiAoIWxvb3BFbmFibGVkICYmIGRhdGEudmFsdWUpIHtcbiAgICAgICAgICAgIGxvb3BFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobG9vcCk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbmdpbmU7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvY29yZS9FbmdpbmUuanNcIixcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL2NvcmVcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyOiBtYXJrQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cblxuXG4vKipcbiAqIEEgc2luZ2xldG9uIHRoYXQgbWFpbnRhaW5zIGEgZ2xvYmFsIHJlZ2lzdHJ5IG9mIFN1cmZhY2VzLlxuICogICBQcml2YXRlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAc3RhdGljXG4gKiBAY2xhc3MgRW50aXR5XG4gKi9cblxudmFyIGVudGl0aWVzID0gW107XG5cbi8qKlxuICogR2V0IGVudGl0eSBmcm9tIGdsb2JhbCBpbmRleC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG1ldGhvZCBnZXRcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZCBlbnRpdHkgcmVpZ3N0cmF0aW9uIGlkXG4gKiBAcmV0dXJuIHtTdXJmYWNlfSBlbnRpdHkgaW4gdGhlIGdsb2JhbCBpbmRleFxuICovXG5mdW5jdGlvbiBnZXQoaWQpIHtcbiAgICByZXR1cm4gZW50aXRpZXNbaWRdO1xufVxuXG4vKipcbiAqIE92ZXJ3cml0ZSBlbnRpdHkgaW4gdGhlIGdsb2JhbCBpbmRleFxuICpcbiAqIEBwcml2YXRlXG4gKiBAbWV0aG9kIHNldFxuICogQHBhcmFtIHtOdW1iZXJ9IGlkIGVudGl0eSByZWlnc3RyYXRpb24gaWRcbiAqIEByZXR1cm4ge1N1cmZhY2V9IGVudGl0eSB0byBhZGQgdG8gdGhlIGdsb2JhbCBpbmRleFxuICovXG5mdW5jdGlvbiBzZXQoaWQsIGVudGl0eSkge1xuICAgIGVudGl0aWVzW2lkXSA9IGVudGl0eTtcbn1cblxuLyoqXG4gKiBBZGQgZW50aXR5IHRvIGdsb2JhbCBpbmRleFxuICpcbiAqIEBwcml2YXRlXG4gKiBAbWV0aG9kIHJlZ2lzdGVyXG4gKiBAcGFyYW0ge1N1cmZhY2V9IGVudGl0eSB0byBhZGQgdG8gZ2xvYmFsIGluZGV4XG4gKiBAcmV0dXJuIHtOdW1iZXJ9IG5ldyBpZFxuICovXG5mdW5jdGlvbiByZWdpc3RlcihlbnRpdHkpIHtcbiAgICB2YXIgaWQgPSBlbnRpdGllcy5sZW5ndGg7XG4gICAgc2V0KGlkLCBlbnRpdHkpO1xuICAgIHJldHVybiBpZDtcbn1cblxuLyoqXG4gKiBSZW1vdmUgZW50aXR5IGZyb20gZ2xvYmFsIGluZGV4XG4gKlxuICogQHByaXZhdGVcbiAqIEBtZXRob2QgdW5yZWdpc3RlclxuICogQHBhcmFtIHtOdW1iZXJ9IGlkIGVudGl0eSByZWlnc3RyYXRpb24gaWRcbiAqL1xuZnVuY3Rpb24gdW5yZWdpc3RlcihpZCkge1xuICAgIHNldChpZCwgbnVsbCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHJlZ2lzdGVyOiByZWdpc3RlcixcbiAgICB1bnJlZ2lzdGVyOiB1bnJlZ2lzdGVyLFxuICAgIGdldDogZ2V0LFxuICAgIHNldDogc2V0XG59O1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvRW50aXR5LmpzXCIsXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogbWFya0BmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG5cblxuLyoqXG4gKiBFdmVudEVtaXR0ZXIgcmVwcmVzZW50cyBhIGNoYW5uZWwgZm9yIGV2ZW50cy5cbiAqXG4gKiBAY2xhc3MgRXZlbnRFbWl0dGVyXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICAgIHRoaXMubGlzdGVuZXJzID0ge307XG4gICAgdGhpcy5fb3duZXIgPSB0aGlzO1xufVxuXG4vKipcbiAqIFRyaWdnZXIgYW4gZXZlbnQsIHNlbmRpbmcgdG8gYWxsIGRvd25zdHJlYW0gaGFuZGxlcnNcbiAqICAgbGlzdGVuaW5nIGZvciBwcm92aWRlZCAndHlwZScga2V5LlxuICpcbiAqIEBtZXRob2QgZW1pdFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCBldmVudCBkYXRhXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHRoaXNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gZW1pdCh0eXBlLCBldmVudCkge1xuICAgIHZhciBoYW5kbGVycyA9IHRoaXMubGlzdGVuZXJzW3R5cGVdO1xuICAgIGlmIChoYW5kbGVycykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBoYW5kbGVyc1tpXS5jYWxsKHRoaXMuX293bmVyLCBldmVudCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEJpbmQgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBhbiBldmVudCB0eXBlIGhhbmRsZWQgYnkgdGhpcyBvYmplY3QuXG4gKlxuICogQG1ldGhvZCBcIm9uXCJcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBldmVudCB0eXBlIGtleSAoZm9yIGV4YW1wbGUsICdjbGljaycpXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHN0cmluZywgT2JqZWN0KX0gaGFuZGxlciBjYWxsYmFja1xuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSB0aGlzXG4gKi9cbiAgIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbih0eXBlLCBoYW5kbGVyKSB7XG4gICAgaWYgKCEodHlwZSBpbiB0aGlzLmxpc3RlbmVycykpIHRoaXMubGlzdGVuZXJzW3R5cGVdID0gW107XG4gICAgdmFyIGluZGV4ID0gdGhpcy5saXN0ZW5lcnNbdHlwZV0uaW5kZXhPZihoYW5kbGVyKTtcbiAgICBpZiAoaW5kZXggPCAwKSB0aGlzLmxpc3RlbmVyc1t0eXBlXS5wdXNoKGhhbmRsZXIpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgXCJvblwiLlxuICogQG1ldGhvZCBhZGRMaXN0ZW5lclxuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuICAgLyoqXG4gKiBVbmJpbmQgYW4gZXZlbnQgYnkgdHlwZSBhbmQgaGFuZGxlci5cbiAqICAgVGhpcyB1bmRvZXMgdGhlIHdvcmsgb2YgXCJvblwiLlxuICpcbiAqIEBtZXRob2QgcmVtb3ZlTGlzdGVuZXJcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBldmVudCB0eXBlIGtleSAoZm9yIGV4YW1wbGUsICdjbGljaycpXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBoYW5kbGVyIGZ1bmN0aW9uIG9iamVjdCB0byByZW1vdmVcbiAqIEByZXR1cm4ge0V2ZW50RW1pdHRlcn0gdGhpc1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIodHlwZSwgaGFuZGxlcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMubGlzdGVuZXJzW3R5cGVdLmluZGV4T2YoaGFuZGxlcik7XG4gICAgaWYgKGluZGV4ID49IDApIHRoaXMubGlzdGVuZXJzW3R5cGVdLnNwbGljZShpbmRleCwgMSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENhbGwgZXZlbnQgaGFuZGxlcnMgd2l0aCB0aGlzIHNldCB0byBvd25lci5cbiAqXG4gKiBAbWV0aG9kIGJpbmRUaGlzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG93bmVyIG9iamVjdCB0aGlzIEV2ZW50RW1pdHRlciBiZWxvbmdzIHRvXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYmluZFRoaXMgPSBmdW5jdGlvbiBiaW5kVGhpcyhvd25lcikge1xuICAgIHRoaXMuX293bmVyID0gb3duZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL0V2ZW50RW1pdHRlci5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvY29yZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IG1hcmtAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4vRXZlbnRFbWl0dGVyJyk7XG5cbi8qKlxuICogRXZlbnRIYW5kbGVyIGZvcndhcmRzIHJlY2VpdmVkIGV2ZW50cyB0byBhIHNldCBvZiBwcm92aWRlZCBjYWxsYmFjayBmdW5jdGlvbnMuXG4gKiBJdCBhbGxvd3MgZXZlbnRzIHRvIGJlIGNhcHR1cmVkLCBwcm9jZXNzZWQsIGFuZCBvcHRpb25hbGx5IHBpcGVkIHRocm91Z2ggdG8gb3RoZXIgZXZlbnQgaGFuZGxlcnMuXG4gKlxuICogQGNsYXNzIEV2ZW50SGFuZGxlclxuICogQGV4dGVuZHMgRXZlbnRFbWl0dGVyXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRXZlbnRIYW5kbGVyKCkge1xuICAgIEV2ZW50RW1pdHRlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5kb3duc3RyZWFtID0gW107IC8vIGRvd25zdHJlYW0gZXZlbnQgaGFuZGxlcnNcbiAgICB0aGlzLmRvd25zdHJlYW1GbiA9IFtdOyAvLyBkb3duc3RyZWFtIGZ1bmN0aW9uc1xuXG4gICAgdGhpcy51cHN0cmVhbSA9IFtdOyAvLyB1cHN0cmVhbSBldmVudCBoYW5kbGVyc1xuICAgIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnMgPSB7fTsgLy8gdXBzdHJlYW0gbGlzdGVuZXJzXG59XG5FdmVudEhhbmRsZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudEVtaXR0ZXIucHJvdG90eXBlKTtcbkV2ZW50SGFuZGxlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBFdmVudEhhbmRsZXI7XG5cbi8qKlxuICogQXNzaWduIGFuIGV2ZW50IGhhbmRsZXIgdG8gcmVjZWl2ZSBhbiBvYmplY3QncyBpbnB1dCBldmVudHMuXG4gKlxuICogQG1ldGhvZCBzZXRJbnB1dEhhbmRsZXJcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IG9iamVjdCB0byBtaXggdHJpZ2dlciwgc3Vic2NyaWJlLCBhbmQgdW5zdWJzY3JpYmUgZnVuY3Rpb25zIGludG9cbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSBoYW5kbGVyIGFzc2lnbmVkIGV2ZW50IGhhbmRsZXJcbiAqL1xuRXZlbnRIYW5kbGVyLnNldElucHV0SGFuZGxlciA9IGZ1bmN0aW9uIHNldElucHV0SGFuZGxlcihvYmplY3QsIGhhbmRsZXIpIHtcbiAgICBvYmplY3QudHJpZ2dlciA9IGhhbmRsZXIudHJpZ2dlci5iaW5kKGhhbmRsZXIpO1xuICAgIGlmIChoYW5kbGVyLnN1YnNjcmliZSAmJiBoYW5kbGVyLnVuc3Vic2NyaWJlKSB7XG4gICAgICAgIG9iamVjdC5zdWJzY3JpYmUgPSBoYW5kbGVyLnN1YnNjcmliZS5iaW5kKGhhbmRsZXIpO1xuICAgICAgICBvYmplY3QudW5zdWJzY3JpYmUgPSBoYW5kbGVyLnVuc3Vic2NyaWJlLmJpbmQoaGFuZGxlcik7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBc3NpZ24gYW4gZXZlbnQgaGFuZGxlciB0byByZWNlaXZlIGFuIG9iamVjdCdzIG91dHB1dCBldmVudHMuXG4gKlxuICogQG1ldGhvZCBzZXRPdXRwdXRIYW5kbGVyXG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBvYmplY3QgdG8gbWl4IHBpcGUsIHVucGlwZSwgb24sIGFkZExpc3RlbmVyLCBhbmQgcmVtb3ZlTGlzdGVuZXIgZnVuY3Rpb25zIGludG9cbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSBoYW5kbGVyIGFzc2lnbmVkIGV2ZW50IGhhbmRsZXJcbiAqL1xuRXZlbnRIYW5kbGVyLnNldE91dHB1dEhhbmRsZXIgPSBmdW5jdGlvbiBzZXRPdXRwdXRIYW5kbGVyKG9iamVjdCwgaGFuZGxlcikge1xuICAgIGlmIChoYW5kbGVyIGluc3RhbmNlb2YgRXZlbnRIYW5kbGVyKSBoYW5kbGVyLmJpbmRUaGlzKG9iamVjdCk7XG4gICAgb2JqZWN0LnBpcGUgPSBoYW5kbGVyLnBpcGUuYmluZChoYW5kbGVyKTtcbiAgICBvYmplY3QudW5waXBlID0gaGFuZGxlci51bnBpcGUuYmluZChoYW5kbGVyKTtcbiAgICBvYmplY3Qub24gPSBoYW5kbGVyLm9uLmJpbmQoaGFuZGxlcik7XG4gICAgb2JqZWN0LmFkZExpc3RlbmVyID0gb2JqZWN0Lm9uO1xuICAgIG9iamVjdC5yZW1vdmVMaXN0ZW5lciA9IGhhbmRsZXIucmVtb3ZlTGlzdGVuZXIuYmluZChoYW5kbGVyKTtcbn07XG5cbi8qKlxuICogVHJpZ2dlciBhbiBldmVudCwgc2VuZGluZyB0byBhbGwgZG93bnN0cmVhbSBoYW5kbGVyc1xuICogICBsaXN0ZW5pbmcgZm9yIHByb3ZpZGVkICd0eXBlJyBrZXkuXG4gKlxuICogQG1ldGhvZCBlbWl0XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IGV2ZW50IGRhdGFcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KHR5cGUsIGV2ZW50KSB7XG4gICAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdmFyIGkgPSAwO1xuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmRvd25zdHJlYW0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXMuZG93bnN0cmVhbVtpXS50cmlnZ2VyKSB0aGlzLmRvd25zdHJlYW1baV0udHJpZ2dlcih0eXBlLCBldmVudCk7XG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmRvd25zdHJlYW1Gbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmRvd25zdHJlYW1GbltpXSh0eXBlLCBldmVudCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgZW1pdFxuICogQG1ldGhvZCBhZGRMaXN0ZW5lclxuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLnRyaWdnZXIgPSBFdmVudEhhbmRsZXIucHJvdG90eXBlLmVtaXQ7XG5cbi8qKlxuICogQWRkIGV2ZW50IGhhbmRsZXIgb2JqZWN0IHRvIHNldCBvZiBkb3duc3RyZWFtIGhhbmRsZXJzLlxuICpcbiAqIEBtZXRob2QgcGlwZVxuICpcbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSB0YXJnZXQgZXZlbnQgaGFuZGxlciB0YXJnZXQgb2JqZWN0XG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHBhc3NlZCBldmVudCBoYW5kbGVyXG4gKi9cbkV2ZW50SGFuZGxlci5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uIHBpcGUodGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldC5zdWJzY3JpYmUgaW5zdGFuY2VvZiBGdW5jdGlvbikgcmV0dXJuIHRhcmdldC5zdWJzY3JpYmUodGhpcyk7XG5cbiAgICB2YXIgZG93bnN0cmVhbUN0eCA9ICh0YXJnZXQgaW5zdGFuY2VvZiBGdW5jdGlvbikgPyB0aGlzLmRvd25zdHJlYW1GbiA6IHRoaXMuZG93bnN0cmVhbTtcbiAgICB2YXIgaW5kZXggPSBkb3duc3RyZWFtQ3R4LmluZGV4T2YodGFyZ2V0KTtcbiAgICBpZiAoaW5kZXggPCAwKSBkb3duc3RyZWFtQ3R4LnB1c2godGFyZ2V0KTtcblxuICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBGdW5jdGlvbikgdGFyZ2V0KCdwaXBlJywgbnVsbCk7XG4gICAgZWxzZSBpZiAodGFyZ2V0LnRyaWdnZXIpIHRhcmdldC50cmlnZ2VyKCdwaXBlJywgbnVsbCk7XG5cbiAgICByZXR1cm4gdGFyZ2V0O1xufTtcblxuLyoqXG4gKiBSZW1vdmUgaGFuZGxlciBvYmplY3QgZnJvbSBzZXQgb2YgZG93bnN0cmVhbSBoYW5kbGVycy5cbiAqICAgVW5kb2VzIHdvcmsgb2YgXCJwaXBlXCIuXG4gKlxuICogQG1ldGhvZCB1bnBpcGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gdGFyZ2V0IHRhcmdldCBoYW5kbGVyIG9iamVjdFxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBwcm92aWRlZCB0YXJnZXRcbiAqL1xuRXZlbnRIYW5kbGVyLnByb3RvdHlwZS51bnBpcGUgPSBmdW5jdGlvbiB1bnBpcGUodGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldC51bnN1YnNjcmliZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSByZXR1cm4gdGFyZ2V0LnVuc3Vic2NyaWJlKHRoaXMpO1xuXG4gICAgdmFyIGRvd25zdHJlYW1DdHggPSAodGFyZ2V0IGluc3RhbmNlb2YgRnVuY3Rpb24pID8gdGhpcy5kb3duc3RyZWFtRm4gOiB0aGlzLmRvd25zdHJlYW07XG4gICAgdmFyIGluZGV4ID0gZG93bnN0cmVhbUN0eC5pbmRleE9mKHRhcmdldCk7XG4gICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgZG93bnN0cmVhbUN0eC5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgRnVuY3Rpb24pIHRhcmdldCgndW5waXBlJywgbnVsbCk7XG4gICAgICAgIGVsc2UgaWYgKHRhcmdldC50cmlnZ2VyKSB0YXJnZXQudHJpZ2dlcigndW5waXBlJywgbnVsbCk7XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuICAgIGVsc2UgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBCaW5kIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYW4gZXZlbnQgdHlwZSBoYW5kbGVkIGJ5IHRoaXMgb2JqZWN0LlxuICpcbiAqIEBtZXRob2QgXCJvblwiXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtmdW5jdGlvbihzdHJpbmcsIE9iamVjdCl9IGhhbmRsZXIgY2FsbGJhY2tcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24odHlwZSwgaGFuZGxlcikge1xuICAgIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAoISh0eXBlIGluIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnMpKSB7XG4gICAgICAgIHZhciB1cHN0cmVhbUxpc3RlbmVyID0gdGhpcy50cmlnZ2VyLmJpbmQodGhpcywgdHlwZSk7XG4gICAgICAgIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnNbdHlwZV0gPSB1cHN0cmVhbUxpc3RlbmVyO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudXBzdHJlYW0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMudXBzdHJlYW1baV0ub24odHlwZSwgdXBzdHJlYW1MaXN0ZW5lcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBcIm9uXCJcbiAqIEBtZXRob2QgYWRkTGlzdGVuZXJcbiAqL1xuRXZlbnRIYW5kbGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50SGFuZGxlci5wcm90b3R5cGUub247XG5cbi8qKlxuICogTGlzdGVuIGZvciBldmVudHMgZnJvbSBhbiB1cHN0cmVhbSBldmVudCBoYW5kbGVyLlxuICpcbiAqIEBtZXRob2Qgc3Vic2NyaWJlXG4gKlxuICogQHBhcmFtIHtFdmVudEVtaXR0ZXJ9IHNvdXJjZSBzb3VyY2UgZW1pdHRlciBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLnN1YnNjcmliZSA9IGZ1bmN0aW9uIHN1YnNjcmliZShzb3VyY2UpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLnVwc3RyZWFtLmluZGV4T2Yoc291cmNlKTtcbiAgICBpZiAoaW5kZXggPCAwKSB7XG4gICAgICAgIHRoaXMudXBzdHJlYW0ucHVzaChzb3VyY2UpO1xuICAgICAgICBmb3IgKHZhciB0eXBlIGluIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIHNvdXJjZS5vbih0eXBlLCB0aGlzLnVwc3RyZWFtTGlzdGVuZXJzW3R5cGVdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU3RvcCBsaXN0ZW5pbmcgdG8gZXZlbnRzIGZyb20gYW4gdXBzdHJlYW0gZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBAbWV0aG9kIHVuc3Vic2NyaWJlXG4gKlxuICogQHBhcmFtIHtFdmVudEVtaXR0ZXJ9IHNvdXJjZSBzb3VyY2UgZW1pdHRlciBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gdGhpc1xuICovXG5FdmVudEhhbmRsZXIucHJvdG90eXBlLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gdW5zdWJzY3JpYmUoc291cmNlKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy51cHN0cmVhbS5pbmRleE9mKHNvdXJjZSk7XG4gICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgdGhpcy51cHN0cmVhbS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICBmb3IgKHZhciB0eXBlIGluIHRoaXMudXBzdHJlYW1MaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIHNvdXJjZS5yZW1vdmVMaXN0ZW5lcih0eXBlLCB0aGlzLnVwc3RyZWFtTGlzdGVuZXJzW3R5cGVdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRIYW5kbGVyO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL2NvcmUvRXZlbnRIYW5kbGVyLmpzXCIsXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogbWFya0BmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9UcmFuc2Zvcm0nKTtcbnZhciBUcmFuc2l0aW9uYWJsZSA9IHJlcXVpcmUoJy4uL3RyYW5zaXRpb25zL1RyYW5zaXRpb25hYmxlJyk7XG52YXIgVHJhbnNpdGlvbmFibGVUcmFuc2Zvcm0gPSByZXF1aXJlKCcuLi90cmFuc2l0aW9ucy9UcmFuc2l0aW9uYWJsZVRyYW5zZm9ybScpO1xuXG4vKipcbiAqXG4gKiAgQSBjb2xsZWN0aW9uIG9mIHZpc3VhbCBjaGFuZ2VzIHRvIGJlXG4gKiAgICBhcHBsaWVkIHRvIGFub3RoZXIgcmVuZGVyYWJsZSBjb21wb25lbnQuIFRoaXMgY29sbGVjdGlvbiBpbmNsdWRlcyBhXG4gKiAgICB0cmFuc2Zvcm0gbWF0cml4LCBhbiBvcGFjaXR5IGNvbnN0YW50LCBhIHNpemUsIGFuIG9yaWdpbiBzcGVjaWZpZXIuXG4gKiAgICBNb2RpZmllciBvYmplY3RzIGNhbiBiZSBhZGRlZCB0byBhbnkgUmVuZGVyTm9kZSBvciBvYmplY3RcbiAqICAgIGNhcGFibGUgb2YgZGlzcGxheWluZyByZW5kZXJhYmxlcy4gIFRoZSBNb2RpZmllcidzIGNoaWxkcmVuIGFuZCBkZXNjZW5kYW50c1xuICogICAgYXJlIHRyYW5zZm9ybWVkIGJ5IHRoZSBhbW91bnRzIHNwZWNpZmllZCBpbiB0aGUgTW9kaWZpZXIncyBwcm9wZXJ0aWVzLlxuICpcbiAqIEBjbGFzcyBNb2RpZmllclxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIG92ZXJyaWRlcyBvZiBkZWZhdWx0IG9wdGlvbnNcbiAqIEBwYXJhbSB7VHJhbnNmb3JtfSBbb3B0aW9ucy50cmFuc2Zvcm1dIGFmZmluZSB0cmFuc2Zvcm1hdGlvbiBtYXRyaXhcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5vcGFjaXR5XVxuICogQHBhcmFtIHtBcnJheS5OdW1iZXJ9IFtvcHRpb25zLm9yaWdpbl0gb3JpZ2luIGFkanVzdG1lbnRcbiAqIEBwYXJhbSB7QXJyYXkuTnVtYmVyfSBbb3B0aW9ucy5zaXplXSBzaXplIHRvIGFwcGx5IHRvIGRlc2NlbmRhbnRzXG4gKi9cbmZ1bmN0aW9uIE1vZGlmaWVyKG9wdGlvbnMpIHtcbiAgICB0aGlzLl90cmFuc2Zvcm1HZXR0ZXIgPSBudWxsO1xuICAgIHRoaXMuX29wYWNpdHlHZXR0ZXIgPSBudWxsO1xuICAgIHRoaXMuX29yaWdpbkdldHRlciA9IG51bGw7XG4gICAgdGhpcy5fYWxpZ25HZXR0ZXIgPSBudWxsO1xuICAgIHRoaXMuX3NpemVHZXR0ZXIgPSBudWxsO1xuXG4gICAgLyogVE9ETzogcmVtb3ZlIHRoaXMgd2hlbiBkZXByZWNhdGlvbiBjb21wbGV0ZSAqL1xuICAgIHRoaXMuX2xlZ2FjeVN0YXRlcyA9IHt9O1xuXG4gICAgdGhpcy5fb3V0cHV0ID0ge1xuICAgICAgICB0cmFuc2Zvcm06IFRyYW5zZm9ybS5pZGVudGl0eSxcbiAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgb3JpZ2luOiBudWxsLFxuICAgICAgICBhbGlnbjogbnVsbCxcbiAgICAgICAgc2l6ZTogbnVsbCxcbiAgICAgICAgdGFyZ2V0OiBudWxsXG4gICAgfTtcblxuICAgIGlmIChvcHRpb25zKSB7XG4gICAgICAgIGlmIChvcHRpb25zLnRyYW5zZm9ybSkgdGhpcy50cmFuc2Zvcm1Gcm9tKG9wdGlvbnMudHJhbnNmb3JtKTtcbiAgICAgICAgaWYgKG9wdGlvbnMub3BhY2l0eSAhPT0gdW5kZWZpbmVkKSB0aGlzLm9wYWNpdHlGcm9tKG9wdGlvbnMub3BhY2l0eSk7XG4gICAgICAgIGlmIChvcHRpb25zLm9yaWdpbikgdGhpcy5vcmlnaW5Gcm9tKG9wdGlvbnMub3JpZ2luKTtcbiAgICAgICAgaWYgKG9wdGlvbnMuYWxpZ24pIHRoaXMuYWxpZ25Gcm9tKG9wdGlvbnMuYWxpZ24pO1xuICAgICAgICBpZiAob3B0aW9ucy5zaXplKSB0aGlzLnNpemVGcm9tKG9wdGlvbnMuc2l6ZSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uLCBvYmplY3QsIG9yIHN0YXRpYyB0cmFuc2Zvcm0gbWF0cml4IHdoaWNoIHByb3ZpZGVzIHRoZSB0cmFuc2Zvcm0uXG4gKiAgIFRoaXMgaXMgZXZhbHVhdGVkIG9uIGV2ZXJ5IHRpY2sgb2YgdGhlIGVuZ2luZS5cbiAqXG4gKiBAbWV0aG9kIHRyYW5zZm9ybUZyb21cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdHJhbnNmb3JtIHRyYW5zZm9ybSBwcm92aWRlciBvYmplY3RcbiAqIEByZXR1cm4ge01vZGlmaWVyfSB0aGlzXG4gKi9cbk1vZGlmaWVyLnByb3RvdHlwZS50cmFuc2Zvcm1Gcm9tID0gZnVuY3Rpb24gdHJhbnNmb3JtRnJvbSh0cmFuc2Zvcm0pIHtcbiAgICBpZiAodHJhbnNmb3JtIGluc3RhbmNlb2YgRnVuY3Rpb24pIHRoaXMuX3RyYW5zZm9ybUdldHRlciA9IHRyYW5zZm9ybTtcbiAgICBlbHNlIGlmICh0cmFuc2Zvcm0gaW5zdGFuY2VvZiBPYmplY3QgJiYgdHJhbnNmb3JtLmdldCkgdGhpcy5fdHJhbnNmb3JtR2V0dGVyID0gdHJhbnNmb3JtLmdldC5iaW5kKHRyYW5zZm9ybSk7XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3RyYW5zZm9ybUdldHRlciA9IG51bGw7XG4gICAgICAgIHRoaXMuX291dHB1dC50cmFuc2Zvcm0gPSB0cmFuc2Zvcm07XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgZnVuY3Rpb24sIG9iamVjdCwgb3IgbnVtYmVyIHRvIHByb3ZpZGUgb3BhY2l0eSwgaW4gcmFuZ2UgWzAsMV0uXG4gKlxuICogQG1ldGhvZCBvcGFjaXR5RnJvbVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcGFjaXR5IHByb3ZpZGVyIG9iamVjdFxuICogQHJldHVybiB7TW9kaWZpZXJ9IHRoaXNcbiAqL1xuTW9kaWZpZXIucHJvdG90eXBlLm9wYWNpdHlGcm9tID0gZnVuY3Rpb24gb3BhY2l0eUZyb20ob3BhY2l0eSkge1xuICAgIGlmIChvcGFjaXR5IGluc3RhbmNlb2YgRnVuY3Rpb24pIHRoaXMuX29wYWNpdHlHZXR0ZXIgPSBvcGFjaXR5O1xuICAgIGVsc2UgaWYgKG9wYWNpdHkgaW5zdGFuY2VvZiBPYmplY3QgJiYgb3BhY2l0eS5nZXQpIHRoaXMuX29wYWNpdHlHZXR0ZXIgPSBvcGFjaXR5LmdldC5iaW5kKG9wYWNpdHkpO1xuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9vcGFjaXR5R2V0dGVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fb3V0cHV0Lm9wYWNpdHkgPSBvcGFjaXR5O1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IGZ1bmN0aW9uLCBvYmplY3QsIG9yIG51bWVyaWNhbCBhcnJheSB0byBwcm92aWRlIG9yaWdpbiwgYXMgW3gseV0sXG4gKiAgIHdoZXJlIHggYW5kIHkgYXJlIGluIHRoZSByYW5nZSBbMCwxXS5cbiAqXG4gKiBAbWV0aG9kIG9yaWdpbkZyb21cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3JpZ2luIHByb3ZpZGVyIG9iamVjdFxuICogQHJldHVybiB7TW9kaWZpZXJ9IHRoaXNcbiAqL1xuTW9kaWZpZXIucHJvdG90eXBlLm9yaWdpbkZyb20gPSBmdW5jdGlvbiBvcmlnaW5Gcm9tKG9yaWdpbikge1xuICAgIGlmIChvcmlnaW4gaW5zdGFuY2VvZiBGdW5jdGlvbikgdGhpcy5fb3JpZ2luR2V0dGVyID0gb3JpZ2luO1xuICAgIGVsc2UgaWYgKG9yaWdpbiBpbnN0YW5jZW9mIE9iamVjdCAmJiBvcmlnaW4uZ2V0KSB0aGlzLl9vcmlnaW5HZXR0ZXIgPSBvcmlnaW4uZ2V0LmJpbmQob3JpZ2luKTtcbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fb3JpZ2luR2V0dGVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fb3V0cHV0Lm9yaWdpbiA9IG9yaWdpbjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBmdW5jdGlvbiwgb2JqZWN0LCBvciBudW1lcmljYWwgYXJyYXkgdG8gcHJvdmlkZSBhbGlnbiwgYXMgW3gseV0sXG4gKiAgIHdoZXJlIHggYW5kIHkgYXJlIGluIHRoZSByYW5nZSBbMCwxXS5cbiAqXG4gKiBAbWV0aG9kIGFsaWduRnJvbVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBhbGlnbiBwcm92aWRlciBvYmplY3RcbiAqIEByZXR1cm4ge01vZGlmaWVyfSB0aGlzXG4gKi9cbk1vZGlmaWVyLnByb3RvdHlwZS5hbGlnbkZyb20gPSBmdW5jdGlvbiBhbGlnbkZyb20oYWxpZ24pIHtcbiAgICBpZiAoYWxpZ24gaW5zdGFuY2VvZiBGdW5jdGlvbikgdGhpcy5fYWxpZ25HZXR0ZXIgPSBhbGlnbjtcbiAgICBlbHNlIGlmIChhbGlnbiBpbnN0YW5jZW9mIE9iamVjdCAmJiBhbGlnbi5nZXQpIHRoaXMuX2FsaWduR2V0dGVyID0gYWxpZ24uZ2V0LmJpbmQoYWxpZ24pO1xuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9hbGlnbkdldHRlciA9IG51bGw7XG4gICAgICAgIHRoaXMuX291dHB1dC5hbGlnbiA9IGFsaWduO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IGZ1bmN0aW9uLCBvYmplY3QsIG9yIG51bWVyaWNhbCBhcnJheSB0byBwcm92aWRlIHNpemUsIGFzIFt3aWR0aCwgaGVpZ2h0XS5cbiAqXG4gKiBAbWV0aG9kIHNpemVGcm9tXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHNpemUgcHJvdmlkZXIgb2JqZWN0XG4gKiBAcmV0dXJuIHtNb2RpZmllcn0gdGhpc1xuICovXG5Nb2RpZmllci5wcm90b3R5cGUuc2l6ZUZyb20gPSBmdW5jdGlvbiBzaXplRnJvbShzaXplKSB7XG4gICAgaWYgKHNpemUgaW5zdGFuY2VvZiBGdW5jdGlvbikgdGhpcy5fc2l6ZUdldHRlciA9IHNpemU7XG4gICAgZWxzZSBpZiAoc2l6ZSBpbnN0YW5jZW9mIE9iamVjdCAmJiBzaXplLmdldCkgdGhpcy5fc2l6ZUdldHRlciA9IHNpemUuZ2V0LmJpbmQoc2l6ZSk7XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3NpemVHZXR0ZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9vdXRwdXQuc2l6ZSA9IHNpemU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuIC8qKlxuICogRGVwcmVjYXRlZDogUHJlZmVyIHRyYW5zZm9ybUZyb20gd2l0aCBzdGF0aWMgVHJhbnNmb3JtLCBvciB1c2UgYSBUcmFuc2l0aW9uYWJsZVRyYW5zZm9ybS5cbiAqIEBkZXByZWNhdGVkXG4gKiBAbWV0aG9kIHNldFRyYW5zZm9ybVxuICpcbiAqIEBwYXJhbSB7VHJhbnNmb3JtfSB0cmFuc2Zvcm0gVHJhbnNmb3JtIHRvIHRyYW5zaXRpb24gdG9cbiAqIEBwYXJhbSB7VHJhbnNpdGlvbmFibGV9IHRyYW5zaXRpb24gVmFsaWQgdHJhbnNpdGlvbmFibGUgb2JqZWN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBjYWxsYmFjayB0byBjYWxsIGFmdGVyIHRyYW5zaXRpb24gY29tcGxldGVzXG4gKiBAcmV0dXJuIHtNb2RpZmllcn0gdGhpc1xuICovXG5Nb2RpZmllci5wcm90b3R5cGUuc2V0VHJhbnNmb3JtID0gZnVuY3Rpb24gc2V0VHJhbnNmb3JtKHRyYW5zZm9ybSwgdHJhbnNpdGlvbiwgY2FsbGJhY2spIHtcbiAgICBpZiAodHJhbnNpdGlvbiB8fCB0aGlzLl9sZWdhY3lTdGF0ZXMudHJhbnNmb3JtKSB7XG4gICAgICAgIGlmICghdGhpcy5fbGVnYWN5U3RhdGVzLnRyYW5zZm9ybSkge1xuICAgICAgICAgICAgdGhpcy5fbGVnYWN5U3RhdGVzLnRyYW5zZm9ybSA9IG5ldyBUcmFuc2l0aW9uYWJsZVRyYW5zZm9ybSh0aGlzLl9vdXRwdXQudHJhbnNmb3JtKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMuX3RyYW5zZm9ybUdldHRlcikgdGhpcy50cmFuc2Zvcm1Gcm9tKHRoaXMuX2xlZ2FjeVN0YXRlcy50cmFuc2Zvcm0pO1xuXG4gICAgICAgIHRoaXMuX2xlZ2FjeVN0YXRlcy50cmFuc2Zvcm0uc2V0KHRyYW5zZm9ybSwgdHJhbnNpdGlvbiwgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgZWxzZSByZXR1cm4gdGhpcy50cmFuc2Zvcm1Gcm9tKHRyYW5zZm9ybSk7XG59O1xuXG4vKipcbiAqIERlcHJlY2F0ZWQ6IFByZWZlciBvcGFjaXR5RnJvbSB3aXRoIHN0YXRpYyBvcGFjaXR5IGFycmF5LCBvciB1c2UgYSBUcmFuc2l0aW9uYWJsZSB3aXRoIHRoYXQgb3BhY2l0eS5cbiAqIEBkZXByZWNhdGVkXG4gKiBAbWV0aG9kIHNldE9wYWNpdHlcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gb3BhY2l0eSBPcGFjaXR5IHZhbHVlIHRvIHRyYW5zaXRpb24gdG8uXG4gKiBAcGFyYW0ge1RyYW5zaXRpb25hYmxlfSB0cmFuc2l0aW9uIFZhbGlkIHRyYW5zaXRpb25hYmxlIG9iamVjdFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgY2FsbGJhY2sgdG8gY2FsbCBhZnRlciB0cmFuc2l0aW9uIGNvbXBsZXRlc1xuICogQHJldHVybiB7TW9kaWZpZXJ9IHRoaXNcbiAqL1xuTW9kaWZpZXIucHJvdG90eXBlLnNldE9wYWNpdHkgPSBmdW5jdGlvbiBzZXRPcGFjaXR5KG9wYWNpdHksIHRyYW5zaXRpb24sIGNhbGxiYWNrKSB7XG4gICAgaWYgKHRyYW5zaXRpb24gfHwgdGhpcy5fbGVnYWN5U3RhdGVzLm9wYWNpdHkpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9sZWdhY3lTdGF0ZXMub3BhY2l0eSkge1xuICAgICAgICAgICAgdGhpcy5fbGVnYWN5U3RhdGVzLm9wYWNpdHkgPSBuZXcgVHJhbnNpdGlvbmFibGUodGhpcy5fb3V0cHV0Lm9wYWNpdHkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5fb3BhY2l0eUdldHRlcikgdGhpcy5vcGFjaXR5RnJvbSh0aGlzLl9sZWdhY3lTdGF0ZXMub3BhY2l0eSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuX2xlZ2FjeVN0YXRlcy5vcGFjaXR5LnNldChvcGFjaXR5LCB0cmFuc2l0aW9uLCBjYWxsYmFjayk7XG4gICAgfVxuICAgIGVsc2UgcmV0dXJuIHRoaXMub3BhY2l0eUZyb20ob3BhY2l0eSk7XG59O1xuXG4vKipcbiAqIERlcHJlY2F0ZWQ6IFByZWZlciBvcmlnaW5Gcm9tIHdpdGggc3RhdGljIG9yaWdpbiBhcnJheSwgb3IgdXNlIGEgVHJhbnNpdGlvbmFibGUgd2l0aCB0aGF0IG9yaWdpbi5cbiAqIEBkZXByZWNhdGVkXG4gKiBAbWV0aG9kIHNldE9yaWdpblxuICpcbiAqIEBwYXJhbSB7QXJyYXkuTnVtYmVyfSBvcmlnaW4gdHdvIGVsZW1lbnQgYXJyYXkgd2l0aCB2YWx1ZXMgYmV0d2VlbiAwIGFuZCAxLlxuICogQHBhcmFtIHtUcmFuc2l0aW9uYWJsZX0gdHJhbnNpdGlvbiBWYWxpZCB0cmFuc2l0aW9uYWJsZSBvYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGNhbGxiYWNrIHRvIGNhbGwgYWZ0ZXIgdHJhbnNpdGlvbiBjb21wbGV0ZXNcbiAqIEByZXR1cm4ge01vZGlmaWVyfSB0aGlzXG4gKi9cbk1vZGlmaWVyLnByb3RvdHlwZS5zZXRPcmlnaW4gPSBmdW5jdGlvbiBzZXRPcmlnaW4ob3JpZ2luLCB0cmFuc2l0aW9uLCBjYWxsYmFjaykge1xuICAgIC8qIFRPRE86IHJlbW92ZSB0aGlzIGlmIHN0YXRlbWVudCB3aGVuIGRlcHJlY2F0aW9uIGNvbXBsZXRlICovXG4gICAgaWYgKHRyYW5zaXRpb24gfHwgdGhpcy5fbGVnYWN5U3RhdGVzLm9yaWdpbikge1xuXG4gICAgICAgIGlmICghdGhpcy5fbGVnYWN5U3RhdGVzLm9yaWdpbikge1xuICAgICAgICAgICAgdGhpcy5fbGVnYWN5U3RhdGVzLm9yaWdpbiA9IG5ldyBUcmFuc2l0aW9uYWJsZSh0aGlzLl9vdXRwdXQub3JpZ2luIHx8IFswLCAwXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLl9vcmlnaW5HZXR0ZXIpIHRoaXMub3JpZ2luRnJvbSh0aGlzLl9sZWdhY3lTdGF0ZXMub3JpZ2luKTtcblxuICAgICAgICB0aGlzLl9sZWdhY3lTdGF0ZXMub3JpZ2luLnNldChvcmlnaW4sIHRyYW5zaXRpb24sIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGVsc2UgcmV0dXJuIHRoaXMub3JpZ2luRnJvbShvcmlnaW4pO1xufTtcblxuLyoqXG4gKiBEZXByZWNhdGVkOiBQcmVmZXIgYWxpZ25Gcm9tIHdpdGggc3RhdGljIGFsaWduIGFycmF5LCBvciB1c2UgYSBUcmFuc2l0aW9uYWJsZSB3aXRoIHRoYXQgYWxpZ24uXG4gKiBAZGVwcmVjYXRlZFxuICogQG1ldGhvZCBzZXRBbGlnblxuICpcbiAqIEBwYXJhbSB7QXJyYXkuTnVtYmVyfSBhbGlnbiB0d28gZWxlbWVudCBhcnJheSB3aXRoIHZhbHVlcyBiZXR3ZWVuIDAgYW5kIDEuXG4gKiBAcGFyYW0ge1RyYW5zaXRpb25hYmxlfSB0cmFuc2l0aW9uIFZhbGlkIHRyYW5zaXRpb25hYmxlIG9iamVjdFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgY2FsbGJhY2sgdG8gY2FsbCBhZnRlciB0cmFuc2l0aW9uIGNvbXBsZXRlc1xuICogQHJldHVybiB7TW9kaWZpZXJ9IHRoaXNcbiAqL1xuTW9kaWZpZXIucHJvdG90eXBlLnNldEFsaWduID0gZnVuY3Rpb24gc2V0QWxpZ24oYWxpZ24sIHRyYW5zaXRpb24sIGNhbGxiYWNrKSB7XG4gICAgLyogVE9ETzogcmVtb3ZlIHRoaXMgaWYgc3RhdGVtZW50IHdoZW4gZGVwcmVjYXRpb24gY29tcGxldGUgKi9cbiAgICBpZiAodHJhbnNpdGlvbiB8fCB0aGlzLl9sZWdhY3lTdGF0ZXMuYWxpZ24pIHtcblxuICAgICAgICBpZiAoIXRoaXMuX2xlZ2FjeVN0YXRlcy5hbGlnbikge1xuICAgICAgICAgICAgdGhpcy5fbGVnYWN5U3RhdGVzLmFsaWduID0gbmV3IFRyYW5zaXRpb25hYmxlKHRoaXMuX291dHB1dC5hbGlnbiB8fCBbMCwgMF0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5fYWxpZ25HZXR0ZXIpIHRoaXMuYWxpZ25Gcm9tKHRoaXMuX2xlZ2FjeVN0YXRlcy5hbGlnbik7XG5cbiAgICAgICAgdGhpcy5fbGVnYWN5U3RhdGVzLmFsaWduLnNldChhbGlnbiwgdHJhbnNpdGlvbiwgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgZWxzZSByZXR1cm4gdGhpcy5hbGlnbkZyb20oYWxpZ24pO1xufTtcblxuLyoqXG4gKiBEZXByZWNhdGVkOiBQcmVmZXIgc2l6ZUZyb20gd2l0aCBzdGF0aWMgb3JpZ2luIGFycmF5LCBvciB1c2UgYSBUcmFuc2l0aW9uYWJsZSB3aXRoIHRoYXQgc2l6ZS5cbiAqIEBkZXByZWNhdGVkXG4gKiBAbWV0aG9kIHNldFNpemVcbiAqIEBwYXJhbSB7QXJyYXkuTnVtYmVyfSBzaXplIHR3byBlbGVtZW50IGFycmF5IG9mIFt3aWR0aCwgaGVpZ2h0XVxuICogQHBhcmFtIHtUcmFuc2l0aW9uYWJsZX0gdHJhbnNpdGlvbiBWYWxpZCB0cmFuc2l0aW9uYWJsZSBvYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGNhbGxiYWNrIHRvIGNhbGwgYWZ0ZXIgdHJhbnNpdGlvbiBjb21wbGV0ZXNcbiAqIEByZXR1cm4ge01vZGlmaWVyfSB0aGlzXG4gKi9cbk1vZGlmaWVyLnByb3RvdHlwZS5zZXRTaXplID0gZnVuY3Rpb24gc2V0U2l6ZShzaXplLCB0cmFuc2l0aW9uLCBjYWxsYmFjaykge1xuICAgIGlmIChzaXplICYmICh0cmFuc2l0aW9uIHx8IHRoaXMuX2xlZ2FjeVN0YXRlcy5zaXplKSkge1xuICAgICAgICBpZiAoIXRoaXMuX2xlZ2FjeVN0YXRlcy5zaXplKSB7XG4gICAgICAgICAgICB0aGlzLl9sZWdhY3lTdGF0ZXMuc2l6ZSA9IG5ldyBUcmFuc2l0aW9uYWJsZSh0aGlzLl9vdXRwdXQuc2l6ZSB8fCBbMCwgMF0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5fc2l6ZUdldHRlcikgdGhpcy5zaXplRnJvbSh0aGlzLl9sZWdhY3lTdGF0ZXMuc2l6ZSk7XG5cbiAgICAgICAgdGhpcy5fbGVnYWN5U3RhdGVzLnNpemUuc2V0KHNpemUsIHRyYW5zaXRpb24sIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGVsc2UgcmV0dXJuIHRoaXMuc2l6ZUZyb20oc2l6ZSk7XG59O1xuXG4vKipcbiAqIERlcHJlY2F0ZWQ6IFByZWZlciB0byBzdG9wIHRyYW5zZm9ybSBpbiB5b3VyIHByb3ZpZGVyIG9iamVjdC5cbiAqIEBkZXByZWNhdGVkXG4gKiBAbWV0aG9kIGhhbHRcbiAqL1xuTW9kaWZpZXIucHJvdG90eXBlLmhhbHQgPSBmdW5jdGlvbiBoYWx0KCkge1xuICAgIGlmICh0aGlzLl9sZWdhY3lTdGF0ZXMudHJhbnNmb3JtKSB0aGlzLl9sZWdhY3lTdGF0ZXMudHJhbnNmb3JtLmhhbHQoKTtcbiAgICBpZiAodGhpcy5fbGVnYWN5U3RhdGVzLm9wYWNpdHkpIHRoaXMuX2xlZ2FjeVN0YXRlcy5vcGFjaXR5LmhhbHQoKTtcbiAgICBpZiAodGhpcy5fbGVnYWN5U3RhdGVzLm9yaWdpbikgdGhpcy5fbGVnYWN5U3RhdGVzLm9yaWdpbi5oYWx0KCk7XG4gICAgaWYgKHRoaXMuX2xlZ2FjeVN0YXRlcy5hbGlnbikgdGhpcy5fbGVnYWN5U3RhdGVzLmFsaWduLmhhbHQoKTtcbiAgICBpZiAodGhpcy5fbGVnYWN5U3RhdGVzLnNpemUpIHRoaXMuX2xlZ2FjeVN0YXRlcy5zaXplLmhhbHQoKTtcbiAgICB0aGlzLl90cmFuc2Zvcm1HZXR0ZXIgPSBudWxsO1xuICAgIHRoaXMuX29wYWNpdHlHZXR0ZXIgPSBudWxsO1xuICAgIHRoaXMuX29yaWdpbkdldHRlciA9IG51bGw7XG4gICAgdGhpcy5fYWxpZ25HZXR0ZXIgPSBudWxsO1xuICAgIHRoaXMuX3NpemVHZXR0ZXIgPSBudWxsO1xufTtcblxuLyoqXG4gKiBEZXByZWNhdGVkOiBQcmVmZXIgdG8gdXNlIHlvdXIgcHJvdmlkZWQgdHJhbnNmb3JtIG9yIG91dHB1dCBvZiB5b3VyIHRyYW5zZm9ybSBwcm92aWRlci5cbiAqIEBkZXByZWNhdGVkXG4gKiBAbWV0aG9kIGdldFRyYW5zZm9ybVxuICogQHJldHVybiB7T2JqZWN0fSB0cmFuc2Zvcm0gcHJvdmlkZXIgb2JqZWN0XG4gKi9cbk1vZGlmaWVyLnByb3RvdHlwZS5nZXRUcmFuc2Zvcm0gPSBmdW5jdGlvbiBnZXRUcmFuc2Zvcm0oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RyYW5zZm9ybUdldHRlcigpO1xufTtcblxuLyoqXG4gKiBEZXByZWNhdGVkOiBQcmVmZXIgdG8gZGV0ZXJtaW5lIHRoZSBlbmQgc3RhdGUgb2YgeW91ciB0cmFuc2Zvcm0gZnJvbSB5b3VyIHRyYW5zZm9ybSBwcm92aWRlclxuICogQGRlcHJlY2F0ZWRcbiAqIEBtZXRob2QgZ2V0RmluYWxUcmFuc2Zvcm1cbiAqIEByZXR1cm4ge1RyYW5zZm9ybX0gdHJhbnNmb3JtIG1hdHJpeFxuICovXG5Nb2RpZmllci5wcm90b3R5cGUuZ2V0RmluYWxUcmFuc2Zvcm0gPSBmdW5jdGlvbiBnZXRGaW5hbFRyYW5zZm9ybSgpIHtcbiAgICByZXR1cm4gdGhpcy5fbGVnYWN5U3RhdGVzLnRyYW5zZm9ybSA/IHRoaXMuX2xlZ2FjeVN0YXRlcy50cmFuc2Zvcm0uZ2V0RmluYWwoKSA6IHRoaXMuX291dHB1dC50cmFuc2Zvcm07XG59O1xuXG4vKipcbiAqIERlcHJlY2F0ZWQ6IFByZWZlciB0byB1c2UgeW91ciBwcm92aWRlZCBvcGFjaXR5IG9yIG91dHB1dCBvZiB5b3VyIG9wYWNpdHkgcHJvdmlkZXIuXG4gKiBAZGVwcmVjYXRlZFxuICogQG1ldGhvZCBnZXRPcGFjaXR5XG4gKiBAcmV0dXJuIHtPYmplY3R9IG9wYWNpdHkgcHJvdmlkZXIgb2JqZWN0XG4gKi9cbk1vZGlmaWVyLnByb3RvdHlwZS5nZXRPcGFjaXR5ID0gZnVuY3Rpb24gZ2V0T3BhY2l0eSgpIHtcbiAgICByZXR1cm4gdGhpcy5fb3BhY2l0eUdldHRlcigpO1xufTtcblxuLyoqXG4gKiBEZXByZWNhdGVkOiBQcmVmZXIgdG8gdXNlIHlvdXIgcHJvdmlkZWQgb3JpZ2luIG9yIG91dHB1dCBvZiB5b3VyIG9yaWdpbiBwcm92aWRlci5cbiAqIEBkZXByZWNhdGVkXG4gKiBAbWV0aG9kIGdldE9yaWdpblxuICogQHJldHVybiB7T2JqZWN0fSBvcmlnaW4gcHJvdmlkZXIgb2JqZWN0XG4gKi9cbk1vZGlmaWVyLnByb3RvdHlwZS5nZXRPcmlnaW4gPSBmdW5jdGlvbiBnZXRPcmlnaW4oKSB7XG4gICAgcmV0dXJuIHRoaXMuX29yaWdpbkdldHRlcigpO1xufTtcblxuLyoqXG4gKiBEZXByZWNhdGVkOiBQcmVmZXIgdG8gdXNlIHlvdXIgcHJvdmlkZWQgYWxpZ24gb3Igb3V0cHV0IG9mIHlvdXIgYWxpZ24gcHJvdmlkZXIuXG4gKiBAZGVwcmVjYXRlZFxuICogQG1ldGhvZCBnZXRBbGlnblxuICogQHJldHVybiB7T2JqZWN0fSBhbGlnbiBwcm92aWRlciBvYmplY3RcbiAqL1xuTW9kaWZpZXIucHJvdG90eXBlLmdldEFsaWduID0gZnVuY3Rpb24gZ2V0QWxpZ24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FsaWduR2V0dGVyKCk7XG59O1xuXG4vKipcbiAqIERlcHJlY2F0ZWQ6IFByZWZlciB0byB1c2UgeW91ciBwcm92aWRlZCBzaXplIG9yIG91dHB1dCBvZiB5b3VyIHNpemUgcHJvdmlkZXIuXG4gKiBAZGVwcmVjYXRlZFxuICogQG1ldGhvZCBnZXRTaXplXG4gKiBAcmV0dXJuIHtPYmplY3R9IHNpemUgcHJvdmlkZXIgb2JqZWN0XG4gKi9cbk1vZGlmaWVyLnByb3RvdHlwZS5nZXRTaXplID0gZnVuY3Rpb24gZ2V0U2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2l6ZUdldHRlciA/IHRoaXMuX3NpemVHZXR0ZXIoKSA6IHRoaXMuX291dHB1dC5zaXplO1xufTtcblxuLy8gY2FsbCBwcm92aWRlcnMgb24gdGljayB0byByZWNlaXZlIHJlbmRlciBzcGVjIGVsZW1lbnRzIHRvIGFwcGx5XG5mdW5jdGlvbiBfdXBkYXRlKCkge1xuICAgIGlmICh0aGlzLl90cmFuc2Zvcm1HZXR0ZXIpIHRoaXMuX291dHB1dC50cmFuc2Zvcm0gPSB0aGlzLl90cmFuc2Zvcm1HZXR0ZXIoKTtcbiAgICBpZiAodGhpcy5fb3BhY2l0eUdldHRlcikgdGhpcy5fb3V0cHV0Lm9wYWNpdHkgPSB0aGlzLl9vcGFjaXR5R2V0dGVyKCk7XG4gICAgaWYgKHRoaXMuX29yaWdpbkdldHRlcikgdGhpcy5fb3V0cHV0Lm9yaWdpbiA9IHRoaXMuX29yaWdpbkdldHRlcigpO1xuICAgIGlmICh0aGlzLl9hbGlnbkdldHRlcikgdGhpcy5fb3V0cHV0LmFsaWduID0gdGhpcy5fYWxpZ25HZXR0ZXIoKTtcbiAgICBpZiAodGhpcy5fc2l6ZUdldHRlcikgdGhpcy5fb3V0cHV0LnNpemUgPSB0aGlzLl9zaXplR2V0dGVyKCk7XG59XG5cbi8qKlxuICogUmV0dXJuIHJlbmRlciBzcGVjIGZvciB0aGlzIE1vZGlmaWVyLCBhcHBseWluZyB0byB0aGUgcHJvdmlkZWRcbiAqICAgIHRhcmdldCBjb21wb25lbnQuICBUaGlzIGlzIHNpbWlsYXIgdG8gcmVuZGVyKCkgZm9yIFN1cmZhY2VzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbWV0aG9kIG1vZGlmeVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXQgKGFscmVhZHkgcmVuZGVyZWQpIHJlbmRlciBzcGVjIHRvXG4gKiAgICB3aGljaCB0byBhcHBseSB0aGUgdHJhbnNmb3JtLlxuICogQHJldHVybiB7T2JqZWN0fSByZW5kZXIgc3BlYyBmb3IgdGhpcyBNb2RpZmllciwgaW5jbHVkaW5nIHRoZVxuICogICAgcHJvdmlkZWQgdGFyZ2V0XG4gKi9cbk1vZGlmaWVyLnByb3RvdHlwZS5tb2RpZnkgPSBmdW5jdGlvbiBtb2RpZnkodGFyZ2V0KSB7XG4gICAgX3VwZGF0ZS5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX291dHB1dC50YXJnZXQgPSB0YXJnZXQ7XG4gICAgcmV0dXJuIHRoaXMuX291dHB1dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW9kaWZpZXI7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvY29yZS9Nb2RpZmllci5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvY29yZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IG1hcmtAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxudmFyIEV2ZW50SGFuZGxlciA9IHJlcXVpcmUoJy4vRXZlbnRIYW5kbGVyJyk7XG5cbi8qKlxuICogIEEgY29sbGVjdGlvbiBvZiBtZXRob2RzIGZvciBzZXR0aW5nIG9wdGlvbnMgd2hpY2ggY2FuIGJlIGV4dGVuZGVkXG4gKiAgb250byBvdGhlciBjbGFzc2VzLlxuICpcbiAqXG4gKiAgKioqKiBXQVJOSU5HICoqKipcbiAqICBZb3UgY2FuIG9ubHkgcGFzcyB0aHJvdWdoIG9iamVjdHMgdGhhdCB3aWxsIGNvbXBpbGUgaW50byB2YWxpZCBKU09OLlxuICpcbiAqICBWYWxpZCBvcHRpb25zOlxuICogICAgICBTdHJpbmdzLFxuICogICAgICBBcnJheXMsXG4gKiAgICAgIE9iamVjdHMsXG4gKiAgICAgIE51bWJlcnMsXG4gKiAgICAgIE5lc3RlZCBPYmplY3RzLFxuICogICAgICBOZXN0ZWQgQXJyYXlzLlxuICpcbiAqICAgIFRoaXMgZXhjbHVkZXM6XG4gKiAgICAgICAgRG9jdW1lbnQgRnJhZ21lbnRzLFxuICogICAgICAgIEZ1bmN0aW9uc1xuICogQGNsYXNzIE9wdGlvbnNNYW5hZ2VyXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSBvcHRpb25zIGRpY3Rpb25hcnlcbiAqL1xuZnVuY3Rpb24gT3B0aW9uc01hbmFnZXIodmFsdWUpIHtcbiAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xuICAgIHRoaXMuZXZlbnRPdXRwdXQgPSBudWxsO1xufVxuXG4vKipcbiAqIENyZWF0ZSBvcHRpb25zIG1hbmFnZXIgZnJvbSBzb3VyY2UgZGljdGlvbmFyeSB3aXRoIGFyZ3VtZW50cyBvdmVycmlkZW4gYnkgcGF0Y2ggZGljdGlvbmFyeS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kIE9wdGlvbnNNYW5hZ2VyLnBhdGNoXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHNvdXJjZSBzb3VyY2UgYXJndW1lbnRzXG4gKiBAcGFyYW0gey4uLk9iamVjdH0gZGF0YSBhcmd1bWVudCBhZGRpdGlvbnMgYW5kIG92ZXJ3cml0ZXNcbiAqIEByZXR1cm4ge09iamVjdH0gc291cmNlIG9iamVjdFxuICovXG5PcHRpb25zTWFuYWdlci5wYXRjaCA9IGZ1bmN0aW9uIHBhdGNoT2JqZWN0KHNvdXJjZSwgZGF0YSkge1xuICAgIHZhciBtYW5hZ2VyID0gbmV3IE9wdGlvbnNNYW5hZ2VyKHNvdXJjZSk7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIG1hbmFnZXIucGF0Y2goYXJndW1lbnRzW2ldKTtcbiAgICByZXR1cm4gc291cmNlO1xufTtcblxuZnVuY3Rpb24gX2NyZWF0ZUV2ZW50T3V0cHV0KCkge1xuICAgIHRoaXMuZXZlbnRPdXRwdXQgPSBuZXcgRXZlbnRIYW5kbGVyKCk7XG4gICAgdGhpcy5ldmVudE91dHB1dC5iaW5kVGhpcyh0aGlzKTtcbiAgICBFdmVudEhhbmRsZXIuc2V0T3V0cHV0SGFuZGxlcih0aGlzLCB0aGlzLmV2ZW50T3V0cHV0KTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgT3B0aW9uc01hbmFnZXIgZnJvbSBzb3VyY2Ugd2l0aCBhcmd1bWVudHMgb3ZlcnJpZGVuIGJ5IHBhdGNoZXMuXG4gKiAgIFRyaWdnZXJzICdjaGFuZ2UnIGV2ZW50IG9uIHRoaXMgb2JqZWN0J3MgZXZlbnQgaGFuZGxlciBpZiB0aGUgc3RhdGUgb2ZcbiAqICAgdGhlIE9wdGlvbnNNYW5hZ2VyIGNoYW5nZXMgYXMgYSByZXN1bHQuXG4gKlxuICogQG1ldGhvZCBwYXRjaFxuICpcbiAqIEBwYXJhbSB7Li4uT2JqZWN0fSBhcmd1bWVudHMgbGlzdCBvZiBwYXRjaCBvYmplY3RzXG4gKiBAcmV0dXJuIHtPcHRpb25zTWFuYWdlcn0gdGhpc1xuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUucGF0Y2ggPSBmdW5jdGlvbiBwYXRjaCgpIHtcbiAgICB2YXIgbXlTdGF0ZSA9IHRoaXMuX3ZhbHVlO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBkYXRhID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBmb3IgKHZhciBrIGluIGRhdGEpIHtcbiAgICAgICAgICAgIGlmICgoayBpbiBteVN0YXRlKSAmJiAoZGF0YVtrXSAmJiBkYXRhW2tdLmNvbnN0cnVjdG9yID09PSBPYmplY3QpICYmIChteVN0YXRlW2tdICYmIG15U3RhdGVba10uY29uc3RydWN0b3IgPT09IE9iamVjdCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW15U3RhdGUuaGFzT3duUHJvcGVydHkoaykpIG15U3RhdGVba10gPSBPYmplY3QuY3JlYXRlKG15U3RhdGVba10pO1xuICAgICAgICAgICAgICAgIHRoaXMua2V5KGspLnBhdGNoKGRhdGFba10pO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmV2ZW50T3V0cHV0KSB0aGlzLmV2ZW50T3V0cHV0LmVtaXQoJ2NoYW5nZScsIHtpZDogaywgdmFsdWU6IHRoaXMua2V5KGspLnZhbHVlKCl9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgdGhpcy5zZXQoaywgZGF0YVtrXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFsaWFzIGZvciBwYXRjaFxuICpcbiAqIEBtZXRob2Qgc2V0T3B0aW9uc1xuICpcbiAqL1xuT3B0aW9uc01hbmFnZXIucHJvdG90eXBlLnNldE9wdGlvbnMgPSBPcHRpb25zTWFuYWdlci5wcm90b3R5cGUucGF0Y2g7XG5cbi8qKlxuICogUmV0dXJuIE9wdGlvbnNNYW5hZ2VyIGJhc2VkIG9uIHN1Yi1vYmplY3QgcmV0cmlldmVkIGJ5IGtleVxuICpcbiAqIEBtZXRob2Qga2V5XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGlkZW50aWZpZXIga2V5XG4gKiBAcmV0dXJuIHtPcHRpb25zTWFuYWdlcn0gbmV3IG9wdGlvbnMgbWFuYWdlciB3aXRoIHRoZSB2YWx1ZVxuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUua2V5ID0gZnVuY3Rpb24ga2V5KGlkZW50aWZpZXIpIHtcbiAgICB2YXIgcmVzdWx0ID0gbmV3IE9wdGlvbnNNYW5hZ2VyKHRoaXMuX3ZhbHVlW2lkZW50aWZpZXJdKTtcbiAgICBpZiAoIShyZXN1bHQuX3ZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSB8fCByZXN1bHQuX3ZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIHJlc3VsdC5fdmFsdWUgPSB7fTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBMb29rIHVwIHZhbHVlIGJ5IGtleVxuICogQG1ldGhvZCBnZXRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IGtleVxuICogQHJldHVybiB7T2JqZWN0fSBhc3NvY2lhdGVkIG9iamVjdFxuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0KGtleSkge1xuICAgIHJldHVybiB0aGlzLl92YWx1ZVtrZXldO1xufTtcblxuLyoqXG4gKiBBbGlhcyBmb3IgZ2V0XG4gKiBAbWV0aG9kIGdldE9wdGlvbnNcbiAqL1xuT3B0aW9uc01hbmFnZXIucHJvdG90eXBlLmdldE9wdGlvbnMgPSBPcHRpb25zTWFuYWdlci5wcm90b3R5cGUuZ2V0O1xuXG4vKipcbiAqIFNldCBrZXkgdG8gdmFsdWUuICBPdXRwdXRzICdjaGFuZ2UnIGV2ZW50IGlmIGEgdmFsdWUgaXMgb3ZlcndyaXR0ZW4uXG4gKlxuICogQG1ldGhvZCBzZXRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IGtleSBzdHJpbmdcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSB2YWx1ZSBvYmplY3RcbiAqIEByZXR1cm4ge09wdGlvbnNNYW5hZ2VyfSBuZXcgb3B0aW9ucyBtYW5hZ2VyIGJhc2VkIG9uIHRoZSB2YWx1ZSBvYmplY3RcbiAqL1xuT3B0aW9uc01hbmFnZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldChrZXksIHZhbHVlKSB7XG4gICAgdmFyIG9yaWdpbmFsVmFsdWUgPSB0aGlzLmdldChrZXkpO1xuICAgIHRoaXMuX3ZhbHVlW2tleV0gPSB2YWx1ZTtcbiAgICBpZiAodGhpcy5ldmVudE91dHB1dCAmJiB2YWx1ZSAhPT0gb3JpZ2luYWxWYWx1ZSkgdGhpcy5ldmVudE91dHB1dC5lbWl0KCdjaGFuZ2UnLCB7aWQ6IGtleSwgdmFsdWU6IHZhbHVlfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybiBlbnRpcmUgb2JqZWN0IGNvbnRlbnRzIG9mIHRoaXMgT3B0aW9uc01hbmFnZXIuXG4gKlxuICogQG1ldGhvZCB2YWx1ZVxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gY3VycmVudCBzdGF0ZSBvZiBvcHRpb25zXG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS52YWx1ZSA9IGZ1bmN0aW9uIHZhbHVlKCkge1xuICAgIHJldHVybiB0aGlzLl92YWx1ZTtcbn07XG5cbi8qKlxuICogQmluZCBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGFuIGV2ZW50IHR5cGUgaGFuZGxlZCBieSB0aGlzIG9iamVjdC5cbiAqXG4gKiBAbWV0aG9kIFwib25cIlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NoYW5nZScpXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKHN0cmluZywgT2JqZWN0KX0gaGFuZGxlciBjYWxsYmFja1xuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSB0aGlzXG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKCkge1xuICAgIF9jcmVhdGVFdmVudE91dHB1dC5jYWxsKHRoaXMpO1xuICAgIHJldHVybiB0aGlzLm9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIFVuYmluZCBhbiBldmVudCBieSB0eXBlIGFuZCBoYW5kbGVyLlxuICogICBUaGlzIHVuZG9lcyB0aGUgd29yayBvZiBcIm9uXCIuXG4gKlxuICogQG1ldGhvZCByZW1vdmVMaXN0ZW5lclxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NoYW5nZScpXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBoYW5kbGVyIGZ1bmN0aW9uIG9iamVjdCB0byByZW1vdmVcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gaW50ZXJuYWwgZXZlbnQgaGFuZGxlciBvYmplY3QgKGZvciBjaGFpbmluZylcbiAqL1xuT3B0aW9uc01hbmFnZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoKSB7XG4gICAgX2NyZWF0ZUV2ZW50T3V0cHV0LmNhbGwodGhpcyk7XG4gICAgcmV0dXJuIHRoaXMucmVtb3ZlTGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogQWRkIGV2ZW50IGhhbmRsZXIgb2JqZWN0IHRvIHNldCBvZiBkb3duc3RyZWFtIGhhbmRsZXJzLlxuICpcbiAqIEBtZXRob2QgcGlwZVxuICpcbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSB0YXJnZXQgZXZlbnQgaGFuZGxlciB0YXJnZXQgb2JqZWN0XG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHBhc3NlZCBldmVudCBoYW5kbGVyXG4gKi9cbk9wdGlvbnNNYW5hZ2VyLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24gcGlwZSgpIHtcbiAgICBfY3JlYXRlRXZlbnRPdXRwdXQuY2FsbCh0aGlzKTtcbiAgICByZXR1cm4gdGhpcy5waXBlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBoYW5kbGVyIG9iamVjdCBmcm9tIHNldCBvZiBkb3duc3RyZWFtIGhhbmRsZXJzLlxuICogVW5kb2VzIHdvcmsgb2YgXCJwaXBlXCJcbiAqXG4gKiBAbWV0aG9kIHVucGlwZVxuICpcbiAqIEBwYXJhbSB7RXZlbnRIYW5kbGVyfSB0YXJnZXQgdGFyZ2V0IGhhbmRsZXIgb2JqZWN0XG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHByb3ZpZGVkIHRhcmdldFxuICovXG5PcHRpb25zTWFuYWdlci5wcm90b3R5cGUudW5waXBlID0gZnVuY3Rpb24gdW5waXBlKCkge1xuICAgIF9jcmVhdGVFdmVudE91dHB1dC5jYWxsKHRoaXMpO1xuICAgIHJldHVybiB0aGlzLnVucGlwZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBPcHRpb25zTWFuYWdlcjtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL09wdGlvbnNNYW5hZ2VyLmpzXCIsXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogbWFya0BmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG52YXIgRW50aXR5ID0gcmVxdWlyZSgnLi9FbnRpdHknKTtcbnZhciBTcGVjUGFyc2VyID0gcmVxdWlyZSgnLi9TcGVjUGFyc2VyJyk7XG5cbi8qKlxuICogQSB3cmFwcGVyIGZvciBpbnNlcnRpbmcgYSByZW5kZXJhYmxlIGNvbXBvbmVudCAobGlrZSBhIE1vZGlmZXIgb3JcbiAqICAgU3VyZmFjZSkgaW50byB0aGUgcmVuZGVyIHRyZWUuXG4gKlxuICogQGNsYXNzIFJlbmRlck5vZGVcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGFyZ2V0IHJlbmRlcmFibGUgY29tcG9uZW50XG4gKi9cbmZ1bmN0aW9uIFJlbmRlck5vZGUob2JqZWN0KSB7XG4gICAgdGhpcy5fb2JqZWN0ID0gbnVsbDtcbiAgICB0aGlzLl9jaGlsZCA9IG51bGw7XG4gICAgdGhpcy5faGFzTXVsdGlwbGVDaGlsZHJlbiA9IGZhbHNlO1xuICAgIHRoaXMuX2lzUmVuZGVyYWJsZSA9IGZhbHNlO1xuICAgIHRoaXMuX2lzTW9kaWZpZXIgPSBmYWxzZTtcblxuICAgIHRoaXMuX3Jlc3VsdENhY2hlID0ge307XG4gICAgdGhpcy5fcHJldlJlc3VsdHMgPSB7fTtcblxuICAgIHRoaXMuX2NoaWxkUmVzdWx0ID0gbnVsbDtcblxuICAgIGlmIChvYmplY3QpIHRoaXMuc2V0KG9iamVjdCk7XG59XG5cbi8qKlxuICogQXBwZW5kIGEgcmVuZGVyYWJsZSB0byB0aGUgbGlzdCBvZiB0aGlzIG5vZGUncyBjaGlsZHJlbi5cbiAqICAgVGhpcyBwcm9kdWNlcyBhIG5ldyBSZW5kZXJOb2RlIGluIHRoZSB0cmVlLlxuICogICBOb3RlOiBEb2VzIG5vdCBkb3VibGUtd3JhcCBpZiBjaGlsZCBpcyBhIFJlbmRlck5vZGUgYWxyZWFkeS5cbiAqXG4gKiBAbWV0aG9kIGFkZFxuICogQHBhcmFtIHtPYmplY3R9IGNoaWxkIHJlbmRlcmFibGUgb2JqZWN0XG4gKiBAcmV0dXJuIHtSZW5kZXJOb2RlfSBuZXcgcmVuZGVyIG5vZGUgd3JhcHBpbmcgY2hpbGRcbiAqL1xuUmVuZGVyTm9kZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gYWRkKGNoaWxkKSB7XG4gICAgdmFyIGNoaWxkTm9kZSA9IChjaGlsZCBpbnN0YW5jZW9mIFJlbmRlck5vZGUpID8gY2hpbGQgOiBuZXcgUmVuZGVyTm9kZShjaGlsZCk7XG4gICAgaWYgKHRoaXMuX2NoaWxkIGluc3RhbmNlb2YgQXJyYXkpIHRoaXMuX2NoaWxkLnB1c2goY2hpbGROb2RlKTtcbiAgICBlbHNlIGlmICh0aGlzLl9jaGlsZCkge1xuICAgICAgICB0aGlzLl9jaGlsZCA9IFt0aGlzLl9jaGlsZCwgY2hpbGROb2RlXTtcbiAgICAgICAgdGhpcy5faGFzTXVsdGlwbGVDaGlsZHJlbiA9IHRydWU7XG4gICAgICAgIHRoaXMuX2NoaWxkUmVzdWx0ID0gW107IC8vIHRvIGJlIHVzZWQgbGF0ZXJcbiAgICB9XG4gICAgZWxzZSB0aGlzLl9jaGlsZCA9IGNoaWxkTm9kZTtcblxuICAgIHJldHVybiBjaGlsZE5vZGU7XG59O1xuXG4vKipcbiAqIFJldHVybiB0aGUgc2luZ2xlIHdyYXBwZWQgb2JqZWN0LiAgUmV0dXJucyBudWxsIGlmIHRoaXMgbm9kZSBoYXMgbXVsdGlwbGUgY2hpbGQgbm9kZXMuXG4gKlxuICogQG1ldGhvZCBnZXRcbiAqXG4gKiBAcmV0dXJuIHtPamJlY3R9IGNvbnRhaW5lZCByZW5kZXJhYmxlIG9iamVjdFxuICovXG5SZW5kZXJOb2RlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBnZXQoKSB7XG4gICAgcmV0dXJuIHRoaXMuX29iamVjdCB8fCAodGhpcy5faGFzTXVsdGlwbGVDaGlsZHJlbiA/IG51bGwgOiAodGhpcy5fY2hpbGQgPyB0aGlzLl9jaGlsZC5nZXQoKSA6IG51bGwpKTtcbn07XG5cbi8qKlxuICogT3ZlcndyaXRlIHRoZSBsaXN0IG9mIGNoaWxkcmVuIHRvIGNvbnRhaW4gdGhlIHNpbmdsZSBwcm92aWRlZCBvYmplY3RcbiAqXG4gKiBAbWV0aG9kIHNldFxuICogQHBhcmFtIHtPYmplY3R9IGNoaWxkIHJlbmRlcmFibGUgb2JqZWN0XG4gKiBAcmV0dXJuIHtSZW5kZXJOb2RlfSB0aGlzIHJlbmRlciBub2RlLCBvciBjaGlsZCBpZiBpdCBpcyBhIFJlbmRlck5vZGVcbiAqL1xuUmVuZGVyTm9kZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KGNoaWxkKSB7XG4gICAgdGhpcy5fY2hpbGRSZXN1bHQgPSBudWxsO1xuICAgIHRoaXMuX2hhc011bHRpcGxlQ2hpbGRyZW4gPSBmYWxzZTtcbiAgICB0aGlzLl9pc1JlbmRlcmFibGUgPSBjaGlsZC5yZW5kZXIgPyB0cnVlIDogZmFsc2U7XG4gICAgdGhpcy5faXNNb2RpZmllciA9IGNoaWxkLm1vZGlmeSA/IHRydWUgOiBmYWxzZTtcbiAgICB0aGlzLl9vYmplY3QgPSBjaGlsZDtcbiAgICB0aGlzLl9jaGlsZCA9IG51bGw7XG4gICAgaWYgKGNoaWxkIGluc3RhbmNlb2YgUmVuZGVyTm9kZSkgcmV0dXJuIGNoaWxkO1xuICAgIGVsc2UgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldCByZW5kZXIgc2l6ZSBvZiBjb250YWluZWQgb2JqZWN0LlxuICpcbiAqIEBtZXRob2QgZ2V0U2l6ZVxuICogQHJldHVybiB7QXJyYXkuTnVtYmVyfSBzaXplIG9mIHRoaXMgb3Igc2l6ZSBvZiBzaW5nbGUgY2hpbGQuXG4gKi9cblJlbmRlck5vZGUucHJvdG90eXBlLmdldFNpemUgPSBmdW5jdGlvbiBnZXRTaXplKCkge1xuICAgIHZhciByZXN1bHQgPSBudWxsO1xuICAgIHZhciB0YXJnZXQgPSB0aGlzLmdldCgpO1xuICAgIGlmICh0YXJnZXQgJiYgdGFyZ2V0LmdldFNpemUpIHJlc3VsdCA9IHRhcmdldC5nZXRTaXplKCk7XG4gICAgaWYgKCFyZXN1bHQgJiYgdGhpcy5fY2hpbGQgJiYgdGhpcy5fY2hpbGQuZ2V0U2l6ZSkgcmVzdWx0ID0gdGhpcy5fY2hpbGQuZ2V0U2l6ZSgpO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBhcHBseSByZXN1bHRzIG9mIHJlbmRlcmluZyB0aGlzIHN1YnRyZWUgdG8gdGhlIGRvY3VtZW50XG5mdW5jdGlvbiBfYXBwbHlDb21taXQoc3BlYywgY29udGV4dCwgY2FjaGVTdG9yYWdlKSB7XG4gICAgdmFyIHJlc3VsdCA9IFNwZWNQYXJzZXIucGFyc2Uoc3BlYywgY29udGV4dCk7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhyZXN1bHQpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaWQgPSBrZXlzW2ldO1xuICAgICAgICB2YXIgY2hpbGROb2RlID0gRW50aXR5LmdldChpZCk7XG4gICAgICAgIHZhciBjb21taXRQYXJhbXMgPSByZXN1bHRbaWRdO1xuICAgICAgICBjb21taXRQYXJhbXMuYWxsb2NhdG9yID0gY29udGV4dC5hbGxvY2F0b3I7XG4gICAgICAgIHZhciBjb21taXRSZXN1bHQgPSBjaGlsZE5vZGUuY29tbWl0KGNvbW1pdFBhcmFtcyk7XG4gICAgICAgIGlmIChjb21taXRSZXN1bHQpIF9hcHBseUNvbW1pdChjb21taXRSZXN1bHQsIGNvbnRleHQsIGNhY2hlU3RvcmFnZSk7XG4gICAgICAgIGVsc2UgY2FjaGVTdG9yYWdlW2lkXSA9IGNvbW1pdFBhcmFtcztcbiAgICB9XG59XG5cbi8qKlxuICogQ29tbWl0IHRoZSBjb250ZW50IGNoYW5nZSBmcm9tIHRoaXMgbm9kZSB0byB0aGUgZG9jdW1lbnQuXG4gKlxuICogQHByaXZhdGVcbiAqIEBtZXRob2QgY29tbWl0XG4gKiBAcGFyYW0ge0NvbnRleHR9IGNvbnRleHQgcmVuZGVyIGNvbnRleHRcbiAqL1xuUmVuZGVyTm9kZS5wcm90b3R5cGUuY29tbWl0ID0gZnVuY3Rpb24gY29tbWl0KGNvbnRleHQpIHtcbiAgICAvLyBmcmVlIHVwIHNvbWUgZGl2cyBmcm9tIHRoZSBsYXN0IGxvb3BcbiAgICB2YXIgcHJldktleXMgPSBPYmplY3Qua2V5cyh0aGlzLl9wcmV2UmVzdWx0cyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcmV2S2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgaWQgPSBwcmV2S2V5c1tpXTtcbiAgICAgICAgaWYgKHRoaXMuX3Jlc3VsdENhY2hlW2lkXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YXIgb2JqZWN0ID0gRW50aXR5LmdldChpZCk7XG4gICAgICAgICAgICBpZiAob2JqZWN0LmNsZWFudXApIG9iamVjdC5jbGVhbnVwKGNvbnRleHQuYWxsb2NhdG9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX3ByZXZSZXN1bHRzID0gdGhpcy5fcmVzdWx0Q2FjaGU7XG4gICAgdGhpcy5fcmVzdWx0Q2FjaGUgPSB7fTtcbiAgICBfYXBwbHlDb21taXQodGhpcy5yZW5kZXIoKSwgY29udGV4dCwgdGhpcy5fcmVzdWx0Q2FjaGUpO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhIHJlbmRlciBzcGVjIGZyb20gdGhlIGNvbnRlbnRzIG9mIHRoZSB3cmFwcGVkIGNvbXBvbmVudC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG1ldGhvZCByZW5kZXJcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IHJlbmRlciBzcGVjaWZpY2F0aW9uIGZvciB0aGUgY29tcG9uZW50IHN1YnRyZWVcbiAqICAgIG9ubHkgdW5kZXIgdGhpcyBub2RlLlxuICovXG5SZW5kZXJOb2RlLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgaWYgKHRoaXMuX2lzUmVuZGVyYWJsZSkgcmV0dXJuIHRoaXMuX29iamVjdC5yZW5kZXIoKTtcblxuICAgIHZhciByZXN1bHQgPSBudWxsO1xuICAgIGlmICh0aGlzLl9oYXNNdWx0aXBsZUNoaWxkcmVuKSB7XG4gICAgICAgIHJlc3VsdCA9IHRoaXMuX2NoaWxkUmVzdWx0O1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSB0aGlzLl9jaGlsZDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcmVzdWx0W2ldID0gY2hpbGRyZW5baV0ucmVuZGVyKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5fY2hpbGQpIHJlc3VsdCA9IHRoaXMuX2NoaWxkLnJlbmRlcigpO1xuXG4gICAgcmV0dXJuIHRoaXMuX2lzTW9kaWZpZXIgPyB0aGlzLl9vYmplY3QubW9kaWZ5KHJlc3VsdCkgOiByZXN1bHQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlbmRlck5vZGU7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvY29yZS9SZW5kZXJOb2RlLmpzXCIsXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogbWFya0BmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9UcmFuc2Zvcm0nKTtcblxuLyoqXG4gKlxuICogVGhpcyBvYmplY3QgdHJhbnNsYXRlcyB0aGUgcmVuZGVyaW5nIGluc3RydWN0aW9ucyAoXCJyZW5kZXIgc3BlY3NcIilcbiAqICAgdGhhdCByZW5kZXJhYmxlIGNvbXBvbmVudHMgZ2VuZXJhdGUgaW50byBkb2N1bWVudCB1cGRhdGVcbiAqICAgaW5zdHJ1Y3Rpb25zIChcInVwZGF0ZSBzcGVjc1wiKS4gIFByaXZhdGUuXG4gKlxuICogQHByaXZhdGVcbiAqIEBjbGFzcyBTcGVjUGFyc2VyXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gU3BlY1BhcnNlcigpIHtcbiAgICB0aGlzLnJlc3VsdCA9IHt9O1xufVxuU3BlY1BhcnNlci5faW5zdGFuY2UgPSBuZXcgU3BlY1BhcnNlcigpO1xuXG4vKipcbiAqIENvbnZlcnQgYSByZW5kZXIgc3BlYyBjb21pbmcgZnJvbSB0aGUgY29udGV4dCdzIHJlbmRlciBjaGFpbiB0byBhblxuICogICAgdXBkYXRlIHNwZWMgZm9yIHRoZSB1cGRhdGUgY2hhaW4uIFRoaXMgaXMgdGhlIG9ubHkgbWFqb3IgZW50cnkgcG9pbnRcbiAqICAgIGZvciBhIGNvbnN1bWVyIG9mIHRoaXMgY2xhc3MuXG4gKlxuICogQG1ldGhvZCBwYXJzZVxuICogQHN0YXRpY1xuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0ge3JlbmRlclNwZWN9IHNwZWMgaW5wdXQgcmVuZGVyIHNwZWNcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZXh0IGNvbnRleHQgdG8gZG8gdGhlIHBhcnNlIGluXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSByZXN1bHRpbmcgdXBkYXRlIHNwZWMgKGlmIG5vIGNhbGxiYWNrXG4gKiAgIHNwZWNpZmllZCwgZWxzZSBub25lKVxuICovXG5TcGVjUGFyc2VyLnBhcnNlID0gZnVuY3Rpb24gcGFyc2Uoc3BlYywgY29udGV4dCkge1xuICAgIHJldHVybiBTcGVjUGFyc2VyLl9pbnN0YW5jZS5wYXJzZShzcGVjLCBjb250ZXh0KTtcbn07XG5cbi8qKlxuICogQ29udmVydCBhIHJlbmRlclNwZWMgY29taW5nIGZyb20gdGhlIGNvbnRleHQncyByZW5kZXIgY2hhaW4gdG8gYW4gdXBkYXRlXG4gKiAgICBzcGVjIGZvciB0aGUgdXBkYXRlIGNoYWluLiBUaGlzIGlzIHRoZSBvbmx5IG1ham9yIGVudHJ5cG9pbnQgZm9yIGFcbiAqICAgIGNvbnN1bWVyIG9mIHRoaXMgY2xhc3MuXG4gKlxuICogQG1ldGhvZCBwYXJzZVxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3JlbmRlclNwZWN9IHNwZWMgaW5wdXQgcmVuZGVyIHNwZWNcbiAqIEBwYXJhbSB7Q29udGV4dH0gY29udGV4dFxuICogQHJldHVybiB7dXBkYXRlU3BlY30gdGhlIHJlc3VsdGluZyB1cGRhdGUgc3BlY1xuICovXG5TcGVjUGFyc2VyLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uIHBhcnNlKHNwZWMsIGNvbnRleHQpIHtcbiAgICB0aGlzLnJlc2V0KCk7XG4gICAgdGhpcy5fcGFyc2VTcGVjKHNwZWMsIGNvbnRleHQsIFRyYW5zZm9ybS5pZGVudGl0eSk7XG4gICAgcmV0dXJuIHRoaXMucmVzdWx0O1xufTtcblxuLyoqXG4gKiBQcmVwYXJlIFNwZWNQYXJzZXIgZm9yIHJlLXVzZSAob3IgZmlyc3QgdXNlKSBieSBzZXR0aW5nIGludGVybmFsIHN0YXRlXG4gKiAgdG8gYmxhbmsuXG4gKlxuICogQHByaXZhdGVcbiAqIEBtZXRob2QgcmVzZXRcbiAqL1xuU3BlY1BhcnNlci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiByZXNldCgpIHtcbiAgICB0aGlzLnJlc3VsdCA9IHt9O1xufTtcblxuLy8gTXVsdGlwbHkgbWF0cml4IE0gYnkgdmVjdG9yIHZcbmZ1bmN0aW9uIF92ZWNJbkNvbnRleHQodiwgbSkge1xuICAgIHJldHVybiBbXG4gICAgICAgIHZbMF0gKiBtWzBdICsgdlsxXSAqIG1bNF0gKyB2WzJdICogbVs4XSxcbiAgICAgICAgdlswXSAqIG1bMV0gKyB2WzFdICogbVs1XSArIHZbMl0gKiBtWzldLFxuICAgICAgICB2WzBdICogbVsyXSArIHZbMV0gKiBtWzZdICsgdlsyXSAqIG1bMTBdXG4gICAgXTtcbn1cblxudmFyIF9vcmlnaW5aZXJvWmVybyA9IFswLCAwXTtcblxuLy8gRnJvbSB0aGUgcHJvdmlkZWQgcmVuZGVyU3BlYyB0cmVlLCByZWN1cnNpdmVseSBjb21wb3NlIG9wYWNpdGllcyxcbi8vICAgIG9yaWdpbnMsIHRyYW5zZm9ybXMsIGFuZCBzaXplcyBjb3JyZXNwb25kaW5nIHRvIGVhY2ggc3VyZmFjZSBpZCBmcm9tXG4vLyAgICB0aGUgcHJvdmlkZWQgcmVuZGVyU3BlYyB0cmVlIHN0cnVjdHVyZS4gT24gY29tcGxldGlvbiwgdGhvc2Vcbi8vICAgIHByb3BlcnRpZXMgb2YgJ3RoaXMnIG9iamVjdCBzaG91bGQgYmUgcmVhZHkgdG8gdXNlIHRvIGJ1aWxkIGFuXG4vLyAgICB1cGRhdGVTcGVjLlxuU3BlY1BhcnNlci5wcm90b3R5cGUuX3BhcnNlU3BlYyA9IGZ1bmN0aW9uIF9wYXJzZVNwZWMoc3BlYywgcGFyZW50Q29udGV4dCwgc2l6ZUNvbnRleHQpIHtcbiAgICB2YXIgaWQ7XG4gICAgdmFyIHRhcmdldDtcbiAgICB2YXIgdHJhbnNmb3JtO1xuICAgIHZhciBvcGFjaXR5O1xuICAgIHZhciBvcmlnaW47XG4gICAgdmFyIGFsaWduO1xuICAgIHZhciBzaXplO1xuXG4gICAgaWYgKHR5cGVvZiBzcGVjID09PSAnbnVtYmVyJykge1xuICAgICAgICBpZCA9IHNwZWM7XG4gICAgICAgIHRyYW5zZm9ybSA9IHBhcmVudENvbnRleHQudHJhbnNmb3JtO1xuICAgICAgICBhbGlnbiA9IHBhcmVudENvbnRleHQuYWxpZ24gfHwgcGFyZW50Q29udGV4dC5vcmlnaW47XG4gICAgICAgIGlmIChwYXJlbnRDb250ZXh0LnNpemUgJiYgYWxpZ24gJiYgKGFsaWduWzBdIHx8IGFsaWduWzFdKSkge1xuICAgICAgICAgICAgdmFyIGFsaWduQWRqdXN0ID0gW2FsaWduWzBdICogcGFyZW50Q29udGV4dC5zaXplWzBdLCBhbGlnblsxXSAqIHBhcmVudENvbnRleHQuc2l6ZVsxXSwgMF07XG4gICAgICAgICAgICB0cmFuc2Zvcm0gPSBUcmFuc2Zvcm0udGhlbk1vdmUodHJhbnNmb3JtLCBfdmVjSW5Db250ZXh0KGFsaWduQWRqdXN0LCBzaXplQ29udGV4dCkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVzdWx0W2lkXSA9IHtcbiAgICAgICAgICAgIHRyYW5zZm9ybTogdHJhbnNmb3JtLFxuICAgICAgICAgICAgb3BhY2l0eTogcGFyZW50Q29udGV4dC5vcGFjaXR5LFxuICAgICAgICAgICAgb3JpZ2luOiBwYXJlbnRDb250ZXh0Lm9yaWdpbiB8fCBfb3JpZ2luWmVyb1plcm8sXG4gICAgICAgICAgICBhbGlnbjogcGFyZW50Q29udGV4dC5hbGlnbiB8fCBwYXJlbnRDb250ZXh0Lm9yaWdpbiB8fCBfb3JpZ2luWmVyb1plcm8sXG4gICAgICAgICAgICBzaXplOiBwYXJlbnRDb250ZXh0LnNpemVcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZWxzZSBpZiAoIXNwZWMpIHsgLy8gcGxhY2VkIGhlcmUgc28gMCB3aWxsIGJlIGNhY2hlZCBlYXJsaWVyXG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZWxzZSBpZiAoc3BlYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3BlYy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5fcGFyc2VTcGVjKHNwZWNbaV0sIHBhcmVudENvbnRleHQsIHNpemVDb250ZXh0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGFyZ2V0ID0gc3BlYy50YXJnZXQ7XG4gICAgICAgIHRyYW5zZm9ybSA9IHBhcmVudENvbnRleHQudHJhbnNmb3JtO1xuICAgICAgICBvcGFjaXR5ID0gcGFyZW50Q29udGV4dC5vcGFjaXR5O1xuICAgICAgICBvcmlnaW4gPSBwYXJlbnRDb250ZXh0Lm9yaWdpbjtcbiAgICAgICAgYWxpZ24gPSBwYXJlbnRDb250ZXh0LmFsaWduO1xuICAgICAgICBzaXplID0gcGFyZW50Q29udGV4dC5zaXplO1xuICAgICAgICB2YXIgbmV4dFNpemVDb250ZXh0ID0gc2l6ZUNvbnRleHQ7XG5cbiAgICAgICAgaWYgKHNwZWMub3BhY2l0eSAhPT0gdW5kZWZpbmVkKSBvcGFjaXR5ID0gcGFyZW50Q29udGV4dC5vcGFjaXR5ICogc3BlYy5vcGFjaXR5O1xuICAgICAgICBpZiAoc3BlYy50cmFuc2Zvcm0pIHRyYW5zZm9ybSA9IFRyYW5zZm9ybS5tdWx0aXBseShwYXJlbnRDb250ZXh0LnRyYW5zZm9ybSwgc3BlYy50cmFuc2Zvcm0pO1xuICAgICAgICBpZiAoc3BlYy5vcmlnaW4pIHtcbiAgICAgICAgICAgIG9yaWdpbiA9IHNwZWMub3JpZ2luO1xuICAgICAgICAgICAgbmV4dFNpemVDb250ZXh0ID0gcGFyZW50Q29udGV4dC50cmFuc2Zvcm07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNwZWMuYWxpZ24pIGFsaWduID0gc3BlYy5hbGlnbjtcbiAgICAgICAgaWYgKHNwZWMuc2l6ZSkge1xuICAgICAgICAgICAgdmFyIHBhcmVudFNpemUgPSBwYXJlbnRDb250ZXh0LnNpemU7XG4gICAgICAgICAgICBzaXplID0gW1xuICAgICAgICAgICAgICAgIHNwZWMuc2l6ZVswXSAhPT0gdW5kZWZpbmVkID8gc3BlYy5zaXplWzBdIDogcGFyZW50U2l6ZVswXSxcbiAgICAgICAgICAgICAgICBzcGVjLnNpemVbMV0gIT09IHVuZGVmaW5lZCA/IHNwZWMuc2l6ZVsxXSA6IHBhcmVudFNpemVbMV1cbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBpZiAocGFyZW50U2l6ZSkge1xuICAgICAgICAgICAgICAgIGlmICghYWxpZ24pIGFsaWduID0gb3JpZ2luO1xuICAgICAgICAgICAgICAgIGlmIChhbGlnbiAmJiAoYWxpZ25bMF0gfHwgYWxpZ25bMV0pKSB0cmFuc2Zvcm0gPSBUcmFuc2Zvcm0udGhlbk1vdmUodHJhbnNmb3JtLCBfdmVjSW5Db250ZXh0KFthbGlnblswXSAqIHBhcmVudFNpemVbMF0sIGFsaWduWzFdICogcGFyZW50U2l6ZVsxXSwgMF0sIHNpemVDb250ZXh0KSk7XG4gICAgICAgICAgICAgICAgaWYgKG9yaWdpbiAmJiAob3JpZ2luWzBdIHx8IG9yaWdpblsxXSkpIHRyYW5zZm9ybSA9IFRyYW5zZm9ybS5tb3ZlVGhlbihbLW9yaWdpblswXSAqIHNpemVbMF0sIC1vcmlnaW5bMV0gKiBzaXplWzFdLCAwXSwgdHJhbnNmb3JtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5leHRTaXplQ29udGV4dCA9IHBhcmVudENvbnRleHQudHJhbnNmb3JtO1xuICAgICAgICAgICAgb3JpZ2luID0gbnVsbDtcbiAgICAgICAgICAgIGFsaWduID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3BhcnNlU3BlYyh0YXJnZXQsIHtcbiAgICAgICAgICAgIHRyYW5zZm9ybTogdHJhbnNmb3JtLFxuICAgICAgICAgICAgb3BhY2l0eTogb3BhY2l0eSxcbiAgICAgICAgICAgIG9yaWdpbjogb3JpZ2luLFxuICAgICAgICAgICAgYWxpZ246IGFsaWduLFxuICAgICAgICAgICAgc2l6ZTogc2l6ZVxuICAgICAgICB9LCBuZXh0U2l6ZUNvbnRleHQpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3BlY1BhcnNlcjtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL1NwZWNQYXJzZXIuanNcIixcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL2NvcmVcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyOiBtYXJrQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbnZhciBFbnRpdHkgPSByZXF1aXJlKCcuL0VudGl0eScpO1xudmFyIEV2ZW50SGFuZGxlciA9IHJlcXVpcmUoJy4vRXZlbnRIYW5kbGVyJyk7XG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9UcmFuc2Zvcm0nKTtcblxudmFyIGRldmljZVBpeGVsUmF0aW8gPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxO1xudmFyIHVzZVByZWZpeCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLnN0eWxlLndlYmtpdFRyYW5zZm9ybSAhPT0gdW5kZWZpbmVkO1xuXG4vKipcbiAqIEEgYmFzZSBjbGFzcyBmb3Igdmlld2FibGUgY29udGVudCBhbmQgZXZlbnRcbiAqICAgdGFyZ2V0cyBpbnNpZGUgYSBGYW1vLnVzIGFwcGxpY2F0aW9uLCBjb250YWluaW5nIGEgcmVuZGVyYWJsZSBkb2N1bWVudFxuICogICBmcmFnbWVudC4gTGlrZSBhbiBIVE1MIGRpdiwgaXQgY2FuIGFjY2VwdCBpbnRlcm5hbCBtYXJrdXAsXG4gKiAgIHByb3BlcnRpZXMsIGNsYXNzZXMsIGFuZCBoYW5kbGUgZXZlbnRzLlxuICpcbiAqIEBjbGFzcyBTdXJmYWNlXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIGRlZmF1bHQgb3B0aW9uIG92ZXJyaWRlc1xuICogQHBhcmFtIHtBcnJheS5OdW1iZXJ9IFtvcHRpb25zLnNpemVdIFt3aWR0aCwgaGVpZ2h0XSBpbiBwaXhlbHNcbiAqIEBwYXJhbSB7QXJyYXkuc3RyaW5nfSBbb3B0aW9ucy5jbGFzc2VzXSBDU1MgY2xhc3NlcyB0byBzZXQgb24gaW5uZXIgY29udGVudFxuICogQHBhcmFtIHtBcnJheX0gW29wdGlvbnMucHJvcGVydGllc10gc3RyaW5nIGRpY3Rpb25hcnkgb2YgSFRNTCBhdHRyaWJ1dGVzIHRvIHNldCBvbiB0YXJnZXQgZGl2XG4gKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMuY29udGVudF0gaW5uZXIgKEhUTUwpIGNvbnRlbnQgb2Ygc3VyZmFjZVxuICovXG5mdW5jdGlvbiBTdXJmYWNlKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSB7fTtcblxuICAgIHRoaXMucHJvcGVydGllcyA9IHt9O1xuICAgIHRoaXMuY29udGVudCA9ICcnO1xuICAgIHRoaXMuY2xhc3NMaXN0ID0gW107XG4gICAgdGhpcy5zaXplID0gbnVsbDtcblxuICAgIHRoaXMuX2NsYXNzZXNEaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5fc3R5bGVzRGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3NpemVEaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5fY29udGVudERpcnR5ID0gdHJ1ZTtcblxuICAgIHRoaXMuX2RpcnR5Q2xhc3NlcyA9IFtdO1xuXG4gICAgdGhpcy5fbWF0cml4ID0gbnVsbDtcbiAgICB0aGlzLl9vcGFjaXR5ID0gMTtcbiAgICB0aGlzLl9vcmlnaW4gPSBudWxsO1xuICAgIHRoaXMuX3NpemUgPSBudWxsO1xuXG4gICAgLyoqIEBpZ25vcmUgKi9cbiAgICB0aGlzLmV2ZW50Rm9yd2FyZGVyID0gZnVuY3Rpb24gZXZlbnRGb3J3YXJkZXIoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5lbWl0KGV2ZW50LnR5cGUsIGV2ZW50KTtcbiAgICB9LmJpbmQodGhpcyk7XG4gICAgdGhpcy5ldmVudEhhbmRsZXIgPSBuZXcgRXZlbnRIYW5kbGVyKCk7XG4gICAgdGhpcy5ldmVudEhhbmRsZXIuYmluZFRoaXModGhpcyk7XG5cbiAgICB0aGlzLmlkID0gRW50aXR5LnJlZ2lzdGVyKHRoaXMpO1xuXG4gICAgaWYgKG9wdGlvbnMpIHRoaXMuc2V0T3B0aW9ucyhvcHRpb25zKTtcblxuICAgIHRoaXMuX2N1cnJUYXJnZXQgPSBudWxsO1xufVxuU3VyZmFjZS5wcm90b3R5cGUuZWxlbWVudFR5cGUgPSAnZGl2JztcblN1cmZhY2UucHJvdG90eXBlLmVsZW1lbnRDbGFzcyA9ICdmYW1vdXMtc3VyZmFjZSc7XG5cbi8qKlxuICogQmluZCBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGFuIGV2ZW50IHR5cGUgaGFuZGxlZCBieSB0aGlzIG9iamVjdC5cbiAqXG4gKiBAbWV0aG9kIFwib25cIlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIGV2ZW50IHR5cGUga2V5IChmb3IgZXhhbXBsZSwgJ2NsaWNrJylcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oc3RyaW5nLCBPYmplY3QpfSBmbiBoYW5kbGVyIGNhbGxiYWNrXG4gKiBAcmV0dXJuIHtFdmVudEhhbmRsZXJ9IHRoaXNcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbih0eXBlLCBmbikge1xuICAgIGlmICh0aGlzLl9jdXJyVGFyZ2V0KSB0aGlzLl9jdXJyVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgdGhpcy5ldmVudEZvcndhcmRlcik7XG4gICAgdGhpcy5ldmVudEhhbmRsZXIub24odHlwZSwgZm4pO1xufTtcblxuLyoqXG4gKiBVbmJpbmQgYW4gZXZlbnQgYnkgdHlwZSBhbmQgaGFuZGxlci5cbiAqICAgVGhpcyB1bmRvZXMgdGhlIHdvcmsgb2YgXCJvblwiXG4gKlxuICogQG1ldGhvZCByZW1vdmVMaXN0ZW5lclxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtmdW5jdGlvbihzdHJpbmcsIE9iamVjdCl9IGZuIGhhbmRsZXJcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcih0eXBlLCBmbikge1xuICAgIHRoaXMuZXZlbnRIYW5kbGVyLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGZuKTtcbn07XG5cbi8qKlxuICogVHJpZ2dlciBhbiBldmVudCwgc2VuZGluZyB0byBhbGwgZG93bnN0cmVhbSBoYW5kbGVyc1xuICogICBsaXN0ZW5pbmcgZm9yIHByb3ZpZGVkICd0eXBlJyBrZXkuXG4gKlxuICogQG1ldGhvZCBlbWl0XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgZXZlbnQgdHlwZSBrZXkgKGZvciBleGFtcGxlLCAnY2xpY2snKVxuICogQHBhcmFtIHtPYmplY3R9IFtldmVudF0gZXZlbnQgZGF0YVxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSB0aGlzXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KHR5cGUsIGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50ICYmICFldmVudC5vcmlnaW4pIGV2ZW50Lm9yaWdpbiA9IHRoaXM7XG4gICAgdmFyIGhhbmRsZWQgPSB0aGlzLmV2ZW50SGFuZGxlci5lbWl0KHR5cGUsIGV2ZW50KTtcbiAgICBpZiAoaGFuZGxlZCAmJiBldmVudCAmJiBldmVudC5zdG9wUHJvcGFnYXRpb24pIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIHJldHVybiBoYW5kbGVkO1xufTtcblxuLyoqXG4gKiBBZGQgZXZlbnQgaGFuZGxlciBvYmplY3QgdG8gc2V0IG9mIGRvd25zdHJlYW0gaGFuZGxlcnMuXG4gKlxuICogQG1ldGhvZCBwaXBlXG4gKlxuICogQHBhcmFtIHtFdmVudEhhbmRsZXJ9IHRhcmdldCBldmVudCBoYW5kbGVyIHRhcmdldCBvYmplY3RcbiAqIEByZXR1cm4ge0V2ZW50SGFuZGxlcn0gcGFzc2VkIGV2ZW50IGhhbmRsZXJcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uIHBpcGUodGFyZ2V0KSB7XG4gICAgcmV0dXJuIHRoaXMuZXZlbnRIYW5kbGVyLnBpcGUodGFyZ2V0KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGhhbmRsZXIgb2JqZWN0IGZyb20gc2V0IG9mIGRvd25zdHJlYW0gaGFuZGxlcnMuXG4gKiAgIFVuZG9lcyB3b3JrIG9mIFwicGlwZVwiXG4gKlxuICogQG1ldGhvZCB1bnBpcGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50SGFuZGxlcn0gdGFyZ2V0IHRhcmdldCBoYW5kbGVyIG9iamVjdFxuICogQHJldHVybiB7RXZlbnRIYW5kbGVyfSBwcm92aWRlZCB0YXJnZXRcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUudW5waXBlID0gZnVuY3Rpb24gdW5waXBlKHRhcmdldCkge1xuICAgIHJldHVybiB0aGlzLmV2ZW50SGFuZGxlci51bnBpcGUodGFyZ2V0KTtcbn07XG5cbi8qKlxuICogUmV0dXJuIHNwZWMgZm9yIHRoaXMgc3VyZmFjZS4gTm90ZSB0aGF0IGZvciBhIGJhc2Ugc3VyZmFjZSwgdGhpcyBpc1xuICogICAgc2ltcGx5IGFuIGlkLlxuICpcbiAqIEBtZXRob2QgcmVuZGVyXG4gKiBAcHJpdmF0ZVxuICogQHJldHVybiB7T2JqZWN0fSByZW5kZXIgc3BlYyBmb3IgdGhpcyBzdXJmYWNlIChzcGVjIGlkKVxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuaWQ7XG59O1xuXG4vKipcbiAqIFNldCBDU1Mtc3R5bGUgcHJvcGVydGllcyBvbiB0aGlzIFN1cmZhY2UuIE5vdGUgdGhhdCB0aGlzIHdpbGwgY2F1c2VcbiAqICAgIGRpcnR5aW5nIGFuZCB0aHVzIHJlLXJlbmRlcmluZywgZXZlbiBpZiB2YWx1ZXMgZG8gbm90IGNoYW5nZS5cbiAqXG4gKiBAbWV0aG9kIHNldFByb3BlcnRpZXNcbiAqIEBwYXJhbSB7T2JqZWN0fSBwcm9wZXJ0aWVzIHByb3BlcnR5IGRpY3Rpb25hcnkgb2YgXCJrZXlcIiA9PiBcInZhbHVlXCJcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuc2V0UHJvcGVydGllcyA9IGZ1bmN0aW9uIHNldFByb3BlcnRpZXMocHJvcGVydGllcykge1xuICAgIGZvciAodmFyIG4gaW4gcHJvcGVydGllcykge1xuICAgICAgICB0aGlzLnByb3BlcnRpZXNbbl0gPSBwcm9wZXJ0aWVzW25dO1xuICAgIH1cbiAgICB0aGlzLl9zdHlsZXNEaXJ0eSA9IHRydWU7XG59O1xuXG4vKipcbiAqIEdldCBDU1Mtc3R5bGUgcHJvcGVydGllcyBvbiB0aGlzIFN1cmZhY2UuXG4gKlxuICogQG1ldGhvZCBnZXRQcm9wZXJ0aWVzXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBEaWN0aW9uYXJ5IG9mIHRoaXMgU3VyZmFjZSdzIHByb3BlcnRpZXMuXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLmdldFByb3BlcnRpZXMgPSBmdW5jdGlvbiBnZXRQcm9wZXJ0aWVzKCkge1xuICAgIHJldHVybiB0aGlzLnByb3BlcnRpZXM7XG59O1xuXG4vKipcbiAqIEFkZCBDU1Mtc3R5bGUgY2xhc3MgdG8gdGhlIGxpc3Qgb2YgY2xhc3NlcyBvbiB0aGlzIFN1cmZhY2UuIE5vdGVcbiAqICAgdGhpcyB3aWxsIG1hcCBkaXJlY3RseSB0byB0aGUgSFRNTCBwcm9wZXJ0eSBvZiB0aGUgYWN0dWFsXG4gKiAgIGNvcnJlc3BvbmRpbmcgcmVuZGVyZWQgPGRpdj4uXG4gKlxuICogQG1ldGhvZCBhZGRDbGFzc1xuICogQHBhcmFtIHtzdHJpbmd9IGNsYXNzTmFtZSBuYW1lIG9mIGNsYXNzIHRvIGFkZFxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5hZGRDbGFzcyA9IGZ1bmN0aW9uIGFkZENsYXNzKGNsYXNzTmFtZSkge1xuICAgIGlmICh0aGlzLmNsYXNzTGlzdC5pbmRleE9mKGNsYXNzTmFtZSkgPCAwKSB7XG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LnB1c2goY2xhc3NOYW1lKTtcbiAgICAgICAgdGhpcy5fY2xhc3Nlc0RpcnR5ID0gdHJ1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJlbW92ZSBDU1Mtc3R5bGUgY2xhc3MgZnJvbSB0aGUgbGlzdCBvZiBjbGFzc2VzIG9uIHRoaXMgU3VyZmFjZS5cbiAqICAgTm90ZSB0aGlzIHdpbGwgbWFwIGRpcmVjdGx5IHRvIHRoZSBIVE1MIHByb3BlcnR5IG9mIHRoZSBhY3R1YWxcbiAqICAgY29ycmVzcG9uZGluZyByZW5kZXJlZCA8ZGl2Pi5cbiAqXG4gKiBAbWV0aG9kIHJlbW92ZUNsYXNzXG4gKiBAcGFyYW0ge3N0cmluZ30gY2xhc3NOYW1lIG5hbWUgb2YgY2xhc3MgdG8gcmVtb3ZlXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnJlbW92ZUNsYXNzID0gZnVuY3Rpb24gcmVtb3ZlQ2xhc3MoY2xhc3NOYW1lKSB7XG4gICAgdmFyIGkgPSB0aGlzLmNsYXNzTGlzdC5pbmRleE9mKGNsYXNzTmFtZSk7XG4gICAgaWYgKGkgPj0gMCkge1xuICAgICAgICB0aGlzLl9kaXJ0eUNsYXNzZXMucHVzaCh0aGlzLmNsYXNzTGlzdC5zcGxpY2UoaSwgMSlbMF0pO1xuICAgICAgICB0aGlzLl9jbGFzc2VzRGlydHkgPSB0cnVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVzZXQgY2xhc3MgbGlzdCB0byBwcm92aWRlZCBkaWN0aW9uYXJ5LlxuICogQG1ldGhvZCBzZXRDbGFzc2VzXG4gKiBAcGFyYW0ge0FycmF5LnN0cmluZ30gY2xhc3NMaXN0XG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnNldENsYXNzZXMgPSBmdW5jdGlvbiBzZXRDbGFzc2VzKGNsYXNzTGlzdCkge1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgcmVtb3ZhbCA9IFtdO1xuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmNsYXNzTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoY2xhc3NMaXN0LmluZGV4T2YodGhpcy5jbGFzc0xpc3RbaV0pIDwgMCkgcmVtb3ZhbC5wdXNoKHRoaXMuY2xhc3NMaXN0W2ldKTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IHJlbW92YWwubGVuZ3RoOyBpKyspIHRoaXMucmVtb3ZlQ2xhc3MocmVtb3ZhbFtpXSk7XG4gICAgLy8gZHVwbGljYXRlcyBhcmUgYWxyZWFkeSBjaGVja2VkIGJ5IGFkZENsYXNzKClcbiAgICBmb3IgKGkgPSAwOyBpIDwgY2xhc3NMaXN0Lmxlbmd0aDsgaSsrKSB0aGlzLmFkZENsYXNzKGNsYXNzTGlzdFtpXSk7XG59O1xuXG4vKipcbiAqIEdldCBhcnJheSBvZiBDU1Mtc3R5bGUgY2xhc3NlcyBhdHRhY2hlZCB0byB0aGlzIGRpdi5cbiAqXG4gKiBAbWV0aG9kIGdldENsYXNzbGlzdFxuICogQHJldHVybiB7QXJyYXkuc3RyaW5nfSBhcnJheSBvZiBjbGFzcyBuYW1lc1xuICovXG5TdXJmYWNlLnByb3RvdHlwZS5nZXRDbGFzc0xpc3QgPSBmdW5jdGlvbiBnZXRDbGFzc0xpc3QoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2xhc3NMaXN0O1xufTtcblxuLyoqXG4gKiBTZXQgb3Igb3ZlcndyaXRlIGlubmVyIChIVE1MKSBjb250ZW50IG9mIHRoaXMgc3VyZmFjZS4gTm90ZSB0aGF0IHRoaXNcbiAqICAgIGNhdXNlcyBhIHJlLXJlbmRlcmluZyBpZiB0aGUgY29udGVudCBoYXMgY2hhbmdlZC5cbiAqXG4gKiBAbWV0aG9kIHNldENvbnRlbnRcbiAqIEBwYXJhbSB7c3RyaW5nfERvY3VtZW50IEZyYWdtZW50fSBjb250ZW50IEhUTUwgY29udGVudFxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5zZXRDb250ZW50ID0gZnVuY3Rpb24gc2V0Q29udGVudChjb250ZW50KSB7XG4gICAgaWYgKHRoaXMuY29udGVudCAhPT0gY29udGVudCkge1xuICAgICAgICB0aGlzLmNvbnRlbnQgPSBjb250ZW50O1xuICAgICAgICB0aGlzLl9jb250ZW50RGlydHkgPSB0cnVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmV0dXJuIGlubmVyIChIVE1MKSBjb250ZW50IG9mIHRoaXMgc3VyZmFjZS5cbiAqXG4gKiBAbWV0aG9kIGdldENvbnRlbnRcbiAqXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGlubmVyIChIVE1MKSBjb250ZW50XG4gKi9cblN1cmZhY2UucHJvdG90eXBlLmdldENvbnRlbnQgPSBmdW5jdGlvbiBnZXRDb250ZW50KCkge1xuICAgIHJldHVybiB0aGlzLmNvbnRlbnQ7XG59O1xuXG4vKipcbiAqIFNldCBvcHRpb25zIGZvciB0aGlzIHN1cmZhY2VcbiAqXG4gKiBAbWV0aG9kIHNldE9wdGlvbnNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gb3ZlcnJpZGVzIGZvciBkZWZhdWx0IG9wdGlvbnMuICBTZWUgY29uc3RydWN0b3IuXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLnNldE9wdGlvbnMgPSBmdW5jdGlvbiBzZXRPcHRpb25zKG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy5zaXplKSB0aGlzLnNldFNpemUob3B0aW9ucy5zaXplKTtcbiAgICBpZiAob3B0aW9ucy5jbGFzc2VzKSB0aGlzLnNldENsYXNzZXMob3B0aW9ucy5jbGFzc2VzKTtcbiAgICBpZiAob3B0aW9ucy5wcm9wZXJ0aWVzKSB0aGlzLnNldFByb3BlcnRpZXMob3B0aW9ucy5wcm9wZXJ0aWVzKTtcbiAgICBpZiAob3B0aW9ucy5jb250ZW50KSB0aGlzLnNldENvbnRlbnQob3B0aW9ucy5jb250ZW50KTtcbn07XG5cbi8vICBBdHRhY2ggRmFtb3VzIGV2ZW50IGhhbmRsaW5nIHRvIGRvY3VtZW50IGV2ZW50cyBlbWFuYXRpbmcgZnJvbSB0YXJnZXRcbi8vICAgIGRvY3VtZW50IGVsZW1lbnQuICBUaGlzIG9jY3VycyBqdXN0IGFmdGVyIGRlcGxveW1lbnQgdG8gdGhlIGRvY3VtZW50LlxuLy8gICAgQ2FsbGluZyB0aGlzIGVuYWJsZXMgbWV0aG9kcyBsaWtlICNvbiBhbmQgI3BpcGUuXG5mdW5jdGlvbiBfYWRkRXZlbnRMaXN0ZW5lcnModGFyZ2V0KSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLmV2ZW50SGFuZGxlci5saXN0ZW5lcnMpIHtcbiAgICAgICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoaSwgdGhpcy5ldmVudEZvcndhcmRlcik7XG4gICAgfVxufVxuXG4vLyAgRGV0YWNoIEZhbW91cyBldmVudCBoYW5kbGluZyBmcm9tIGRvY3VtZW50IGV2ZW50cyBlbWFuYXRpbmcgZnJvbSB0YXJnZXRcbi8vICBkb2N1bWVudCBlbGVtZW50LiAgVGhpcyBvY2N1cnMganVzdCBiZWZvcmUgcmVjYWxsIGZyb20gdGhlIGRvY3VtZW50LlxuZnVuY3Rpb24gX3JlbW92ZUV2ZW50TGlzdGVuZXJzKHRhcmdldCkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5ldmVudEhhbmRsZXIubGlzdGVuZXJzKSB7XG4gICAgICAgIHRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKGksIHRoaXMuZXZlbnRGb3J3YXJkZXIpO1xuICAgIH1cbn1cblxuIC8vICBBcHBseSB0byBkb2N1bWVudCBhbGwgY2hhbmdlcyBmcm9tIHJlbW92ZUNsYXNzKCkgc2luY2UgbGFzdCBzZXR1cCgpLlxuZnVuY3Rpb24gX2NsZWFudXBDbGFzc2VzKHRhcmdldCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fZGlydHlDbGFzc2VzLmxlbmd0aDsgaSsrKSB0YXJnZXQuY2xhc3NMaXN0LnJlbW92ZSh0aGlzLl9kaXJ0eUNsYXNzZXNbaV0pO1xuICAgIHRoaXMuX2RpcnR5Q2xhc3NlcyA9IFtdO1xufVxuXG4vLyBBcHBseSB2YWx1ZXMgb2YgYWxsIEZhbW91cy1tYW5hZ2VkIHN0eWxlcyB0byB0aGUgZG9jdW1lbnQgZWxlbWVudC5cbi8vICBUaGVzZSB3aWxsIGJlIGRlcGxveWVkIHRvIHRoZSBkb2N1bWVudCBvbiBjYWxsIHRvICNzZXR1cCgpLlxuZnVuY3Rpb24gX2FwcGx5U3R5bGVzKHRhcmdldCkge1xuICAgIGZvciAodmFyIG4gaW4gdGhpcy5wcm9wZXJ0aWVzKSB7XG4gICAgICAgIHRhcmdldC5zdHlsZVtuXSA9IHRoaXMucHJvcGVydGllc1tuXTtcbiAgICB9XG59XG5cbi8vIENsZWFyIGFsbCBGYW1vdXMtbWFuYWdlZCBzdHlsZXMgZnJvbSB0aGUgZG9jdW1lbnQgZWxlbWVudC5cbi8vIFRoZXNlIHdpbGwgYmUgZGVwbG95ZWQgdG8gdGhlIGRvY3VtZW50IG9uIGNhbGwgdG8gI3NldHVwKCkuXG5mdW5jdGlvbiBfY2xlYW51cFN0eWxlcyh0YXJnZXQpIHtcbiAgICBmb3IgKHZhciBuIGluIHRoaXMucHJvcGVydGllcykge1xuICAgICAgICB0YXJnZXQuc3R5bGVbbl0gPSAnJztcbiAgICB9XG59XG5cbi8qKlxuICogUmV0dXJuIGEgTWF0cml4J3Mgd2Via2l0IGNzcyByZXByZXNlbnRhdGlvbiB0byBiZSB1c2VkIHdpdGggdGhlXG4gKiAgICBDU1MzIC13ZWJraXQtdHJhbnNmb3JtIHN0eWxlLlxuICogICAgRXhhbXBsZTogLXdlYmtpdC10cmFuc2Zvcm06IG1hdHJpeDNkKDEsMCwwLDAsMCwxLDAsMCwwLDAsMSwwLDcxNiwyNDMsMCwxKVxuICpcbiAqIEBtZXRob2QgX2Zvcm1hdENTU1RyYW5zZm9ybVxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7RmFtb3VzTWF0cml4fSBtIG1hdHJpeFxuICogQHJldHVybiB7c3RyaW5nfSBtYXRyaXgzZCBDU1Mgc3R5bGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIHRyYW5zZm9ybVxuICovXG5mdW5jdGlvbiBfZm9ybWF0Q1NTVHJhbnNmb3JtKG0pIHtcbiAgICBtWzEyXSA9IE1hdGgucm91bmQobVsxMl0gKiBkZXZpY2VQaXhlbFJhdGlvKSAvIGRldmljZVBpeGVsUmF0aW87XG4gICAgbVsxM10gPSBNYXRoLnJvdW5kKG1bMTNdICogZGV2aWNlUGl4ZWxSYXRpbykgLyBkZXZpY2VQaXhlbFJhdGlvO1xuXG4gICAgdmFyIHJlc3VsdCA9ICdtYXRyaXgzZCgnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMTU7IGkrKykge1xuICAgICAgICByZXN1bHQgKz0gKG1baV0gPCAwLjAwMDAwMSAmJiBtW2ldID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtW2ldICsgJywnO1xuICAgIH1cbiAgICByZXN1bHQgKz0gbVsxNV0gKyAnKSc7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBEaXJlY3RseSBhcHBseSBnaXZlbiBGYW1vdXNNYXRyaXggdG8gdGhlIGRvY3VtZW50IGVsZW1lbnQgYXMgdGhlXG4gKiAgIGFwcHJvcHJpYXRlIHdlYmtpdCBDU1Mgc3R5bGUuXG4gKlxuICogQG1ldGhvZCBzZXRNYXRyaXhcbiAqXG4gKiBAc3RhdGljXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IGRvY3VtZW50IGVsZW1lbnRcbiAqIEBwYXJhbSB7RmFtb3VzTWF0cml4fSBtYXRyaXhcbiAqL1xuXG52YXIgX3NldE1hdHJpeDtcbmlmIChuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkuaW5kZXhPZignZmlyZWZveCcpID4gLTEpIHtcbiAgICBfc2V0TWF0cml4ID0gZnVuY3Rpb24oZWxlbWVudCwgbWF0cml4KSB7XG4gICAgICAgIGVsZW1lbnQuc3R5bGUuekluZGV4ID0gKG1hdHJpeFsxNF0gKiAxMDAwMDAwKSB8IDA7ICAgIC8vIGZpeCBmb3IgRmlyZWZveCB6LWJ1ZmZlciBpc3N1ZXNcbiAgICAgICAgZWxlbWVudC5zdHlsZS50cmFuc2Zvcm0gPSBfZm9ybWF0Q1NTVHJhbnNmb3JtKG1hdHJpeCk7XG4gICAgfTtcbn1cbmVsc2UgaWYgKHVzZVByZWZpeCkge1xuICAgIF9zZXRNYXRyaXggPSBmdW5jdGlvbihlbGVtZW50LCBtYXRyaXgpIHtcbiAgICAgICAgZWxlbWVudC5zdHlsZS53ZWJraXRUcmFuc2Zvcm0gPSBfZm9ybWF0Q1NTVHJhbnNmb3JtKG1hdHJpeCk7XG4gICAgfTtcbn1cbmVsc2Uge1xuICAgIF9zZXRNYXRyaXggPSBmdW5jdGlvbihlbGVtZW50LCBtYXRyaXgpIHtcbiAgICAgICAgZWxlbWVudC5zdHlsZS50cmFuc2Zvcm0gPSBfZm9ybWF0Q1NTVHJhbnNmb3JtKG1hdHJpeCk7XG4gICAgfTtcbn1cblxuLy8gZm9ybWF0IG9yaWdpbiBhcyBDU1MgcGVyY2VudGFnZSBzdHJpbmdcbmZ1bmN0aW9uIF9mb3JtYXRDU1NPcmlnaW4ob3JpZ2luKSB7XG4gICAgcmV0dXJuICgxMDAgKiBvcmlnaW5bMF0pICsgJyUgJyArICgxMDAgKiBvcmlnaW5bMV0pICsgJyUnO1xufVxuXG4gLy8gRGlyZWN0bHkgYXBwbHkgZ2l2ZW4gb3JpZ2luIGNvb3JkaW5hdGVzIHRvIHRoZSBkb2N1bWVudCBlbGVtZW50IGFzIHRoZVxuIC8vIGFwcHJvcHJpYXRlIHdlYmtpdCBDU1Mgc3R5bGUuXG52YXIgX3NldE9yaWdpbiA9IHVzZVByZWZpeCA/IGZ1bmN0aW9uKGVsZW1lbnQsIG9yaWdpbikge1xuICAgIGVsZW1lbnQuc3R5bGUud2Via2l0VHJhbnNmb3JtT3JpZ2luID0gX2Zvcm1hdENTU09yaWdpbihvcmlnaW4pO1xufSA6IGZ1bmN0aW9uKGVsZW1lbnQsIG9yaWdpbikge1xuICAgIGVsZW1lbnQuc3R5bGUudHJhbnNmb3JtT3JpZ2luID0gX2Zvcm1hdENTU09yaWdpbihvcmlnaW4pO1xufTtcblxuIC8vIFNocmluayBnaXZlbiBkb2N1bWVudCBlbGVtZW50IHVudGlsIGl0IGlzIGVmZmVjdGl2ZWx5IGludmlzaWJsZS5cbnZhciBfc2V0SW52aXNpYmxlID0gdXNlUHJlZml4ID8gZnVuY3Rpb24oZWxlbWVudCkge1xuICAgIGVsZW1lbnQuc3R5bGUud2Via2l0VHJhbnNmb3JtID0gJ3NjYWxlM2QoMC4wMDAxLDAuMDAwMSwxKSc7XG4gICAgZWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gMDtcbn0gOiBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgZWxlbWVudC5zdHlsZS50cmFuc2Zvcm0gPSAnc2NhbGUzZCgwLjAwMDEsMC4wMDAxLDEpJztcbiAgICBlbGVtZW50LnN0eWxlLm9wYWNpdHkgPSAwO1xufTtcblxuZnVuY3Rpb24gX3h5Tm90RXF1YWxzKGEsIGIpIHtcbiAgICByZXR1cm4gKGEgJiYgYikgPyAoYVswXSAhPT0gYlswXSB8fCBhWzFdICE9PSBiWzFdKSA6IGEgIT09IGI7XG59XG5cbi8qKlxuICogT25lLXRpbWUgc2V0dXAgZm9yIGFuIGVsZW1lbnQgdG8gYmUgcmVhZHkgZm9yIGNvbW1pdHMgdG8gZG9jdW1lbnQuXG4gKlxuICogQHByaXZhdGVcbiAqIEBtZXRob2Qgc2V0dXBcbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnRBbGxvY2F0b3J9IGFsbG9jYXRvciBkb2N1bWVudCBlbGVtZW50IHBvb2wgZm9yIHRoaXMgY29udGV4dFxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5zZXR1cCA9IGZ1bmN0aW9uIHNldHVwKGFsbG9jYXRvcikge1xuICAgIHZhciB0YXJnZXQgPSBhbGxvY2F0b3IuYWxsb2NhdGUodGhpcy5lbGVtZW50VHlwZSk7XG4gICAgaWYgKHRoaXMuZWxlbWVudENsYXNzKSB7XG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnRDbGFzcyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZWxlbWVudENsYXNzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LmNsYXNzTGlzdC5hZGQodGhpcy5lbGVtZW50Q2xhc3NbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGFyZ2V0LmNsYXNzTGlzdC5hZGQodGhpcy5lbGVtZW50Q2xhc3MpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRhcmdldC5zdHlsZS5kaXNwbGF5ID0gJyc7XG4gICAgX2FkZEV2ZW50TGlzdGVuZXJzLmNhbGwodGhpcywgdGFyZ2V0KTtcbiAgICB0aGlzLl9jdXJyVGFyZ2V0ID0gdGFyZ2V0O1xuICAgIHRoaXMuX3N0eWxlc0RpcnR5ID0gdHJ1ZTtcbiAgICB0aGlzLl9jbGFzc2VzRGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3NpemVEaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5fY29udGVudERpcnR5ID0gdHJ1ZTtcbiAgICB0aGlzLl9tYXRyaXggPSBudWxsO1xuICAgIHRoaXMuX29wYWNpdHkgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fb3JpZ2luID0gbnVsbDtcbiAgICB0aGlzLl9zaXplID0gbnVsbDtcbn07XG5cbi8qKlxuICogQXBwbHkgY2hhbmdlcyBmcm9tIHRoaXMgY29tcG9uZW50IHRvIHRoZSBjb3JyZXNwb25kaW5nIGRvY3VtZW50IGVsZW1lbnQuXG4gKiBUaGlzIGluY2x1ZGVzIGNoYW5nZXMgdG8gY2xhc3Nlcywgc3R5bGVzLCBzaXplLCBjb250ZW50LCBvcGFjaXR5LCBvcmlnaW4sXG4gKiBhbmQgbWF0cml4IHRyYW5zZm9ybXMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBtZXRob2QgY29tbWl0XG4gKiBAcGFyYW0ge0NvbnRleHR9IGNvbnRleHQgY29tbWl0IGNvbnRleHRcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuY29tbWl0ID0gZnVuY3Rpb24gY29tbWl0KGNvbnRleHQpIHtcbiAgICBpZiAoIXRoaXMuX2N1cnJUYXJnZXQpIHRoaXMuc2V0dXAoY29udGV4dC5hbGxvY2F0b3IpO1xuICAgIHZhciB0YXJnZXQgPSB0aGlzLl9jdXJyVGFyZ2V0O1xuXG4gICAgdmFyIG1hdHJpeCA9IGNvbnRleHQudHJhbnNmb3JtO1xuICAgIHZhciBvcGFjaXR5ID0gY29udGV4dC5vcGFjaXR5O1xuICAgIHZhciBvcmlnaW4gPSBjb250ZXh0Lm9yaWdpbjtcbiAgICB2YXIgc2l6ZSA9IGNvbnRleHQuc2l6ZTtcblxuICAgIGlmICh0aGlzLl9jbGFzc2VzRGlydHkpIHtcbiAgICAgICAgX2NsZWFudXBDbGFzc2VzLmNhbGwodGhpcywgdGFyZ2V0KTtcbiAgICAgICAgdmFyIGNsYXNzTGlzdCA9IHRoaXMuZ2V0Q2xhc3NMaXN0KCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2xhc3NMaXN0Lmxlbmd0aDsgaSsrKSB0YXJnZXQuY2xhc3NMaXN0LmFkZChjbGFzc0xpc3RbaV0pO1xuICAgICAgICB0aGlzLl9jbGFzc2VzRGlydHkgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fc3R5bGVzRGlydHkpIHtcbiAgICAgICAgX2FwcGx5U3R5bGVzLmNhbGwodGhpcywgdGFyZ2V0KTtcbiAgICAgICAgdGhpcy5fc3R5bGVzRGlydHkgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fY29udGVudERpcnR5KSB7XG4gICAgICAgIHRoaXMuZGVwbG95KHRhcmdldCk7XG4gICAgICAgIHRoaXMuZXZlbnRIYW5kbGVyLmVtaXQoJ2RlcGxveScpO1xuICAgICAgICB0aGlzLl9jb250ZW50RGlydHkgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zaXplKSB7XG4gICAgICAgIHZhciBvcmlnU2l6ZSA9IHNpemU7XG4gICAgICAgIHNpemUgPSBbdGhpcy5zaXplWzBdLCB0aGlzLnNpemVbMV1dO1xuICAgICAgICBpZiAoc2l6ZVswXSA9PT0gdW5kZWZpbmVkICYmIG9yaWdTaXplWzBdKSBzaXplWzBdID0gb3JpZ1NpemVbMF07XG4gICAgICAgIGlmIChzaXplWzFdID09PSB1bmRlZmluZWQgJiYgb3JpZ1NpemVbMV0pIHNpemVbMV0gPSBvcmlnU2l6ZVsxXTtcbiAgICB9XG5cbiAgICBpZiAoc2l6ZVswXSA9PT0gdHJ1ZSkgc2l6ZVswXSA9IHRhcmdldC5jbGllbnRXaWR0aDtcbiAgICBpZiAoc2l6ZVsxXSA9PT0gdHJ1ZSkgc2l6ZVsxXSA9IHRhcmdldC5jbGllbnRIZWlnaHQ7XG5cbiAgICBpZiAoX3h5Tm90RXF1YWxzKHRoaXMuX3NpemUsIHNpemUpKSB7XG4gICAgICAgIGlmICghdGhpcy5fc2l6ZSkgdGhpcy5fc2l6ZSA9IFswLCAwXTtcbiAgICAgICAgdGhpcy5fc2l6ZVswXSA9IHNpemVbMF07XG4gICAgICAgIHRoaXMuX3NpemVbMV0gPSBzaXplWzFdO1xuICAgICAgICB0aGlzLl9zaXplRGlydHkgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghbWF0cml4ICYmIHRoaXMuX21hdHJpeCkge1xuICAgICAgICB0aGlzLl9tYXRyaXggPSBudWxsO1xuICAgICAgICB0aGlzLl9vcGFjaXR5ID0gMDtcbiAgICAgICAgX3NldEludmlzaWJsZSh0YXJnZXQpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX29wYWNpdHkgIT09IG9wYWNpdHkpIHtcbiAgICAgICAgdGhpcy5fb3BhY2l0eSA9IG9wYWNpdHk7XG4gICAgICAgIHRhcmdldC5zdHlsZS5vcGFjaXR5ID0gKG9wYWNpdHkgPj0gMSkgPyAnMC45OTk5OTknIDogb3BhY2l0eTtcbiAgICB9XG5cbiAgICBpZiAoX3h5Tm90RXF1YWxzKHRoaXMuX29yaWdpbiwgb3JpZ2luKSB8fCBUcmFuc2Zvcm0ubm90RXF1YWxzKHRoaXMuX21hdHJpeCwgbWF0cml4KSB8fCB0aGlzLl9zaXplRGlydHkpIHtcbiAgICAgICAgaWYgKCFtYXRyaXgpIG1hdHJpeCA9IFRyYW5zZm9ybS5pZGVudGl0eTtcbiAgICAgICAgdGhpcy5fbWF0cml4ID0gbWF0cml4O1xuICAgICAgICB2YXIgYWFNYXRyaXggPSBtYXRyaXg7XG4gICAgICAgIGlmIChvcmlnaW4pIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5fb3JpZ2luKSB0aGlzLl9vcmlnaW4gPSBbMCwgMF07XG4gICAgICAgICAgICB0aGlzLl9vcmlnaW5bMF0gPSBvcmlnaW5bMF07XG4gICAgICAgICAgICB0aGlzLl9vcmlnaW5bMV0gPSBvcmlnaW5bMV07XG4gICAgICAgICAgICBhYU1hdHJpeCA9IFRyYW5zZm9ybS50aGVuTW92ZShtYXRyaXgsIFstdGhpcy5fc2l6ZVswXSAqIG9yaWdpblswXSwgLXRoaXMuX3NpemVbMV0gKiBvcmlnaW5bMV0sIDBdKTtcbiAgICAgICAgICAgIF9zZXRPcmlnaW4odGFyZ2V0LCBvcmlnaW4pO1xuICAgICAgICB9XG4gICAgICAgIF9zZXRNYXRyaXgodGFyZ2V0LCBhYU1hdHJpeCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3NpemVEaXJ0eSkge1xuICAgICAgICBpZiAodGhpcy5fc2l6ZSkge1xuICAgICAgICAgICAgdGFyZ2V0LnN0eWxlLndpZHRoID0gKHRoaXMuc2l6ZSAmJiB0aGlzLnNpemVbMF0gPT09IHRydWUpID8gJycgOiB0aGlzLl9zaXplWzBdICsgJ3B4JztcbiAgICAgICAgICAgIHRhcmdldC5zdHlsZS5oZWlnaHQgPSAodGhpcy5zaXplICYmIHRoaXMuc2l6ZVsxXSA9PT0gdHJ1ZSkgPyAgJycgOiB0aGlzLl9zaXplWzFdICsgJ3B4JztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9zaXplRGlydHkgPSBmYWxzZTtcbiAgICB9XG59O1xuXG4vKipcbiAqICBSZW1vdmUgYWxsIEZhbW91cy1yZWxldmFudCBhdHRyaWJ1dGVzIGZyb20gYSBkb2N1bWVudCBlbGVtZW50LlxuICogICAgVGhpcyBpcyBjYWxsZWQgYnkgU3VyZmFjZU1hbmFnZXIncyBkZXRhY2goKS5cbiAqICAgIFRoaXMgaXMgaW4gc29tZSBzZW5zZSB0aGUgcmV2ZXJzZSBvZiAuZGVwbG95KCkuXG4gKlxuICogQHByaXZhdGVcbiAqIEBtZXRob2QgY2xlYW51cFxuICogQHBhcmFtIHtFbGVtZW50QWxsb2NhdG9yfSBhbGxvY2F0b3JcbiAqL1xuU3VyZmFjZS5wcm90b3R5cGUuY2xlYW51cCA9IGZ1bmN0aW9uIGNsZWFudXAoYWxsb2NhdG9yKSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciB0YXJnZXQgPSB0aGlzLl9jdXJyVGFyZ2V0O1xuICAgIHRoaXMuZXZlbnRIYW5kbGVyLmVtaXQoJ3JlY2FsbCcpO1xuICAgIHRoaXMucmVjYWxsKHRhcmdldCk7XG4gICAgdGFyZ2V0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgdGFyZ2V0LnN0eWxlLndpZHRoID0gJyc7XG4gICAgdGFyZ2V0LnN0eWxlLmhlaWdodCA9ICcnO1xuICAgIHRoaXMuX3NpemUgPSBudWxsO1xuICAgIF9jbGVhbnVwU3R5bGVzLmNhbGwodGhpcywgdGFyZ2V0KTtcbiAgICB2YXIgY2xhc3NMaXN0ID0gdGhpcy5nZXRDbGFzc0xpc3QoKTtcbiAgICBfY2xlYW51cENsYXNzZXMuY2FsbCh0aGlzLCB0YXJnZXQpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBjbGFzc0xpc3QubGVuZ3RoOyBpKyspIHRhcmdldC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTGlzdFtpXSk7XG4gICAgaWYgKHRoaXMuZWxlbWVudENsYXNzKSB7XG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnRDbGFzcyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5lbGVtZW50Q2xhc3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0YXJnZXQuY2xhc3NMaXN0LnJlbW92ZSh0aGlzLmVsZW1lbnRDbGFzc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0YXJnZXQuY2xhc3NMaXN0LnJlbW92ZSh0aGlzLmVsZW1lbnRDbGFzcyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgX3JlbW92ZUV2ZW50TGlzdGVuZXJzLmNhbGwodGhpcywgdGFyZ2V0KTtcbiAgICB0aGlzLl9jdXJyVGFyZ2V0ID0gbnVsbDtcbiAgICBhbGxvY2F0b3IuZGVhbGxvY2F0ZSh0YXJnZXQpO1xuICAgIF9zZXRJbnZpc2libGUodGFyZ2V0KTtcbn07XG5cbi8qKlxuICogUGxhY2UgdGhlIGRvY3VtZW50IGVsZW1lbnQgdGhhdCB0aGlzIGNvbXBvbmVudCBtYW5hZ2VzIGludG8gdGhlIGRvY3VtZW50LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbWV0aG9kIGRlcGxveVxuICogQHBhcmFtIHtOb2RlfSB0YXJnZXQgZG9jdW1lbnQgcGFyZW50IG9mIHRoaXMgY29udGFpbmVyXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLmRlcGxveSA9IGZ1bmN0aW9uIGRlcGxveSh0YXJnZXQpIHtcbiAgICB2YXIgY29udGVudCA9IHRoaXMuZ2V0Q29udGVudCgpO1xuICAgIGlmIChjb250ZW50IGluc3RhbmNlb2YgTm9kZSkge1xuICAgICAgICB3aGlsZSAodGFyZ2V0Lmhhc0NoaWxkTm9kZXMoKSkgdGFyZ2V0LnJlbW92ZUNoaWxkKHRhcmdldC5maXJzdENoaWxkKTtcbiAgICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKGNvbnRlbnQpO1xuICAgIH1cbiAgICBlbHNlIHRhcmdldC5pbm5lckhUTUwgPSBjb250ZW50O1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYW55IGNvbnRhaW5lZCBkb2N1bWVudCBjb250ZW50IGFzc29jaWF0ZWQgd2l0aCB0aGlzIHN1cmZhY2VcbiAqICAgZnJvbSB0aGUgYWN0dWFsIGRvY3VtZW50LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbWV0aG9kIHJlY2FsbFxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5yZWNhbGwgPSBmdW5jdGlvbiByZWNhbGwodGFyZ2V0KSB7XG4gICAgdmFyIGRmID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIHdoaWxlICh0YXJnZXQuaGFzQ2hpbGROb2RlcygpKSBkZi5hcHBlbmRDaGlsZCh0YXJnZXQuZmlyc3RDaGlsZCk7XG4gICAgdGhpcy5zZXRDb250ZW50KGRmKTtcbn07XG5cbi8qKlxuICogIEdldCB0aGUgeCBhbmQgeSBkaW1lbnNpb25zIG9mIHRoZSBzdXJmYWNlLlxuICpcbiAqIEBtZXRob2QgZ2V0U2l6ZVxuICogQHBhcmFtIHtib29sZWFufSBhY3R1YWwgcmV0dXJuIGNvbXB1dGVkIHNpemUgcmF0aGVyIHRoYW4gcHJvdmlkZWRcbiAqIEByZXR1cm4ge0FycmF5Lk51bWJlcn0gW3gseV0gc2l6ZSBvZiBzdXJmYWNlXG4gKi9cblN1cmZhY2UucHJvdG90eXBlLmdldFNpemUgPSBmdW5jdGlvbiBnZXRTaXplKGFjdHVhbCkge1xuICAgIHJldHVybiBhY3R1YWwgPyB0aGlzLl9zaXplIDogKHRoaXMuc2l6ZSB8fCB0aGlzLl9zaXplKTtcbn07XG5cbi8qKlxuICogU2V0IHggYW5kIHkgZGltZW5zaW9ucyBvZiB0aGUgc3VyZmFjZS5cbiAqXG4gKiBAbWV0aG9kIHNldFNpemVcbiAqIEBwYXJhbSB7QXJyYXkuTnVtYmVyfSBzaXplIGFzIFt3aWR0aCwgaGVpZ2h0XVxuICovXG5TdXJmYWNlLnByb3RvdHlwZS5zZXRTaXplID0gZnVuY3Rpb24gc2V0U2l6ZShzaXplKSB7XG4gICAgdGhpcy5zaXplID0gc2l6ZSA/IFtzaXplWzBdLCBzaXplWzFdXSA6IG51bGw7XG4gICAgdGhpcy5fc2l6ZURpcnR5ID0gdHJ1ZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3VyZmFjZTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL1N1cmZhY2UuanNcIixcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL2NvcmVcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyOiBtYXJrQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cblxuXG5cbi8qKlxuICogIEEgaGlnaC1wZXJmb3JtYW5jZSBzdGF0aWMgbWF0cml4IG1hdGggbGlicmFyeSB1c2VkIHRvIGNhbGN1bGF0ZVxuICogICAgYWZmaW5lIHRyYW5zZm9ybXMgb24gc3VyZmFjZXMgYW5kIG90aGVyIHJlbmRlcmFibGVzLlxuICogICAgRmFtby51cyB1c2VzIDR4NCBtYXRyaWNlcyBjb3JyZXNwb25kaW5nIGRpcmVjdGx5IHRvXG4gKiAgICBXZWJLaXQgbWF0cmljZXMgKGNvbHVtbi1tYWpvciBvcmRlcikuXG4gKlxuICogICAgVGhlIGludGVybmFsIFwidHlwZVwiIG9mIGEgTWF0cml4IGlzIGEgMTYtbG9uZyBmbG9hdCBhcnJheSBpblxuICogICAgcm93LW1ham9yIG9yZGVyLCB3aXRoOlxuICogICAgZWxlbWVudHMgWzBdLFsxXSxbMl0sWzRdLFs1XSxbNl0sWzhdLFs5XSxbMTBdIGZvcm1pbmcgdGhlIDN4M1xuICogICAgICAgICAgdHJhbnNmb3JtYXRpb24gbWF0cml4O1xuICogICAgZWxlbWVudHMgWzEyXSwgWzEzXSwgWzE0XSBjb3JyZXNwb25kaW5nIHRvIHRoZSB0X3gsIHRfeSwgdF96XG4gKiAgICAgICAgICAgdHJhbnNsYXRpb247XG4gKiAgICBlbGVtZW50cyBbM10sIFs3XSwgWzExXSBzZXQgdG8gMDtcbiAqICAgIGVsZW1lbnQgWzE1XSBzZXQgdG8gMS5cbiAqICAgIEFsbCBtZXRob2RzIGFyZSBzdGF0aWMuXG4gKlxuICogQHN0YXRpY1xuICpcbiAqIEBjbGFzcyBUcmFuc2Zvcm1cbiAqL1xudmFyIFRyYW5zZm9ybSA9IHt9O1xuXG4vLyBXQVJOSU5HOiB0aGVzZSBtYXRyaWNlcyBjb3JyZXNwb25kIHRvIFdlYktpdCBtYXRyaWNlcywgd2hpY2ggYXJlXG4vLyAgICB0cmFuc3Bvc2VkIGZyb20gdGhlaXIgbWF0aCBjb3VudGVycGFydHNcblRyYW5zZm9ybS5wcmVjaXNpb24gPSAxZS02O1xuVHJhbnNmb3JtLmlkZW50aXR5ID0gWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdO1xuXG4vKipcbiAqIE11bHRpcGx5IHR3byBvciBtb3JlIFRyYW5zZm9ybSBtYXRyaXggdHlwZXMgdG8gcmV0dXJuIGEgVHJhbnNmb3JtIG1hdHJpeC5cbiAqXG4gKiBAbWV0aG9kIG11bHRpcGx5NHg0XG4gKiBAc3RhdGljXG4gKiBAcGFyYW0ge1RyYW5zZm9ybX0gYSBsZWZ0IFRyYW5zZm9ybVxuICogQHBhcmFtIHtUcmFuc2Zvcm19IGIgcmlnaHQgVHJhbnNmb3JtXG4gKiBAcmV0dXJuIHtUcmFuc2Zvcm19XG4gKi9cblRyYW5zZm9ybS5tdWx0aXBseTR4NCA9IGZ1bmN0aW9uIG11bHRpcGx5NHg0KGEsIGIpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICBhWzBdICogYlswXSArIGFbNF0gKiBiWzFdICsgYVs4XSAqIGJbMl0gKyBhWzEyXSAqIGJbM10sXG4gICAgICAgIGFbMV0gKiBiWzBdICsgYVs1XSAqIGJbMV0gKyBhWzldICogYlsyXSArIGFbMTNdICogYlszXSxcbiAgICAgICAgYVsyXSAqIGJbMF0gKyBhWzZdICogYlsxXSArIGFbMTBdICogYlsyXSArIGFbMTRdICogYlszXSxcbiAgICAgICAgYVszXSAqIGJbMF0gKyBhWzddICogYlsxXSArIGFbMTFdICogYlsyXSArIGFbMTVdICogYlszXSxcbiAgICAgICAgYVswXSAqIGJbNF0gKyBhWzRdICogYls1XSArIGFbOF0gKiBiWzZdICsgYVsxMl0gKiBiWzddLFxuICAgICAgICBhWzFdICogYls0XSArIGFbNV0gKiBiWzVdICsgYVs5XSAqIGJbNl0gKyBhWzEzXSAqIGJbN10sXG4gICAgICAgIGFbMl0gKiBiWzRdICsgYVs2XSAqIGJbNV0gKyBhWzEwXSAqIGJbNl0gKyBhWzE0XSAqIGJbN10sXG4gICAgICAgIGFbM10gKiBiWzRdICsgYVs3XSAqIGJbNV0gKyBhWzExXSAqIGJbNl0gKyBhWzE1XSAqIGJbN10sXG4gICAgICAgIGFbMF0gKiBiWzhdICsgYVs0XSAqIGJbOV0gKyBhWzhdICogYlsxMF0gKyBhWzEyXSAqIGJbMTFdLFxuICAgICAgICBhWzFdICogYls4XSArIGFbNV0gKiBiWzldICsgYVs5XSAqIGJbMTBdICsgYVsxM10gKiBiWzExXSxcbiAgICAgICAgYVsyXSAqIGJbOF0gKyBhWzZdICogYls5XSArIGFbMTBdICogYlsxMF0gKyBhWzE0XSAqIGJbMTFdLFxuICAgICAgICBhWzNdICogYls4XSArIGFbN10gKiBiWzldICsgYVsxMV0gKiBiWzEwXSArIGFbMTVdICogYlsxMV0sXG4gICAgICAgIGFbMF0gKiBiWzEyXSArIGFbNF0gKiBiWzEzXSArIGFbOF0gKiBiWzE0XSArIGFbMTJdICogYlsxNV0sXG4gICAgICAgIGFbMV0gKiBiWzEyXSArIGFbNV0gKiBiWzEzXSArIGFbOV0gKiBiWzE0XSArIGFbMTNdICogYlsxNV0sXG4gICAgICAgIGFbMl0gKiBiWzEyXSArIGFbNl0gKiBiWzEzXSArIGFbMTBdICogYlsxNF0gKyBhWzE0XSAqIGJbMTVdLFxuICAgICAgICBhWzNdICogYlsxMl0gKyBhWzddICogYlsxM10gKyBhWzExXSAqIGJbMTRdICsgYVsxNV0gKiBiWzE1XVxuICAgIF07XG59O1xuXG4vKipcbiAqIEZhc3QtbXVsdGlwbHkgdHdvIG9yIG1vcmUgVHJhbnNmb3JtIG1hdHJpeCB0eXBlcyB0byByZXR1cm4gYVxuICogICAgTWF0cml4LCBhc3N1bWluZyBib3R0b20gcm93IG9uIGVhY2ggaXMgWzAgMCAwIDFdLlxuICpcbiAqIEBtZXRob2QgbXVsdGlwbHlcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7VHJhbnNmb3JtfSBhIGxlZnQgVHJhbnNmb3JtXG4gKiBAcGFyYW0ge1RyYW5zZm9ybX0gYiByaWdodCBUcmFuc2Zvcm1cbiAqIEByZXR1cm4ge1RyYW5zZm9ybX1cbiAqL1xuVHJhbnNmb3JtLm11bHRpcGx5ID0gZnVuY3Rpb24gbXVsdGlwbHkoYSwgYikge1xuICAgIHJldHVybiBbXG4gICAgICAgIGFbMF0gKiBiWzBdICsgYVs0XSAqIGJbMV0gKyBhWzhdICogYlsyXSxcbiAgICAgICAgYVsxXSAqIGJbMF0gKyBhWzVdICogYlsxXSArIGFbOV0gKiBiWzJdLFxuICAgICAgICBhWzJdICogYlswXSArIGFbNl0gKiBiWzFdICsgYVsxMF0gKiBiWzJdLFxuICAgICAgICAwLFxuICAgICAgICBhWzBdICogYls0XSArIGFbNF0gKiBiWzVdICsgYVs4XSAqIGJbNl0sXG4gICAgICAgIGFbMV0gKiBiWzRdICsgYVs1XSAqIGJbNV0gKyBhWzldICogYls2XSxcbiAgICAgICAgYVsyXSAqIGJbNF0gKyBhWzZdICogYls1XSArIGFbMTBdICogYls2XSxcbiAgICAgICAgMCxcbiAgICAgICAgYVswXSAqIGJbOF0gKyBhWzRdICogYls5XSArIGFbOF0gKiBiWzEwXSxcbiAgICAgICAgYVsxXSAqIGJbOF0gKyBhWzVdICogYls5XSArIGFbOV0gKiBiWzEwXSxcbiAgICAgICAgYVsyXSAqIGJbOF0gKyBhWzZdICogYls5XSArIGFbMTBdICogYlsxMF0sXG4gICAgICAgIDAsXG4gICAgICAgIGFbMF0gKiBiWzEyXSArIGFbNF0gKiBiWzEzXSArIGFbOF0gKiBiWzE0XSArIGFbMTJdLFxuICAgICAgICBhWzFdICogYlsxMl0gKyBhWzVdICogYlsxM10gKyBhWzldICogYlsxNF0gKyBhWzEzXSxcbiAgICAgICAgYVsyXSAqIGJbMTJdICsgYVs2XSAqIGJbMTNdICsgYVsxMF0gKiBiWzE0XSArIGFbMTRdLFxuICAgICAgICAxXG4gICAgXTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgVHJhbnNmb3JtIHRyYW5zbGF0ZWQgYnkgYWRkaXRpb25hbCBhbW91bnRzIGluIGVhY2hcbiAqICAgIGRpbWVuc2lvbi4gVGhpcyBpcyBlcXVpdmFsZW50IHRvIHRoZSByZXN1bHQgb2ZcbiAqXG4gKiAgICBUcmFuc2Zvcm0ubXVsdGlwbHkoTWF0cml4LnRyYW5zbGF0ZSh0WzBdLCB0WzFdLCB0WzJdKSwgbSkuXG4gKlxuICogQG1ldGhvZCB0aGVuTW92ZVxuICogQHN0YXRpY1xuICogQHBhcmFtIHtUcmFuc2Zvcm19IG0gYSBUcmFuc2Zvcm1cbiAqIEBwYXJhbSB7QXJyYXkuTnVtYmVyfSB0IGZsb2F0cyBkZWx0YSB2ZWN0b3Igb2YgbGVuZ3RoIDIgb3IgM1xuICogQHJldHVybiB7VHJhbnNmb3JtfVxuICovXG5UcmFuc2Zvcm0udGhlbk1vdmUgPSBmdW5jdGlvbiB0aGVuTW92ZShtLCB0KSB7XG4gICAgaWYgKCF0WzJdKSB0WzJdID0gMDtcbiAgICByZXR1cm4gW21bMF0sIG1bMV0sIG1bMl0sIDAsIG1bNF0sIG1bNV0sIG1bNl0sIDAsIG1bOF0sIG1bOV0sIG1bMTBdLCAwLCBtWzEyXSArIHRbMF0sIG1bMTNdICsgdFsxXSwgbVsxNF0gKyB0WzJdLCAxXTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgVHJhbnNmb3JtIGF0cml4IHdoaWNoIHJlcHJlc2VudHMgdGhlIHJlc3VsdCBvZiBhIHRyYW5zZm9ybSBtYXRyaXhcbiAqICAgIGFwcGxpZWQgYWZ0ZXIgYSBtb3ZlLiBUaGlzIGlzIGZhc3RlciB0aGFuIHRoZSBlcXVpdmFsZW50IG11bHRpcGx5LlxuICogICAgVGhpcyBpcyBlcXVpdmFsZW50IHRvIHRoZSByZXN1bHQgb2Y6XG4gKlxuICogICAgVHJhbnNmb3JtLm11bHRpcGx5KG0sIFRyYW5zZm9ybS50cmFuc2xhdGUodFswXSwgdFsxXSwgdFsyXSkpLlxuICpcbiAqIEBtZXRob2QgbW92ZVRoZW5cbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7QXJyYXkuTnVtYmVyfSB2IHZlY3RvciByZXByZXNlbnRpbmcgaW5pdGlhbCBtb3ZlbWVudFxuICogQHBhcmFtIHtUcmFuc2Zvcm19IG0gbWF0cml4IHRvIGFwcGx5IGFmdGVyd2FyZHNcbiAqIEByZXR1cm4ge1RyYW5zZm9ybX0gdGhlIHJlc3VsdGluZyBtYXRyaXhcbiAqL1xuVHJhbnNmb3JtLm1vdmVUaGVuID0gZnVuY3Rpb24gbW92ZVRoZW4odiwgbSkge1xuICAgIGlmICghdlsyXSkgdlsyXSA9IDA7XG4gICAgdmFyIHQwID0gdlswXSAqIG1bMF0gKyB2WzFdICogbVs0XSArIHZbMl0gKiBtWzhdO1xuICAgIHZhciB0MSA9IHZbMF0gKiBtWzFdICsgdlsxXSAqIG1bNV0gKyB2WzJdICogbVs5XTtcbiAgICB2YXIgdDIgPSB2WzBdICogbVsyXSArIHZbMV0gKiBtWzZdICsgdlsyXSAqIG1bMTBdO1xuICAgIHJldHVybiBUcmFuc2Zvcm0udGhlbk1vdmUobSwgW3QwLCB0MSwgdDJdKTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgVHJhbnNmb3JtIHdoaWNoIHJlcHJlc2VudHMgYSB0cmFuc2xhdGlvbiBieSBzcGVjaWZpZWRcbiAqICAgIGFtb3VudHMgaW4gZWFjaCBkaW1lbnNpb24uXG4gKlxuICogQG1ldGhvZCB0cmFuc2xhdGVcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IHggdHJhbnNsYXRpb25cbiAqIEBwYXJhbSB7TnVtYmVyfSB5IHkgdHJhbnNsYXRpb25cbiAqIEBwYXJhbSB7TnVtYmVyfSB6IHogdHJhbnNsYXRpb25cbiAqIEByZXR1cm4ge1RyYW5zZm9ybX1cbiAqL1xuVHJhbnNmb3JtLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIHRyYW5zbGF0ZSh4LCB5LCB6KSB7XG4gICAgaWYgKHogPT09IHVuZGVmaW5lZCkgeiA9IDA7XG4gICAgcmV0dXJuIFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCB4LCB5LCB6LCAxXTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgVHJhbnNmb3JtIHNjYWxlZCBieSBhIHZlY3RvciBpbiBlYWNoXG4gKiAgICBkaW1lbnNpb24uIFRoaXMgaXMgYSBtb3JlIHBlcmZvcm1hbnQgZXF1aXZhbGVudCB0byB0aGUgcmVzdWx0IG9mXG4gKlxuICogICAgVHJhbnNmb3JtLm11bHRpcGx5KFRyYW5zZm9ybS5zY2FsZShzWzBdLCBzWzFdLCBzWzJdKSwgbSkuXG4gKlxuICogQG1ldGhvZCB0aGVuU2NhbGVcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7VHJhbnNmb3JtfSBtIGEgbWF0cml4XG4gKiBAcGFyYW0ge0FycmF5Lk51bWJlcn0gcyBkZWx0YSB2ZWN0b3IgKGFycmF5IG9mIGZsb2F0cyAmJlxuICogICAgYXJyYXkubGVuZ3RoID09IDMpXG4gKiBAcmV0dXJuIHtUcmFuc2Zvcm19XG4gKi9cblRyYW5zZm9ybS50aGVuU2NhbGUgPSBmdW5jdGlvbiB0aGVuU2NhbGUobSwgcykge1xuICAgIHJldHVybiBbXG4gICAgICAgIHNbMF0gKiBtWzBdLCBzWzFdICogbVsxXSwgc1syXSAqIG1bMl0sIDAsXG4gICAgICAgIHNbMF0gKiBtWzRdLCBzWzFdICogbVs1XSwgc1syXSAqIG1bNl0sIDAsXG4gICAgICAgIHNbMF0gKiBtWzhdLCBzWzFdICogbVs5XSwgc1syXSAqIG1bMTBdLCAwLFxuICAgICAgICBzWzBdICogbVsxMl0sIHNbMV0gKiBtWzEzXSwgc1syXSAqIG1bMTRdLCAxXG4gICAgXTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgVHJhbnNmb3JtIHdoaWNoIHJlcHJlc2VudHMgYSBzY2FsZSBieSBzcGVjaWZpZWQgYW1vdW50c1xuICogICAgaW4gZWFjaCBkaW1lbnNpb24uXG4gKlxuICogQG1ldGhvZCBzY2FsZVxuICogQHN0YXRpY1xuICogQHBhcmFtIHtOdW1iZXJ9IHggeCBzY2FsZSBmYWN0b3JcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IHkgc2NhbGUgZmFjdG9yXG4gKiBAcGFyYW0ge051bWJlcn0geiB6IHNjYWxlIGZhY3RvclxuICogQHJldHVybiB7VHJhbnNmb3JtfVxuICovXG5UcmFuc2Zvcm0uc2NhbGUgPSBmdW5jdGlvbiBzY2FsZSh4LCB5LCB6KSB7XG4gICAgaWYgKHogPT09IHVuZGVmaW5lZCkgeiA9IDE7XG4gICAgcmV0dXJuIFt4LCAwLCAwLCAwLCAwLCB5LCAwLCAwLCAwLCAwLCB6LCAwLCAwLCAwLCAwLCAxXTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgVHJhbnNmb3JtIHdoaWNoIHJlcHJlc2VudHMgYSBjbG9ja3dpc2VcbiAqICAgIHJvdGF0aW9uIGFyb3VuZCB0aGUgeCBheGlzLlxuICpcbiAqIEBtZXRob2Qgcm90YXRlWFxuICogQHN0YXRpY1xuICogQHBhcmFtIHtOdW1iZXJ9IHRoZXRhIHJhZGlhbnNcbiAqIEByZXR1cm4ge1RyYW5zZm9ybX1cbiAqL1xuVHJhbnNmb3JtLnJvdGF0ZVggPSBmdW5jdGlvbiByb3RhdGVYKHRoZXRhKSB7XG4gICAgdmFyIGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xuICAgIHZhciBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcbiAgICByZXR1cm4gWzEsIDAsIDAsIDAsIDAsIGNvc1RoZXRhLCBzaW5UaGV0YSwgMCwgMCwgLXNpblRoZXRhLCBjb3NUaGV0YSwgMCwgMCwgMCwgMCwgMV07XG59O1xuXG4vKipcbiAqIFJldHVybiBhIFRyYW5zZm9ybSB3aGljaCByZXByZXNlbnRzIGEgY2xvY2t3aXNlXG4gKiAgICByb3RhdGlvbiBhcm91bmQgdGhlIHkgYXhpcy5cbiAqXG4gKiBAbWV0aG9kIHJvdGF0ZVlcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aGV0YSByYWRpYW5zXG4gKiBAcmV0dXJuIHtUcmFuc2Zvcm19XG4gKi9cblRyYW5zZm9ybS5yb3RhdGVZID0gZnVuY3Rpb24gcm90YXRlWSh0aGV0YSkge1xuICAgIHZhciBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKTtcbiAgICB2YXIgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSk7XG4gICAgcmV0dXJuIFtjb3NUaGV0YSwgMCwgLXNpblRoZXRhLCAwLCAwLCAxLCAwLCAwLCBzaW5UaGV0YSwgMCwgY29zVGhldGEsIDAsIDAsIDAsIDAsIDFdO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYSBUcmFuc2Zvcm0gd2hpY2ggcmVwcmVzZW50cyBhIGNsb2Nrd2lzZVxuICogICAgcm90YXRpb24gYXJvdW5kIHRoZSB6IGF4aXMuXG4gKlxuICogQG1ldGhvZCByb3RhdGVaXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0ge051bWJlcn0gdGhldGEgcmFkaWFuc1xuICogQHJldHVybiB7VHJhbnNmb3JtfVxuICovXG5UcmFuc2Zvcm0ucm90YXRlWiA9IGZ1bmN0aW9uIHJvdGF0ZVoodGhldGEpIHtcbiAgICB2YXIgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSk7XG4gICAgdmFyIHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpO1xuICAgIHJldHVybiBbY29zVGhldGEsIHNpblRoZXRhLCAwLCAwLCAtc2luVGhldGEsIGNvc1RoZXRhLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgVHJhbnNmb3JtIHdoaWNoIHJlcHJlc2VudHMgY29tcG9zZWQgY2xvY2t3aXNlXG4gKiAgICByb3RhdGlvbnMgYWxvbmcgZWFjaCBvZiB0aGUgYXhlcy4gRXF1aXZhbGVudCB0byB0aGUgcmVzdWx0IG9mXG4gKiAgICBNYXRyaXgubXVsdGlwbHkocm90YXRlWChwaGkpLCByb3RhdGVZKHRoZXRhKSwgcm90YXRlWihwc2kpKS5cbiAqXG4gKiBAbWV0aG9kIHJvdGF0ZVxuICogQHN0YXRpY1xuICogQHBhcmFtIHtOdW1iZXJ9IHBoaSByYWRpYW5zIHRvIHJvdGF0ZSBhYm91dCB0aGUgcG9zaXRpdmUgeCBheGlzXG4gKiBAcGFyYW0ge051bWJlcn0gdGhldGEgcmFkaWFucyB0byByb3RhdGUgYWJvdXQgdGhlIHBvc2l0aXZlIHkgYXhpc1xuICogQHBhcmFtIHtOdW1iZXJ9IHBzaSByYWRpYW5zIHRvIHJvdGF0ZSBhYm91dCB0aGUgcG9zaXRpdmUgeiBheGlzXG4gKiBAcmV0dXJuIHtUcmFuc2Zvcm19XG4gKi9cblRyYW5zZm9ybS5yb3RhdGUgPSBmdW5jdGlvbiByb3RhdGUocGhpLCB0aGV0YSwgcHNpKSB7XG4gICAgdmFyIGNvc1BoaSA9IE1hdGguY29zKHBoaSk7XG4gICAgdmFyIHNpblBoaSA9IE1hdGguc2luKHBoaSk7XG4gICAgdmFyIGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xuICAgIHZhciBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcbiAgICB2YXIgY29zUHNpID0gTWF0aC5jb3MocHNpKTtcbiAgICB2YXIgc2luUHNpID0gTWF0aC5zaW4ocHNpKTtcbiAgICB2YXIgcmVzdWx0ID0gW1xuICAgICAgICBjb3NUaGV0YSAqIGNvc1BzaSxcbiAgICAgICAgY29zUGhpICogc2luUHNpICsgc2luUGhpICogc2luVGhldGEgKiBjb3NQc2ksXG4gICAgICAgIHNpblBoaSAqIHNpblBzaSAtIGNvc1BoaSAqIHNpblRoZXRhICogY29zUHNpLFxuICAgICAgICAwLFxuICAgICAgICAtY29zVGhldGEgKiBzaW5Qc2ksXG4gICAgICAgIGNvc1BoaSAqIGNvc1BzaSAtIHNpblBoaSAqIHNpblRoZXRhICogc2luUHNpLFxuICAgICAgICBzaW5QaGkgKiBjb3NQc2kgKyBjb3NQaGkgKiBzaW5UaGV0YSAqIHNpblBzaSxcbiAgICAgICAgMCxcbiAgICAgICAgc2luVGhldGEsXG4gICAgICAgIC1zaW5QaGkgKiBjb3NUaGV0YSxcbiAgICAgICAgY29zUGhpICogY29zVGhldGEsXG4gICAgICAgIDAsXG4gICAgICAgIDAsIDAsIDAsIDFcbiAgICBdO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIFJldHVybiBhIFRyYW5zZm9ybSB3aGljaCByZXByZXNlbnRzIGFuIGF4aXMtYW5nbGUgcm90YXRpb25cbiAqXG4gKiBAbWV0aG9kIHJvdGF0ZUF4aXNcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7QXJyYXkuTnVtYmVyfSB2IHVuaXQgdmVjdG9yIHJlcHJlc2VudGluZyB0aGUgYXhpcyB0byByb3RhdGUgYWJvdXRcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aGV0YSByYWRpYW5zIHRvIHJvdGF0ZSBjbG9ja3dpc2UgYWJvdXQgdGhlIGF4aXNcbiAqIEByZXR1cm4ge1RyYW5zZm9ybX1cbiAqL1xuVHJhbnNmb3JtLnJvdGF0ZUF4aXMgPSBmdW5jdGlvbiByb3RhdGVBeGlzKHYsIHRoZXRhKSB7XG4gICAgdmFyIHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpO1xuICAgIHZhciBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKTtcbiAgICB2YXIgdmVyVGhldGEgPSAxIC0gY29zVGhldGE7IC8vIHZlcnNpbmUgb2YgdGhldGFcblxuICAgIHZhciB4eFYgPSB2WzBdICogdlswXSAqIHZlclRoZXRhO1xuICAgIHZhciB4eVYgPSB2WzBdICogdlsxXSAqIHZlclRoZXRhO1xuICAgIHZhciB4elYgPSB2WzBdICogdlsyXSAqIHZlclRoZXRhO1xuICAgIHZhciB5eVYgPSB2WzFdICogdlsxXSAqIHZlclRoZXRhO1xuICAgIHZhciB5elYgPSB2WzFdICogdlsyXSAqIHZlclRoZXRhO1xuICAgIHZhciB6elYgPSB2WzJdICogdlsyXSAqIHZlclRoZXRhO1xuICAgIHZhciB4cyA9IHZbMF0gKiBzaW5UaGV0YTtcbiAgICB2YXIgeXMgPSB2WzFdICogc2luVGhldGE7XG4gICAgdmFyIHpzID0gdlsyXSAqIHNpblRoZXRhO1xuXG4gICAgdmFyIHJlc3VsdCA9IFtcbiAgICAgICAgeHhWICsgY29zVGhldGEsIHh5ViArIHpzLCB4elYgLSB5cywgMCxcbiAgICAgICAgeHlWIC0genMsIHl5ViArIGNvc1RoZXRhLCB5elYgKyB4cywgMCxcbiAgICAgICAgeHpWICsgeXMsIHl6ViAtIHhzLCB6elYgKyBjb3NUaGV0YSwgMCxcbiAgICAgICAgMCwgMCwgMCwgMVxuICAgIF07XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgVHJhbnNmb3JtIHdoaWNoIHJlcHJlc2VudHMgYSB0cmFuc2Zvcm0gbWF0cml4IGFwcGxpZWQgYWJvdXRcbiAqIGEgc2VwYXJhdGUgb3JpZ2luIHBvaW50LlxuICpcbiAqIEBtZXRob2QgYWJvdXRPcmlnaW5cbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7QXJyYXkuTnVtYmVyfSB2IG9yaWdpbiBwb2ludCB0byBhcHBseSBtYXRyaXhcbiAqIEBwYXJhbSB7VHJhbnNmb3JtfSBtIG1hdHJpeCB0byBhcHBseVxuICogQHJldHVybiB7VHJhbnNmb3JtfVxuICovXG5UcmFuc2Zvcm0uYWJvdXRPcmlnaW4gPSBmdW5jdGlvbiBhYm91dE9yaWdpbih2LCBtKSB7XG4gICAgdmFyIHQwID0gdlswXSAtICh2WzBdICogbVswXSArIHZbMV0gKiBtWzRdICsgdlsyXSAqIG1bOF0pO1xuICAgIHZhciB0MSA9IHZbMV0gLSAodlswXSAqIG1bMV0gKyB2WzFdICogbVs1XSArIHZbMl0gKiBtWzldKTtcbiAgICB2YXIgdDIgPSB2WzJdIC0gKHZbMF0gKiBtWzJdICsgdlsxXSAqIG1bNl0gKyB2WzJdICogbVsxMF0pO1xuICAgIHJldHVybiBUcmFuc2Zvcm0udGhlbk1vdmUobSwgW3QwLCB0MSwgdDJdKTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgVHJhbnNmb3JtIHJlcHJlc2VudGF0aW9uIG9mIGEgc2tldyB0cmFuc2Zvcm1hdGlvblxuICpcbiAqIEBtZXRob2Qgc2tld1xuICogQHN0YXRpY1xuICogQHBhcmFtIHtOdW1iZXJ9IHBoaSBzY2FsZSBmYWN0b3Igc2tldyBpbiB0aGUgeCBheGlzXG4gKiBAcGFyYW0ge051bWJlcn0gdGhldGEgc2NhbGUgZmFjdG9yIHNrZXcgaW4gdGhlIHkgYXhpc1xuICogQHBhcmFtIHtOdW1iZXJ9IHBzaSBzY2FsZSBmYWN0b3Igc2tldyBpbiB0aGUgeiBheGlzXG4gKiBAcmV0dXJuIHtUcmFuc2Zvcm19XG4gKi9cblRyYW5zZm9ybS5za2V3ID0gZnVuY3Rpb24gc2tldyhwaGksIHRoZXRhLCBwc2kpIHtcbiAgICByZXR1cm4gWzEsIDAsIDAsIDAsIE1hdGgudGFuKHBzaSksIDEsIDAsIDAsIE1hdGgudGFuKHRoZXRhKSwgTWF0aC50YW4ocGhpKSwgMSwgMCwgMCwgMCwgMCwgMV07XG59O1xuXG4vKipcbiAqIFJldHVybiBhIFRyYW5zZm9ybSByZXByZXNlbnRhdGlvbiBvZiBhIHNrZXcgaW4gdGhlIHgtZGlyZWN0aW9uXG4gKlxuICogQG1ldGhvZCBza2V3WFxuICogQHN0YXRpY1xuICogQHBhcmFtIHtOdW1iZXJ9IGFuZ2xlIHRoZSBhbmdsZSBiZXR3ZWVuIHRoZSB0b3AgYW5kIGxlZnQgc2lkZXNcbiAqIEByZXR1cm4ge1RyYW5zZm9ybX1cbiAqL1xuVHJhbnNmb3JtLnNrZXdYID0gZnVuY3Rpb24gc2tld1goYW5nbGUpIHtcbiAgICByZXR1cm4gWzEsIDAsIDAsIDAsIE1hdGgudGFuKGFuZ2xlKSwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV07XG59O1xuXG4vKipcbiAqIFJldHVybiBhIFRyYW5zZm9ybSByZXByZXNlbnRhdGlvbiBvZiBhIHNrZXcgaW4gdGhlIHktZGlyZWN0aW9uXG4gKlxuICogQG1ldGhvZCBza2V3WVxuICogQHN0YXRpY1xuICogQHBhcmFtIHtOdW1iZXJ9IGFuZ2xlIHRoZSBhbmdsZSBiZXR3ZWVuIHRoZSB0b3AgYW5kIHJpZ2h0IHNpZGVzXG4gKiBAcmV0dXJuIHtUcmFuc2Zvcm19XG4gKi9cblRyYW5zZm9ybS5za2V3WSA9IGZ1bmN0aW9uIHNrZXdZKGFuZ2xlKSB7XG4gICAgcmV0dXJuIFsxLCBNYXRoLnRhbihhbmdsZSksIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgcGVyc3BlY3RpdmUgVHJhbnNmb3JtIG1hdHJpeFxuICpcbiAqIEBtZXRob2QgcGVyc3BlY3RpdmVcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7TnVtYmVyfSBmb2N1c1ogeiBwb3NpdGlvbiBvZiBmb2NhbCBwb2ludFxuICogQHJldHVybiB7VHJhbnNmb3JtfVxuICovXG5UcmFuc2Zvcm0ucGVyc3BlY3RpdmUgPSBmdW5jdGlvbiBwZXJzcGVjdGl2ZShmb2N1c1opIHtcbiAgICByZXR1cm4gWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIC0xIC8gZm9jdXNaLCAwLCAwLCAwLCAxXTtcbn07XG5cbi8qKlxuICogUmV0dXJuIHRyYW5zbGF0aW9uIHZlY3RvciBjb21wb25lbnQgb2YgZ2l2ZW4gVHJhbnNmb3JtXG4gKlxuICogQG1ldGhvZCBnZXRUcmFuc2xhdGVcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7VHJhbnNmb3JtfSBtIFRyYW5zZm9ybVxuICogQHJldHVybiB7QXJyYXkuTnVtYmVyfSB0aGUgdHJhbnNsYXRpb24gdmVjdG9yIFt0X3gsIHRfeSwgdF96XVxuICovXG5UcmFuc2Zvcm0uZ2V0VHJhbnNsYXRlID0gZnVuY3Rpb24gZ2V0VHJhbnNsYXRlKG0pIHtcbiAgICByZXR1cm4gW21bMTJdLCBtWzEzXSwgbVsxNF1dO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gaW52ZXJzZSBhZmZpbmUgdHJhbnNmb3JtIGZvciBnaXZlbiBUcmFuc2Zvcm0uXG4gKiAgIE5vdGU6IFRoaXMgYXNzdW1lcyBtWzNdID0gbVs3XSA9IG1bMTFdID0gMCwgYW5kIG1bMTVdID0gMS5cbiAqICAgV2lsbCBwcm92aWRlIGluY29ycmVjdCByZXN1bHRzIGlmIG5vdCBpbnZlcnRpYmxlIG9yIHByZWNvbmRpdGlvbnMgbm90IG1ldC5cbiAqXG4gKiBAbWV0aG9kIGludmVyc2VcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7VHJhbnNmb3JtfSBtIFRyYW5zZm9ybVxuICogQHJldHVybiB7VHJhbnNmb3JtfVxuICovXG5UcmFuc2Zvcm0uaW52ZXJzZSA9IGZ1bmN0aW9uIGludmVyc2UobSkge1xuICAgIC8vIG9ubHkgbmVlZCB0byBjb25zaWRlciAzeDMgc2VjdGlvbiBmb3IgYWZmaW5lXG4gICAgdmFyIGMwID0gbVs1XSAqIG1bMTBdIC0gbVs2XSAqIG1bOV07XG4gICAgdmFyIGMxID0gbVs0XSAqIG1bMTBdIC0gbVs2XSAqIG1bOF07XG4gICAgdmFyIGMyID0gbVs0XSAqIG1bOV0gLSBtWzVdICogbVs4XTtcbiAgICB2YXIgYzQgPSBtWzFdICogbVsxMF0gLSBtWzJdICogbVs5XTtcbiAgICB2YXIgYzUgPSBtWzBdICogbVsxMF0gLSBtWzJdICogbVs4XTtcbiAgICB2YXIgYzYgPSBtWzBdICogbVs5XSAtIG1bMV0gKiBtWzhdO1xuICAgIHZhciBjOCA9IG1bMV0gKiBtWzZdIC0gbVsyXSAqIG1bNV07XG4gICAgdmFyIGM5ID0gbVswXSAqIG1bNl0gLSBtWzJdICogbVs0XTtcbiAgICB2YXIgYzEwID0gbVswXSAqIG1bNV0gLSBtWzFdICogbVs0XTtcbiAgICB2YXIgZGV0TSA9IG1bMF0gKiBjMCAtIG1bMV0gKiBjMSArIG1bMl0gKiBjMjtcbiAgICB2YXIgaW52RCA9IDEgLyBkZXRNO1xuICAgIHZhciByZXN1bHQgPSBbXG4gICAgICAgIGludkQgKiBjMCwgLWludkQgKiBjNCwgaW52RCAqIGM4LCAwLFxuICAgICAgICAtaW52RCAqIGMxLCBpbnZEICogYzUsIC1pbnZEICogYzksIDAsXG4gICAgICAgIGludkQgKiBjMiwgLWludkQgKiBjNiwgaW52RCAqIGMxMCwgMCxcbiAgICAgICAgMCwgMCwgMCwgMVxuICAgIF07XG4gICAgcmVzdWx0WzEyXSA9IC1tWzEyXSAqIHJlc3VsdFswXSAtIG1bMTNdICogcmVzdWx0WzRdIC0gbVsxNF0gKiByZXN1bHRbOF07XG4gICAgcmVzdWx0WzEzXSA9IC1tWzEyXSAqIHJlc3VsdFsxXSAtIG1bMTNdICogcmVzdWx0WzVdIC0gbVsxNF0gKiByZXN1bHRbOV07XG4gICAgcmVzdWx0WzE0XSA9IC1tWzEyXSAqIHJlc3VsdFsyXSAtIG1bMTNdICogcmVzdWx0WzZdIC0gbVsxNF0gKiByZXN1bHRbMTBdO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHRyYW5zcG9zZSBvZiBhIDR4NCBtYXRyaXhcbiAqXG4gKiBAbWV0aG9kIHRyYW5zcG9zZVxuICogQHN0YXRpY1xuICogQHBhcmFtIHtUcmFuc2Zvcm19IG0gbWF0cml4XG4gKiBAcmV0dXJuIHtUcmFuc2Zvcm19IHRoZSByZXN1bHRpbmcgdHJhbnNwb3NlZCBtYXRyaXhcbiAqL1xuVHJhbnNmb3JtLnRyYW5zcG9zZSA9IGZ1bmN0aW9uIHRyYW5zcG9zZShtKSB7XG4gICAgcmV0dXJuIFttWzBdLCBtWzRdLCBtWzhdLCBtWzEyXSwgbVsxXSwgbVs1XSwgbVs5XSwgbVsxM10sIG1bMl0sIG1bNl0sIG1bMTBdLCBtWzE0XSwgbVszXSwgbVs3XSwgbVsxMV0sIG1bMTVdXTtcbn07XG5cbmZ1bmN0aW9uIF9ub3JtU3F1YXJlZCh2KSB7XG4gICAgcmV0dXJuICh2Lmxlbmd0aCA9PT0gMikgPyB2WzBdICogdlswXSArIHZbMV0gKiB2WzFdIDogdlswXSAqIHZbMF0gKyB2WzFdICogdlsxXSArIHZbMl0gKiB2WzJdO1xufVxuZnVuY3Rpb24gX25vcm0odikge1xuICAgIHJldHVybiBNYXRoLnNxcnQoX25vcm1TcXVhcmVkKHYpKTtcbn1cbmZ1bmN0aW9uIF9zaWduKG4pIHtcbiAgICByZXR1cm4gKG4gPCAwKSA/IC0xIDogMTtcbn1cblxuLyoqXG4gKiBEZWNvbXBvc2UgVHJhbnNmb3JtIGludG8gc2VwYXJhdGUgLnRyYW5zbGF0ZSwgLnJvdGF0ZSwgLnNjYWxlLFxuICogICAgYW5kIC5za2V3IGNvbXBvbmVudHMuXG4gKlxuICogQG1ldGhvZCBpbnRlcnByZXRcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7VHJhbnNmb3JtfSBNIHRyYW5zZm9ybSBtYXRyaXhcbiAqIEByZXR1cm4ge09iamVjdH0gbWF0cml4IHNwZWMgb2JqZWN0IHdpdGggY29tcG9uZW50IG1hdHJpY2VzIC50cmFuc2xhdGUsXG4gKiAgICAucm90YXRlLCAuc2NhbGUsIC5za2V3XG4gKi9cblRyYW5zZm9ybS5pbnRlcnByZXQgPSBmdW5jdGlvbiBpbnRlcnByZXQoTSkge1xuXG4gICAgLy8gUVIgZGVjb21wb3NpdGlvbiB2aWEgSG91c2Vob2xkZXIgcmVmbGVjdGlvbnNcbiAgICAvL0ZJUlNUIElURVJBVElPTlxuXG4gICAgLy9kZWZhdWx0IFExIHRvIHRoZSBpZGVudGl0eSBtYXRyaXg7XG4gICAgdmFyIHggPSBbTVswXSwgTVsxXSwgTVsyXV07ICAgICAgICAgICAgICAgIC8vIGZpcnN0IGNvbHVtbiB2ZWN0b3JcbiAgICB2YXIgc2duID0gX3NpZ24oeFswXSk7ICAgICAgICAgICAgICAgICAgICAgLy8gc2lnbiBvZiBmaXJzdCBjb21wb25lbnQgb2YgeCAoZm9yIHN0YWJpbGl0eSlcbiAgICB2YXIgeE5vcm0gPSBfbm9ybSh4KTsgICAgICAgICAgICAgICAgICAgICAgLy8gbm9ybSBvZiBmaXJzdCBjb2x1bW4gdmVjdG9yXG4gICAgdmFyIHYgPSBbeFswXSArIHNnbiAqIHhOb3JtLCB4WzFdLCB4WzJdXTsgIC8vIHYgPSB4ICsgc2lnbih4WzBdKXx4fGUxXG4gICAgdmFyIG11bHQgPSAyIC8gX25vcm1TcXVhcmVkKHYpOyAgICAgICAgICAgIC8vIG11bHQgPSAyL3YndlxuXG4gICAgLy9iYWlsIG91dCBpZiBvdXIgTWF0cml4IGlzIHNpbmd1bGFyXG4gICAgaWYgKG11bHQgPj0gSW5maW5pdHkpIHtcbiAgICAgICAgcmV0dXJuIHt0cmFuc2xhdGU6IFRyYW5zZm9ybS5nZXRUcmFuc2xhdGUoTSksIHJvdGF0ZTogWzAsIDAsIDBdLCBzY2FsZTogWzAsIDAsIDBdLCBza2V3OiBbMCwgMCwgMF19O1xuICAgIH1cblxuICAgIC8vZXZhbHVhdGUgUTEgPSBJIC0gMnZ2Jy92J3ZcbiAgICB2YXIgUTEgPSBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMV07XG5cbiAgICAvL2RpYWdvbmFsc1xuICAgIFExWzBdICA9IDEgLSBtdWx0ICogdlswXSAqIHZbMF07ICAgIC8vIDAsMCBlbnRyeVxuICAgIFExWzVdICA9IDEgLSBtdWx0ICogdlsxXSAqIHZbMV07ICAgIC8vIDEsMSBlbnRyeVxuICAgIFExWzEwXSA9IDEgLSBtdWx0ICogdlsyXSAqIHZbMl07ICAgIC8vIDIsMiBlbnRyeVxuXG4gICAgLy91cHBlciBkaWFnb25hbFxuICAgIFExWzFdID0gLW11bHQgKiB2WzBdICogdlsxXTsgICAgICAgIC8vIDAsMSBlbnRyeVxuICAgIFExWzJdID0gLW11bHQgKiB2WzBdICogdlsyXTsgICAgICAgIC8vIDAsMiBlbnRyeVxuICAgIFExWzZdID0gLW11bHQgKiB2WzFdICogdlsyXTsgICAgICAgIC8vIDEsMiBlbnRyeVxuXG4gICAgLy9sb3dlciBkaWFnb25hbFxuICAgIFExWzRdID0gUTFbMV07ICAgICAgICAgICAgICAgICAgICAgIC8vIDEsMCBlbnRyeVxuICAgIFExWzhdID0gUTFbMl07ICAgICAgICAgICAgICAgICAgICAgIC8vIDIsMCBlbnRyeVxuICAgIFExWzldID0gUTFbNl07ICAgICAgICAgICAgICAgICAgICAgIC8vIDIsMSBlbnRyeVxuXG4gICAgLy9yZWR1Y2UgZmlyc3QgY29sdW1uIG9mIE1cbiAgICB2YXIgTVExID0gVHJhbnNmb3JtLm11bHRpcGx5KFExLCBNKTtcblxuICAgIC8vU0VDT05EIElURVJBVElPTiBvbiAoMSwxKSBtaW5vclxuICAgIHZhciB4MiA9IFtNUTFbNV0sIE1RMVs2XV07XG4gICAgdmFyIHNnbjIgPSBfc2lnbih4MlswXSk7ICAgICAgICAgICAgICAgICAgICAvLyBzaWduIG9mIGZpcnN0IGNvbXBvbmVudCBvZiB4IChmb3Igc3RhYmlsaXR5KVxuICAgIHZhciB4Mk5vcm0gPSBfbm9ybSh4Mik7ICAgICAgICAgICAgICAgICAgICAgLy8gbm9ybSBvZiBmaXJzdCBjb2x1bW4gdmVjdG9yXG4gICAgdmFyIHYyID0gW3gyWzBdICsgc2duMiAqIHgyTm9ybSwgeDJbMV1dOyAgICAvLyB2ID0geCArIHNpZ24oeFswXSl8eHxlMVxuICAgIHZhciBtdWx0MiA9IDIgLyBfbm9ybVNxdWFyZWQodjIpOyAgICAgICAgICAgLy8gbXVsdCA9IDIvdid2XG5cbiAgICAvL2V2YWx1YXRlIFEyID0gSSAtIDJ2dicvdid2XG4gICAgdmFyIFEyID0gWzEsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDFdO1xuXG4gICAgLy9kaWFnb25hbFxuICAgIFEyWzVdICA9IDEgLSBtdWx0MiAqIHYyWzBdICogdjJbMF07IC8vIDEsMSBlbnRyeVxuICAgIFEyWzEwXSA9IDEgLSBtdWx0MiAqIHYyWzFdICogdjJbMV07IC8vIDIsMiBlbnRyeVxuXG4gICAgLy9vZmYgZGlhZ29uYWxzXG4gICAgUTJbNl0gPSAtbXVsdDIgKiB2MlswXSAqIHYyWzFdOyAgICAgLy8gMiwxIGVudHJ5XG4gICAgUTJbOV0gPSBRMls2XTsgICAgICAgICAgICAgICAgICAgICAgLy8gMSwyIGVudHJ5XG5cbiAgICAvL2NhbGMgUVIgZGVjb21wb3NpdGlvbi4gUSA9IFExKlEyLCBSID0gUScqTVxuICAgIHZhciBRID0gVHJhbnNmb3JtLm11bHRpcGx5KFEyLCBRMSk7ICAgICAgLy9ub3RlOiByZWFsbHkgUSB0cmFuc3Bvc2VcbiAgICB2YXIgUiA9IFRyYW5zZm9ybS5tdWx0aXBseShRLCBNKTtcblxuICAgIC8vcmVtb3ZlIG5lZ2F0aXZlIHNjYWxpbmdcbiAgICB2YXIgcmVtb3ZlciA9IFRyYW5zZm9ybS5zY2FsZShSWzBdIDwgMCA/IC0xIDogMSwgUls1XSA8IDAgPyAtMSA6IDEsIFJbMTBdIDwgMCA/IC0xIDogMSk7XG4gICAgUiA9IFRyYW5zZm9ybS5tdWx0aXBseShSLCByZW1vdmVyKTtcbiAgICBRID0gVHJhbnNmb3JtLm11bHRpcGx5KHJlbW92ZXIsIFEpO1xuXG4gICAgLy9kZWNvbXBvc2UgaW50byByb3RhdGUvc2NhbGUvc2tldyBtYXRyaWNlc1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICByZXN1bHQudHJhbnNsYXRlID0gVHJhbnNmb3JtLmdldFRyYW5zbGF0ZShNKTtcbiAgICByZXN1bHQucm90YXRlID0gW01hdGguYXRhbjIoLVFbNl0sIFFbMTBdKSwgTWF0aC5hc2luKFFbMl0pLCBNYXRoLmF0YW4yKC1RWzFdLCBRWzBdKV07XG4gICAgaWYgKCFyZXN1bHQucm90YXRlWzBdKSB7XG4gICAgICAgIHJlc3VsdC5yb3RhdGVbMF0gPSAwO1xuICAgICAgICByZXN1bHQucm90YXRlWzJdID0gTWF0aC5hdGFuMihRWzRdLCBRWzVdKTtcbiAgICB9XG4gICAgcmVzdWx0LnNjYWxlID0gW1JbMF0sIFJbNV0sIFJbMTBdXTtcbiAgICByZXN1bHQuc2tldyA9IFtNYXRoLmF0YW4yKFJbOV0sIHJlc3VsdC5zY2FsZVsyXSksIE1hdGguYXRhbjIoUls4XSwgcmVzdWx0LnNjYWxlWzJdKSwgTWF0aC5hdGFuMihSWzRdLCByZXN1bHQuc2NhbGVbMF0pXTtcblxuICAgIC8vZG91YmxlIHJvdGF0aW9uIHdvcmthcm91bmRcbiAgICBpZiAoTWF0aC5hYnMocmVzdWx0LnJvdGF0ZVswXSkgKyBNYXRoLmFicyhyZXN1bHQucm90YXRlWzJdKSA+IDEuNSAqIE1hdGguUEkpIHtcbiAgICAgICAgcmVzdWx0LnJvdGF0ZVsxXSA9IE1hdGguUEkgLSByZXN1bHQucm90YXRlWzFdO1xuICAgICAgICBpZiAocmVzdWx0LnJvdGF0ZVsxXSA+IE1hdGguUEkpIHJlc3VsdC5yb3RhdGVbMV0gLT0gMiAqIE1hdGguUEk7XG4gICAgICAgIGlmIChyZXN1bHQucm90YXRlWzFdIDwgLU1hdGguUEkpIHJlc3VsdC5yb3RhdGVbMV0gKz0gMiAqIE1hdGguUEk7XG4gICAgICAgIGlmIChyZXN1bHQucm90YXRlWzBdIDwgMCkgcmVzdWx0LnJvdGF0ZVswXSArPSBNYXRoLlBJO1xuICAgICAgICBlbHNlIHJlc3VsdC5yb3RhdGVbMF0gLT0gTWF0aC5QSTtcbiAgICAgICAgaWYgKHJlc3VsdC5yb3RhdGVbMl0gPCAwKSByZXN1bHQucm90YXRlWzJdICs9IE1hdGguUEk7XG4gICAgICAgIGVsc2UgcmVzdWx0LnJvdGF0ZVsyXSAtPSBNYXRoLlBJO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIFdlaWdodGVkIGF2ZXJhZ2UgYmV0d2VlbiB0d28gbWF0cmljZXMgYnkgYXZlcmFnaW5nIHRoZWlyXG4gKiAgICAgdHJhbnNsYXRpb24sIHJvdGF0aW9uLCBzY2FsZSwgc2tldyBjb21wb25lbnRzLlxuICogICAgIGYoTTEsTTIsdCkgPSAoMSAtIHQpICogTTEgKyB0ICogTTJcbiAqXG4gKiBAbWV0aG9kIGF2ZXJhZ2VcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7VHJhbnNmb3JtfSBNMSBmKE0xLE0yLDApID0gTTFcbiAqIEBwYXJhbSB7VHJhbnNmb3JtfSBNMiBmKE0xLE0yLDEpID0gTTJcbiAqIEBwYXJhbSB7TnVtYmVyfSB0XG4gKiBAcmV0dXJuIHtUcmFuc2Zvcm19XG4gKi9cblRyYW5zZm9ybS5hdmVyYWdlID0gZnVuY3Rpb24gYXZlcmFnZShNMSwgTTIsIHQpIHtcbiAgICB0ID0gKHQgPT09IHVuZGVmaW5lZCkgPyAwLjUgOiB0O1xuICAgIHZhciBzcGVjTTEgPSBUcmFuc2Zvcm0uaW50ZXJwcmV0KE0xKTtcbiAgICB2YXIgc3BlY00yID0gVHJhbnNmb3JtLmludGVycHJldChNMik7XG5cbiAgICB2YXIgc3BlY0F2ZyA9IHtcbiAgICAgICAgdHJhbnNsYXRlOiBbMCwgMCwgMF0sXG4gICAgICAgIHJvdGF0ZTogWzAsIDAsIDBdLFxuICAgICAgICBzY2FsZTogWzAsIDAsIDBdLFxuICAgICAgICBza2V3OiBbMCwgMCwgMF1cbiAgICB9O1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgc3BlY0F2Zy50cmFuc2xhdGVbaV0gPSAoMSAtIHQpICogc3BlY00xLnRyYW5zbGF0ZVtpXSArIHQgKiBzcGVjTTIudHJhbnNsYXRlW2ldO1xuICAgICAgICBzcGVjQXZnLnJvdGF0ZVtpXSA9ICgxIC0gdCkgKiBzcGVjTTEucm90YXRlW2ldICsgdCAqIHNwZWNNMi5yb3RhdGVbaV07XG4gICAgICAgIHNwZWNBdmcuc2NhbGVbaV0gPSAoMSAtIHQpICogc3BlY00xLnNjYWxlW2ldICsgdCAqIHNwZWNNMi5zY2FsZVtpXTtcbiAgICAgICAgc3BlY0F2Zy5za2V3W2ldID0gKDEgLSB0KSAqIHNwZWNNMS5za2V3W2ldICsgdCAqIHNwZWNNMi5za2V3W2ldO1xuICAgIH1cbiAgICByZXR1cm4gVHJhbnNmb3JtLmJ1aWxkKHNwZWNBdmcpO1xufTtcblxuLyoqXG4gKiBDb21wb3NlIC50cmFuc2xhdGUsIC5yb3RhdGUsIC5zY2FsZSwgLnNrZXcgY29tcG9uZW50cyBpbnRvXG4gKiBUcmFuc2Zvcm0gbWF0cml4XG4gKlxuICogQG1ldGhvZCBidWlsZFxuICogQHN0YXRpY1xuICogQHBhcmFtIHttYXRyaXhTcGVjfSBzcGVjIG9iamVjdCB3aXRoIGNvbXBvbmVudCBtYXRyaWNlcyAudHJhbnNsYXRlLFxuICogICAgLnJvdGF0ZSwgLnNjYWxlLCAuc2tld1xuICogQHJldHVybiB7VHJhbnNmb3JtfSBjb21wb3NlZCB0cmFuc2Zvcm1cbiAqL1xuVHJhbnNmb3JtLmJ1aWxkID0gZnVuY3Rpb24gYnVpbGQoc3BlYykge1xuICAgIHZhciBzY2FsZU1hdHJpeCA9IFRyYW5zZm9ybS5zY2FsZShzcGVjLnNjYWxlWzBdLCBzcGVjLnNjYWxlWzFdLCBzcGVjLnNjYWxlWzJdKTtcbiAgICB2YXIgc2tld01hdHJpeCA9IFRyYW5zZm9ybS5za2V3KHNwZWMuc2tld1swXSwgc3BlYy5za2V3WzFdLCBzcGVjLnNrZXdbMl0pO1xuICAgIHZhciByb3RhdGVNYXRyaXggPSBUcmFuc2Zvcm0ucm90YXRlKHNwZWMucm90YXRlWzBdLCBzcGVjLnJvdGF0ZVsxXSwgc3BlYy5yb3RhdGVbMl0pO1xuICAgIHJldHVybiBUcmFuc2Zvcm0udGhlbk1vdmUoVHJhbnNmb3JtLm11bHRpcGx5KFRyYW5zZm9ybS5tdWx0aXBseShyb3RhdGVNYXRyaXgsIHNrZXdNYXRyaXgpLCBzY2FsZU1hdHJpeCksIHNwZWMudHJhbnNsYXRlKTtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIHR3byBUcmFuc2Zvcm1zIGFyZSBjb21wb25lbnQtd2lzZSBlcXVhbFxuICogICBXYXJuaW5nOiBicmVha3Mgb24gcGVyc3BlY3RpdmUgVHJhbnNmb3Jtc1xuICpcbiAqIEBtZXRob2QgZXF1YWxzXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0ge1RyYW5zZm9ybX0gYSBtYXRyaXhcbiAqIEBwYXJhbSB7VHJhbnNmb3JtfSBiIG1hdHJpeFxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuVHJhbnNmb3JtLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyhhLCBiKSB7XG4gICAgcmV0dXJuICFUcmFuc2Zvcm0ubm90RXF1YWxzKGEsIGIpO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgdHdvIFRyYW5zZm9ybXMgYXJlIGNvbXBvbmVudC13aXNlIHVuZXF1YWxcbiAqICAgV2FybmluZzogYnJlYWtzIG9uIHBlcnNwZWN0aXZlIFRyYW5zZm9ybXNcbiAqXG4gKiBAbWV0aG9kIG5vdEVxdWFsc1xuICogQHN0YXRpY1xuICogQHBhcmFtIHtUcmFuc2Zvcm19IGEgbWF0cml4XG4gKiBAcGFyYW0ge1RyYW5zZm9ybX0gYiBtYXRyaXhcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cblRyYW5zZm9ybS5ub3RFcXVhbHMgPSBmdW5jdGlvbiBub3RFcXVhbHMoYSwgYikge1xuICAgIGlmIChhID09PSBiKSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBzaG9ydGNpXG4gICAgcmV0dXJuICEoYSAmJiBiKSB8fFxuICAgICAgICBhWzEyXSAhPT0gYlsxMl0gfHwgYVsxM10gIT09IGJbMTNdIHx8IGFbMTRdICE9PSBiWzE0XSB8fFxuICAgICAgICBhWzBdICE9PSBiWzBdIHx8IGFbMV0gIT09IGJbMV0gfHwgYVsyXSAhPT0gYlsyXSB8fFxuICAgICAgICBhWzRdICE9PSBiWzRdIHx8IGFbNV0gIT09IGJbNV0gfHwgYVs2XSAhPT0gYls2XSB8fFxuICAgICAgICBhWzhdICE9PSBiWzhdIHx8IGFbOV0gIT09IGJbOV0gfHwgYVsxMF0gIT09IGJbMTBdO1xufTtcblxuLyoqXG4gKiBDb25zdHJhaW4gYW5nbGUtdHJpbyBjb21wb25lbnRzIHRvIHJhbmdlIG9mIFstcGksIHBpKS5cbiAqXG4gKiBAbWV0aG9kIG5vcm1hbGl6ZVJvdGF0aW9uXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0ge0FycmF5Lk51bWJlcn0gcm90YXRpb24gcGhpLCB0aGV0YSwgcHNpIChhcnJheSBvZiBmbG9hdHNcbiAqICAgICYmIGFycmF5Lmxlbmd0aCA9PSAzKVxuICogQHJldHVybiB7QXJyYXkuTnVtYmVyfSBuZXcgcGhpLCB0aGV0YSwgcHNpIHRyaXBsZXRcbiAqICAgIChhcnJheSBvZiBmbG9hdHMgJiYgYXJyYXkubGVuZ3RoID09IDMpXG4gKi9cblRyYW5zZm9ybS5ub3JtYWxpemVSb3RhdGlvbiA9IGZ1bmN0aW9uIG5vcm1hbGl6ZVJvdGF0aW9uKHJvdGF0aW9uKSB7XG4gICAgdmFyIHJlc3VsdCA9IHJvdGF0aW9uLnNsaWNlKDApO1xuICAgIGlmIChyZXN1bHRbMF0gPT09IE1hdGguUEkgKiAwLjUgfHwgcmVzdWx0WzBdID09PSAtTWF0aC5QSSAqIDAuNSkge1xuICAgICAgICByZXN1bHRbMF0gPSAtcmVzdWx0WzBdO1xuICAgICAgICByZXN1bHRbMV0gPSBNYXRoLlBJIC0gcmVzdWx0WzFdO1xuICAgICAgICByZXN1bHRbMl0gLT0gTWF0aC5QSTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdFswXSA+IE1hdGguUEkgKiAwLjUpIHtcbiAgICAgICAgcmVzdWx0WzBdID0gcmVzdWx0WzBdIC0gTWF0aC5QSTtcbiAgICAgICAgcmVzdWx0WzFdID0gTWF0aC5QSSAtIHJlc3VsdFsxXTtcbiAgICAgICAgcmVzdWx0WzJdIC09IE1hdGguUEk7XG4gICAgfVxuICAgIGlmIChyZXN1bHRbMF0gPCAtTWF0aC5QSSAqIDAuNSkge1xuICAgICAgICByZXN1bHRbMF0gPSByZXN1bHRbMF0gKyBNYXRoLlBJO1xuICAgICAgICByZXN1bHRbMV0gPSAtTWF0aC5QSSAtIHJlc3VsdFsxXTtcbiAgICAgICAgcmVzdWx0WzJdIC09IE1hdGguUEk7XG4gICAgfVxuICAgIHdoaWxlIChyZXN1bHRbMV0gPCAtTWF0aC5QSSkgcmVzdWx0WzFdICs9IDIgKiBNYXRoLlBJO1xuICAgIHdoaWxlIChyZXN1bHRbMV0gPj0gTWF0aC5QSSkgcmVzdWx0WzFdIC09IDIgKiBNYXRoLlBJO1xuICAgIHdoaWxlIChyZXN1bHRbMl0gPCAtTWF0aC5QSSkgcmVzdWx0WzJdICs9IDIgKiBNYXRoLlBJO1xuICAgIHdoaWxlIChyZXN1bHRbMl0gPj0gTWF0aC5QSSkgcmVzdWx0WzJdIC09IDIgKiBNYXRoLlBJO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIChQcm9wZXJ0eSkgQXJyYXkgZGVmaW5pbmcgYSB0cmFuc2xhdGlvbiBmb3J3YXJkIGluIHogYnkgMVxuICpcbiAqIEBwcm9wZXJ0eSB7YXJyYXl9IGluRnJvbnRcbiAqIEBzdGF0aWNcbiAqIEBmaW5hbFxuICovXG5UcmFuc2Zvcm0uaW5Gcm9udCA9IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAxZS0zLCAxXTtcblxuLyoqXG4gKiAoUHJvcGVydHkpIEFycmF5IGRlZmluaW5nIGEgdHJhbnNsYXRpb24gYmFja3dhcmRzIGluIHogYnkgMVxuICpcbiAqIEBwcm9wZXJ0eSB7YXJyYXl9IGJlaGluZFxuICogQHN0YXRpY1xuICogQGZpbmFsXG4gKi9cblRyYW5zZm9ybS5iZWhpbmQgPSBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgLTFlLTMsIDFdO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zZm9ybTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL1RyYW5zZm9ybS5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvY29yZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IGRhdmlkQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cblxuXG5cbi8qKlxuICogVGhyZWUtZWxlbWVudCBmbG9hdGluZyBwb2ludCB2ZWN0b3IuXG4gKlxuICogQGNsYXNzIFZlY3RvclxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtudW1iZXJ9IHggeCBlbGVtZW50IHZhbHVlXG4gKiBAcGFyYW0ge251bWJlcn0geSB5IGVsZW1lbnQgdmFsdWVcbiAqIEBwYXJhbSB7bnVtYmVyfSB6IHogZWxlbWVudCB2YWx1ZVxuICovXG5mdW5jdGlvbiBWZWN0b3IoeCx5LHopIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkgdGhpcy5zZXQoeCk7XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMueCA9IHggfHwgMDtcbiAgICAgICAgdGhpcy55ID0geSB8fCAwO1xuICAgICAgICB0aGlzLnogPSB6IHx8IDA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufVxuXG52YXIgX3JlZ2lzdGVyID0gbmV3IFZlY3RvcigwLDAsMCk7XG5cbi8qKlxuICogQWRkIHRoaXMgZWxlbWVudC13aXNlIHRvIGFub3RoZXIgVmVjdG9yLCBlbGVtZW50LXdpc2UuXG4gKiAgIE5vdGU6IFRoaXMgc2V0cyB0aGUgaW50ZXJuYWwgcmVzdWx0IHJlZ2lzdGVyLCBzbyBvdGhlciByZWZlcmVuY2VzIHRvIHRoYXQgdmVjdG9yIHdpbGwgY2hhbmdlLlxuICpcbiAqIEBtZXRob2QgYWRkXG4gKiBAcGFyYW0ge1ZlY3Rvcn0gdiBhZGRlbmRcbiAqIEByZXR1cm4ge1ZlY3Rvcn0gdmVjdG9yIHN1bVxuICovXG5WZWN0b3IucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCh2KSB7XG4gICAgcmV0dXJuIF9zZXRYWVouY2FsbChfcmVnaXN0ZXIsXG4gICAgICAgIHRoaXMueCArIHYueCxcbiAgICAgICAgdGhpcy55ICsgdi55LFxuICAgICAgICB0aGlzLnogKyB2LnpcbiAgICApO1xufTtcblxuLyoqXG4gKiBTdWJ0cmFjdCBhbm90aGVyIHZlY3RvciBmcm9tIHRoaXMgdmVjdG9yLCBlbGVtZW50LXdpc2UuXG4gKiAgIE5vdGU6IFRoaXMgc2V0cyB0aGUgaW50ZXJuYWwgcmVzdWx0IHJlZ2lzdGVyLCBzbyBvdGhlciByZWZlcmVuY2VzIHRvIHRoYXQgdmVjdG9yIHdpbGwgY2hhbmdlLlxuICpcbiAqIEBtZXRob2Qgc3ViXG4gKiBAcGFyYW0ge1ZlY3Rvcn0gdiBzdWJ0cmFoZW5kXG4gKiBAcmV0dXJuIHtWZWN0b3J9IHZlY3RvciBkaWZmZXJlbmNlXG4gKi9cblZlY3Rvci5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24gc3ViKHYpIHtcbiAgICByZXR1cm4gX3NldFhZWi5jYWxsKF9yZWdpc3RlcixcbiAgICAgICAgdGhpcy54IC0gdi54LFxuICAgICAgICB0aGlzLnkgLSB2LnksXG4gICAgICAgIHRoaXMueiAtIHYuelxuICAgICk7XG59O1xuXG4vKipcbiAqIFNjYWxlIFZlY3RvciBieSBmbG9hdGluZyBwb2ludCByLlxuICogICBOb3RlOiBUaGlzIHNldHMgdGhlIGludGVybmFsIHJlc3VsdCByZWdpc3Rlciwgc28gb3RoZXIgcmVmZXJlbmNlcyB0byB0aGF0IHZlY3RvciB3aWxsIGNoYW5nZS5cbiAqXG4gKiBAbWV0aG9kIG11bHRcbiAqXG4gKiBAcGFyYW0ge251bWJlcn0gciBzY2FsYXJcbiAqIEByZXR1cm4ge1ZlY3Rvcn0gdmVjdG9yIHJlc3VsdFxuICovXG5WZWN0b3IucHJvdG90eXBlLm11bHQgPSBmdW5jdGlvbiBtdWx0KHIpIHtcbiAgICByZXR1cm4gX3NldFhZWi5jYWxsKF9yZWdpc3RlcixcbiAgICAgICAgciAqIHRoaXMueCxcbiAgICAgICAgciAqIHRoaXMueSxcbiAgICAgICAgciAqIHRoaXMuelxuICAgICk7XG59O1xuXG4vKipcbiAqIFNjYWxlIFZlY3RvciBieSBmbG9hdGluZyBwb2ludCAxL3IuXG4gKiAgIE5vdGU6IFRoaXMgc2V0cyB0aGUgaW50ZXJuYWwgcmVzdWx0IHJlZ2lzdGVyLCBzbyBvdGhlciByZWZlcmVuY2VzIHRvIHRoYXQgdmVjdG9yIHdpbGwgY2hhbmdlLlxuICpcbiAqIEBtZXRob2QgZGl2XG4gKlxuICogQHBhcmFtIHtudW1iZXJ9IHIgc2NhbGFyXG4gKiBAcmV0dXJuIHtWZWN0b3J9IHZlY3RvciByZXN1bHRcbiAqL1xuVmVjdG9yLnByb3RvdHlwZS5kaXYgPSBmdW5jdGlvbiBkaXYocikge1xuICAgIHJldHVybiB0aGlzLm11bHQoMSAvIHIpO1xufTtcblxuLyoqXG4gKiBHaXZlbiBhbm90aGVyIHZlY3RvciB2LCByZXR1cm4gY3Jvc3MgcHJvZHVjdCAodil4KHRoaXMpLlxuICogICBOb3RlOiBUaGlzIHNldHMgdGhlIGludGVybmFsIHJlc3VsdCByZWdpc3Rlciwgc28gb3RoZXIgcmVmZXJlbmNlcyB0byB0aGF0IHZlY3RvciB3aWxsIGNoYW5nZS5cbiAqXG4gKiBAbWV0aG9kIGNyb3NzXG4gKiBAcGFyYW0ge1ZlY3Rvcn0gdiBMZWZ0IEhhbmQgVmVjdG9yXG4gKiBAcmV0dXJuIHtWZWN0b3J9IHZlY3RvciByZXN1bHRcbiAqL1xuVmVjdG9yLnByb3RvdHlwZS5jcm9zcyA9IGZ1bmN0aW9uIGNyb3NzKHYpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcbiAgICB2YXIgdnggPSB2Lng7XG4gICAgdmFyIHZ5ID0gdi55O1xuICAgIHZhciB2eiA9IHYuejtcblxuICAgIHJldHVybiBfc2V0WFlaLmNhbGwoX3JlZ2lzdGVyLFxuICAgICAgICB6ICogdnkgLSB5ICogdnosXG4gICAgICAgIHggKiB2eiAtIHogKiB2eCxcbiAgICAgICAgeSAqIHZ4IC0geCAqIHZ5XG4gICAgKTtcbn07XG5cbi8qKlxuICogQ29tcG9uZW50LXdpc2UgZXF1YWxpdHkgdGVzdCBiZXR3ZWVuIHRoaXMgYW5kIFZlY3RvciB2LlxuICogQG1ldGhvZCBlcXVhbHNcbiAqIEBwYXJhbSB7VmVjdG9yfSB2IHZlY3RvciB0byBjb21wYXJlXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5WZWN0b3IucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyh2KSB7XG4gICAgcmV0dXJuICh2LnggPT09IHRoaXMueCAmJiB2LnkgPT09IHRoaXMueSAmJiB2LnogPT09IHRoaXMueik7XG59O1xuXG4vKipcbiAqIFJvdGF0ZSBjbG9ja3dpc2UgYXJvdW5kIHgtYXhpcyBieSB0aGV0YSByYWRpYW5zLlxuICogICBOb3RlOiBUaGlzIHNldHMgdGhlIGludGVybmFsIHJlc3VsdCByZWdpc3Rlciwgc28gb3RoZXIgcmVmZXJlbmNlcyB0byB0aGF0IHZlY3RvciB3aWxsIGNoYW5nZS5cbiAqIEBtZXRob2Qgcm90YXRlWFxuICogQHBhcmFtIHtudW1iZXJ9IHRoZXRhIHJhZGlhbnNcbiAqIEByZXR1cm4ge1ZlY3Rvcn0gcm90YXRlZCB2ZWN0b3JcbiAqL1xuVmVjdG9yLnByb3RvdHlwZS5yb3RhdGVYID0gZnVuY3Rpb24gcm90YXRlWCh0aGV0YSkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgdmFyIGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xuICAgIHZhciBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcblxuICAgIHJldHVybiBfc2V0WFlaLmNhbGwoX3JlZ2lzdGVyLFxuICAgICAgICB4LFxuICAgICAgICB5ICogY29zVGhldGEgLSB6ICogc2luVGhldGEsXG4gICAgICAgIHkgKiBzaW5UaGV0YSArIHogKiBjb3NUaGV0YVxuICAgICk7XG59O1xuXG4vKipcbiAqIFJvdGF0ZSBjbG9ja3dpc2UgYXJvdW5kIHktYXhpcyBieSB0aGV0YSByYWRpYW5zLlxuICogICBOb3RlOiBUaGlzIHNldHMgdGhlIGludGVybmFsIHJlc3VsdCByZWdpc3Rlciwgc28gb3RoZXIgcmVmZXJlbmNlcyB0byB0aGF0IHZlY3RvciB3aWxsIGNoYW5nZS5cbiAqIEBtZXRob2Qgcm90YXRlWVxuICogQHBhcmFtIHtudW1iZXJ9IHRoZXRhIHJhZGlhbnNcbiAqIEByZXR1cm4ge1ZlY3Rvcn0gcm90YXRlZCB2ZWN0b3JcbiAqL1xuVmVjdG9yLnByb3RvdHlwZS5yb3RhdGVZID0gZnVuY3Rpb24gcm90YXRlWSh0aGV0YSkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgdmFyIGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xuICAgIHZhciBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcblxuICAgIHJldHVybiBfc2V0WFlaLmNhbGwoX3JlZ2lzdGVyLFxuICAgICAgICB6ICogc2luVGhldGEgKyB4ICogY29zVGhldGEsXG4gICAgICAgIHksXG4gICAgICAgIHogKiBjb3NUaGV0YSAtIHggKiBzaW5UaGV0YVxuICAgICk7XG59O1xuXG4vKipcbiAqIFJvdGF0ZSBjbG9ja3dpc2UgYXJvdW5kIHotYXhpcyBieSB0aGV0YSByYWRpYW5zLlxuICogICBOb3RlOiBUaGlzIHNldHMgdGhlIGludGVybmFsIHJlc3VsdCByZWdpc3Rlciwgc28gb3RoZXIgcmVmZXJlbmNlcyB0byB0aGF0IHZlY3RvciB3aWxsIGNoYW5nZS5cbiAqIEBtZXRob2Qgcm90YXRlWlxuICogQHBhcmFtIHtudW1iZXJ9IHRoZXRhIHJhZGlhbnNcbiAqIEByZXR1cm4ge1ZlY3Rvcn0gcm90YXRlZCB2ZWN0b3JcbiAqL1xuVmVjdG9yLnByb3RvdHlwZS5yb3RhdGVaID0gZnVuY3Rpb24gcm90YXRlWih0aGV0YSkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgdmFyIGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xuICAgIHZhciBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcblxuICAgIHJldHVybiBfc2V0WFlaLmNhbGwoX3JlZ2lzdGVyLFxuICAgICAgICB4ICogY29zVGhldGEgLSB5ICogc2luVGhldGEsXG4gICAgICAgIHggKiBzaW5UaGV0YSArIHkgKiBjb3NUaGV0YSxcbiAgICAgICAgelxuICAgICk7XG59O1xuXG4vKipcbiAqIFJldHVybiBkb3QgcHJvZHVjdCBvZiB0aGlzIHdpdGggYSBzZWNvbmQgVmVjdG9yXG4gKiBAbWV0aG9kIGRvdFxuICogQHBhcmFtIHtWZWN0b3J9IHYgc2Vjb25kIHZlY3RvclxuICogQHJldHVybiB7bnVtYmVyfSBkb3QgcHJvZHVjdFxuICovXG5WZWN0b3IucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uIGRvdCh2KSB7XG4gICAgcmV0dXJuIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueSArIHRoaXMueiAqIHYuejtcbn07XG5cbi8qKlxuICogUmV0dXJuIHNxdWFyZWQgbGVuZ3RoIG9mIHRoaXMgdmVjdG9yXG4gKiBAbWV0aG9kIG5vcm1TcXVhcmVkXG4gKiBAcmV0dXJuIHtudW1iZXJ9IHNxdWFyZWQgbGVuZ3RoXG4gKi9cblZlY3Rvci5wcm90b3R5cGUubm9ybVNxdWFyZWQgPSBmdW5jdGlvbiBub3JtU3F1YXJlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5kb3QodGhpcyk7XG59O1xuXG4vKipcbiAqIFJldHVybiBsZW5ndGggb2YgdGhpcyB2ZWN0b3JcbiAqIEBtZXRob2Qgbm9ybVxuICogQHJldHVybiB7bnVtYmVyfSBsZW5ndGhcbiAqL1xuVmVjdG9yLnByb3RvdHlwZS5ub3JtID0gZnVuY3Rpb24gbm9ybSgpIHtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMubm9ybVNxdWFyZWQoKSk7XG59O1xuXG4vKipcbiAqIFNjYWxlIFZlY3RvciB0byBzcGVjaWZpZWQgbGVuZ3RoLlxuICogICBJZiBsZW5ndGggaXMgbGVzcyB0aGFuIGludGVybmFsIHRvbGVyYW5jZSwgc2V0IHZlY3RvciB0byBbbGVuZ3RoLCAwLCAwXS5cbiAqICAgTm90ZTogVGhpcyBzZXRzIHRoZSBpbnRlcm5hbCByZXN1bHQgcmVnaXN0ZXIsIHNvIG90aGVyIHJlZmVyZW5jZXMgdG8gdGhhdCB2ZWN0b3Igd2lsbCBjaGFuZ2UuXG4gKiBAbWV0aG9kIG5vcm1hbGl6ZVxuICpcbiAqIEBwYXJhbSB7bnVtYmVyfSBsZW5ndGggdGFyZ2V0IGxlbmd0aCwgZGVmYXVsdCAxLjBcbiAqIEByZXR1cm4ge1ZlY3Rvcn1cbiAqL1xuVmVjdG9yLnByb3RvdHlwZS5ub3JtYWxpemUgPSBmdW5jdGlvbiBub3JtYWxpemUobGVuZ3RoKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIGxlbmd0aCA9IDE7XG4gICAgdmFyIG5vcm0gPSB0aGlzLm5vcm0oKTtcblxuICAgIGlmIChub3JtID4gMWUtNykgcmV0dXJuIF9zZXRGcm9tVmVjdG9yLmNhbGwoX3JlZ2lzdGVyLCB0aGlzLm11bHQobGVuZ3RoIC8gbm9ybSkpO1xuICAgIGVsc2UgcmV0dXJuIF9zZXRYWVouY2FsbChfcmVnaXN0ZXIsIGxlbmd0aCwgMCwgMCk7XG59O1xuXG4vKipcbiAqIE1ha2UgYSBzZXBhcmF0ZSBjb3B5IG9mIHRoZSBWZWN0b3IuXG4gKlxuICogQG1ldGhvZCBjbG9uZVxuICpcbiAqIEByZXR1cm4ge1ZlY3Rvcn1cbiAqL1xuVmVjdG9yLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lKCkge1xuICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMpO1xufTtcblxuLyoqXG4gKiBUcnVlIGlmIGFuZCBvbmx5IGlmIGV2ZXJ5IHZhbHVlIGlzIDAgKG9yIGZhbHN5KVxuICpcbiAqIEBtZXRob2QgaXNaZXJvXG4gKlxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xuVmVjdG9yLnByb3RvdHlwZS5pc1plcm8gPSBmdW5jdGlvbiBpc1plcm8oKSB7XG4gICAgcmV0dXJuICEodGhpcy54IHx8IHRoaXMueSB8fCB0aGlzLnopO1xufTtcblxuZnVuY3Rpb24gX3NldFhZWih4LHkseikge1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLnogPSB6O1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5mdW5jdGlvbiBfc2V0RnJvbUFycmF5KHYpIHtcbiAgICByZXR1cm4gX3NldFhZWi5jYWxsKHRoaXMsdlswXSx2WzFdLHZbMl0gfHwgMCk7XG59XG5cbmZ1bmN0aW9uIF9zZXRGcm9tVmVjdG9yKHYpIHtcbiAgICByZXR1cm4gX3NldFhZWi5jYWxsKHRoaXMsIHYueCwgdi55LCB2LnopO1xufVxuXG5mdW5jdGlvbiBfc2V0RnJvbU51bWJlcih4KSB7XG4gICAgcmV0dXJuIF9zZXRYWVouY2FsbCh0aGlzLHgsMCwwKTtcbn1cblxuLyoqXG4gKiBTZXQgdGhpcyBWZWN0b3IgdG8gdGhlIHZhbHVlcyBpbiB0aGUgcHJvdmlkZWQgQXJyYXkgb3IgVmVjdG9yLlxuICpcbiAqIEBtZXRob2Qgc2V0XG4gKiBAcGFyYW0ge29iamVjdH0gdiBhcnJheSwgVmVjdG9yLCBvciBudW1iZXJcbiAqIEByZXR1cm4ge1ZlY3Rvcn0gdGhpc1xuICovXG5WZWN0b3IucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCh2KSB7XG4gICAgaWYgKHYgaW5zdGFuY2VvZiBBcnJheSkgICAgcmV0dXJuIF9zZXRGcm9tQXJyYXkuY2FsbCh0aGlzLCB2KTtcbiAgICBpZiAodiBpbnN0YW5jZW9mIFZlY3RvcikgICByZXR1cm4gX3NldEZyb21WZWN0b3IuY2FsbCh0aGlzLCB2KTtcbiAgICBpZiAodHlwZW9mIHYgPT09ICdudW1iZXInKSByZXR1cm4gX3NldEZyb21OdW1iZXIuY2FsbCh0aGlzLCB2KTtcbn07XG5cblZlY3Rvci5wcm90b3R5cGUuc2V0WFlaID0gZnVuY3Rpb24oeCx5LHopIHtcbiAgICByZXR1cm4gX3NldFhZWi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuVmVjdG9yLnByb3RvdHlwZS5zZXQxRCA9IGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4gX3NldEZyb21OdW1iZXIuY2FsbCh0aGlzLCB4KTtcbn07XG5cbi8qKlxuICogUHV0IHJlc3VsdCBvZiBsYXN0IGludGVybmFsIHJlZ2lzdGVyIGNhbGN1bGF0aW9uIGluIHNwZWNpZmllZCBvdXRwdXQgdmVjdG9yLlxuICpcbiAqIEBtZXRob2QgcHV0XG4gKiBAcGFyYW0ge1ZlY3Rvcn0gdiBkZXN0aW5hdGlvbiB2ZWN0b3JcbiAqIEByZXR1cm4ge1ZlY3Rvcn0gZGVzdGluYXRpb24gdmVjdG9yXG4gKi9cblxuVmVjdG9yLnByb3RvdHlwZS5wdXQgPSBmdW5jdGlvbiBwdXQodikge1xuICAgIGlmICh0aGlzID09PSBfcmVnaXN0ZXIpIF9zZXRGcm9tVmVjdG9yLmNhbGwodiwgX3JlZ2lzdGVyKTtcbiAgICBlbHNlIF9zZXRGcm9tVmVjdG9yLmNhbGwodiwgdGhpcyk7XG59O1xuXG4vKipcbiAqIFNldCB0aGlzIHZlY3RvciB0byBbMCwwLDBdXG4gKlxuICogQG1ldGhvZCBjbGVhclxuICovXG5WZWN0b3IucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgcmV0dXJuIF9zZXRYWVouY2FsbCh0aGlzLDAsMCwwKTtcbn07XG5cbi8qKlxuICogU2NhbGUgdGhpcyBWZWN0b3IgZG93biB0byBzcGVjaWZpZWQgXCJjYXBcIiBsZW5ndGguXG4gKiAgIElmIFZlY3RvciBzaG9ydGVyIHRoYW4gY2FwLCBvciBjYXAgaXMgSW5maW5pdHksIGRvIG5vdGhpbmcuXG4gKiAgIE5vdGU6IFRoaXMgc2V0cyB0aGUgaW50ZXJuYWwgcmVzdWx0IHJlZ2lzdGVyLCBzbyBvdGhlciByZWZlcmVuY2VzIHRvIHRoYXQgdmVjdG9yIHdpbGwgY2hhbmdlLlxuICpcbiAqIEBtZXRob2QgY2FwXG4gKiBAcmV0dXJuIHtWZWN0b3J9IGNhcHBlZCB2ZWN0b3JcbiAqL1xuVmVjdG9yLnByb3RvdHlwZS5jYXAgPSBmdW5jdGlvbiBjYXAoY2FwKSB7XG4gICAgaWYgKGNhcCA9PT0gSW5maW5pdHkpIHJldHVybiBfc2V0RnJvbVZlY3Rvci5jYWxsKF9yZWdpc3RlciwgdGhpcyk7XG4gICAgdmFyIG5vcm0gPSB0aGlzLm5vcm0oKTtcbiAgICBpZiAobm9ybSA+IGNhcCkgcmV0dXJuIF9zZXRGcm9tVmVjdG9yLmNhbGwoX3JlZ2lzdGVyLCB0aGlzLm11bHQoY2FwIC8gbm9ybSkpO1xuICAgIGVsc2UgcmV0dXJuIF9zZXRGcm9tVmVjdG9yLmNhbGwoX3JlZ2lzdGVyLCB0aGlzKTtcbn07XG5cbi8qKlxuICogUmV0dXJuIHByb2plY3Rpb24gb2YgdGhpcyBWZWN0b3Igb250byBhbm90aGVyLlxuICogICBOb3RlOiBUaGlzIHNldHMgdGhlIGludGVybmFsIHJlc3VsdCByZWdpc3Rlciwgc28gb3RoZXIgcmVmZXJlbmNlcyB0byB0aGF0IHZlY3RvciB3aWxsIGNoYW5nZS5cbiAqXG4gKiBAbWV0aG9kIHByb2plY3RcbiAqIEBwYXJhbSB7VmVjdG9yfSBuIHZlY3RvciB0byBwcm9qZWN0IHVwb25cbiAqIEByZXR1cm4ge1ZlY3Rvcn0gcHJvamVjdGVkIHZlY3RvclxuICovXG5WZWN0b3IucHJvdG90eXBlLnByb2plY3QgPSBmdW5jdGlvbiBwcm9qZWN0KG4pIHtcbiAgICByZXR1cm4gbi5tdWx0KHRoaXMuZG90KG4pKTtcbn07XG5cbi8qKlxuICogUmVmbGVjdCB0aGlzIFZlY3RvciBhY3Jvc3MgcHJvdmlkZWQgdmVjdG9yLlxuICogICBOb3RlOiBUaGlzIHNldHMgdGhlIGludGVybmFsIHJlc3VsdCByZWdpc3Rlciwgc28gb3RoZXIgcmVmZXJlbmNlcyB0byB0aGF0IHZlY3RvciB3aWxsIGNoYW5nZS5cbiAqXG4gKiBAbWV0aG9kIHJlZmxlY3RBY3Jvc3NcbiAqIEBwYXJhbSB7VmVjdG9yfSBuIHZlY3RvciB0byByZWZsZWN0IGFjcm9zc1xuICogQHJldHVybiB7VmVjdG9yfSByZWZsZWN0ZWQgdmVjdG9yXG4gKi9cblZlY3Rvci5wcm90b3R5cGUucmVmbGVjdEFjcm9zcyA9IGZ1bmN0aW9uIHJlZmxlY3RBY3Jvc3Mobikge1xuICAgIG4ubm9ybWFsaXplKCkucHV0KG4pO1xuICAgIHJldHVybiBfc2V0RnJvbVZlY3RvcihfcmVnaXN0ZXIsIHRoaXMuc3ViKHRoaXMucHJvamVjdChuKS5tdWx0KDIpKSk7XG59O1xuXG4vKipcbiAqIENvbnZlcnQgVmVjdG9yIHRvIHRocmVlLWVsZW1lbnQgYXJyYXkuXG4gKlxuICogQG1ldGhvZCBnZXRcbiAqIEByZXR1cm4ge2FycmF5PG51bWJlcj59IHRocmVlLWVsZW1lbnQgYXJyYXlcbiAqL1xuVmVjdG9yLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBnZXQoKSB7XG4gICAgcmV0dXJuIFt0aGlzLngsIHRoaXMueSwgdGhpcy56XTtcbn07XG5cblZlY3Rvci5wcm90b3R5cGUuZ2V0MUQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy54O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWZWN0b3I7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvbWF0aC9WZWN0b3IuanNcIixcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL21hdGhcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyOiBtYXJrQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbnZhciBNb2RpZmllciA9IHJlcXVpcmUoJy4uL2NvcmUvTW9kaWZpZXInKTtcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuLi9jb3JlL1RyYW5zZm9ybScpO1xudmFyIFRyYW5zaXRpb25hYmxlID0gcmVxdWlyZSgnLi4vdHJhbnNpdGlvbnMvVHJhbnNpdGlvbmFibGUnKTtcbnZhciBUcmFuc2l0aW9uYWJsZVRyYW5zZm9ybSA9IHJlcXVpcmUoJy4uL3RyYW5zaXRpb25zL1RyYW5zaXRpb25hYmxlVHJhbnNmb3JtJyk7XG5cbi8qKlxuICogIEEgY29sbGVjdGlvbiBvZiB2aXN1YWwgY2hhbmdlcyB0byBiZVxuICogICAgYXBwbGllZCB0byBhbm90aGVyIHJlbmRlcmFibGUgY29tcG9uZW50LCBzdHJvbmdseSBjb3VwbGVkIHdpdGggdGhlIHN0YXRlIHRoYXQgZGVmaW5lc1xuICogICAgdGhvc2UgY2hhbmdlcy4gVGhpcyBjb2xsZWN0aW9uIGluY2x1ZGVzIGFcbiAqICAgIHRyYW5zZm9ybSBtYXRyaXgsIGFuIG9wYWNpdHkgY29uc3RhbnQsIGEgc2l6ZSwgYW4gb3JpZ2luIHNwZWNpZmllciwgYW5kIGFuIGFsaWdubWVudCBzcGVjaWZpZXIuXG4gKiAgICBTdGF0ZU1vZGlmaWVyIG9iamVjdHMgY2FuIGJlIGFkZGVkIHRvIGFueSBSZW5kZXJOb2RlIG9yIG9iamVjdFxuICogICAgY2FwYWJsZSBvZiBkaXNwbGF5aW5nIHJlbmRlcmFibGVzLiAgVGhlIFN0YXRlTW9kaWZpZXIncyBjaGlsZHJlbiBhbmQgZGVzY2VuZGFudHNcbiAqICAgIGFyZSB0cmFuc2Zvcm1lZCBieSB0aGUgYW1vdW50cyBzcGVjaWZpZWQgaW4gdGhlIG1vZGlmaWVyJ3MgcHJvcGVydGllcy5cbiAqXG4gKiBAY2xhc3MgU3RhdGVNb2RpZmllclxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIG92ZXJyaWRlcyBvZiBkZWZhdWx0IG9wdGlvbnNcbiAqIEBwYXJhbSB7VHJhbnNmb3JtfSBbb3B0aW9ucy50cmFuc2Zvcm1dIGFmZmluZSB0cmFuc2Zvcm1hdGlvbiBtYXRyaXhcbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5vcGFjaXR5XVxuICogQHBhcmFtIHtBcnJheS5OdW1iZXJ9IFtvcHRpb25zLm9yaWdpbl0gb3JpZ2luIGFkanVzdG1lbnRcbiAqIEBwYXJhbSB7QXJyYXkuTnVtYmVyfSBbb3B0aW9ucy5hbGlnbl0gYWxpZ24gYWRqdXN0bWVudFxuICogQHBhcmFtIHtBcnJheS5OdW1iZXJ9IFtvcHRpb25zLnNpemVdIHNpemUgdG8gYXBwbHkgdG8gZGVzY2VuZGFudHNcbiAqL1xuZnVuY3Rpb24gU3RhdGVNb2RpZmllcihvcHRpb25zKSB7XG4gICAgdGhpcy5fdHJhbnNmb3JtU3RhdGUgPSBuZXcgVHJhbnNpdGlvbmFibGVUcmFuc2Zvcm0oVHJhbnNmb3JtLmlkZW50aXR5KTtcbiAgICB0aGlzLl9vcGFjaXR5U3RhdGUgPSBuZXcgVHJhbnNpdGlvbmFibGUoMSk7XG4gICAgdGhpcy5fb3JpZ2luU3RhdGUgPSBuZXcgVHJhbnNpdGlvbmFibGUoWzAsIDBdKTtcbiAgICB0aGlzLl9hbGlnblN0YXRlID0gbmV3IFRyYW5zaXRpb25hYmxlKFswLCAwXSk7XG4gICAgdGhpcy5fc2l6ZVN0YXRlID0gbmV3IFRyYW5zaXRpb25hYmxlKFswLCAwXSk7XG5cbiAgICB0aGlzLl9tb2RpZmllciA9IG5ldyBNb2RpZmllcih7XG4gICAgICAgIHRyYW5zZm9ybTogdGhpcy5fdHJhbnNmb3JtU3RhdGUsXG4gICAgICAgIG9wYWNpdHk6IHRoaXMuX29wYWNpdHlTdGF0ZSxcbiAgICAgICAgb3JpZ2luOiBudWxsLFxuICAgICAgICBhbGlnbjogbnVsbCxcbiAgICAgICAgc2l6ZTogbnVsbFxuICAgIH0pO1xuXG4gICAgdGhpcy5faGFzT3JpZ2luID0gZmFsc2U7XG4gICAgdGhpcy5faGFzQWxpZ24gPSBmYWxzZTtcbiAgICB0aGlzLl9oYXNTaXplID0gZmFsc2U7XG5cbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgICBpZiAob3B0aW9ucy50cmFuc2Zvcm0pIHRoaXMuc2V0VHJhbnNmb3JtKG9wdGlvbnMudHJhbnNmb3JtKTtcbiAgICAgICAgaWYgKG9wdGlvbnMub3BhY2l0eSAhPT0gdW5kZWZpbmVkKSB0aGlzLnNldE9wYWNpdHkob3B0aW9ucy5vcGFjaXR5KTtcbiAgICAgICAgaWYgKG9wdGlvbnMub3JpZ2luKSB0aGlzLnNldE9yaWdpbihvcHRpb25zLm9yaWdpbik7XG4gICAgICAgIGlmIChvcHRpb25zLmFsaWduKSB0aGlzLnNldEFsaWduKG9wdGlvbnMuYWxpZ24pO1xuICAgICAgICBpZiAob3B0aW9ucy5zaXplKSB0aGlzLnNldFNpemUob3B0aW9ucy5zaXplKTtcbiAgICB9XG59XG5cbi8qKlxuICogU2V0IHRoZSB0cmFuc2Zvcm0gbWF0cml4IG9mIHRoaXMgbW9kaWZpZXIsIGVpdGhlciBzdGF0aWNhbGx5IG9yXG4gKiAgIHRocm91Z2ggYSBwcm92aWRlZCBUcmFuc2l0aW9uYWJsZS5cbiAqXG4gKiBAbWV0aG9kIHNldFRyYW5zZm9ybVxuICpcbiAqIEBwYXJhbSB7VHJhbnNmb3JtfSB0cmFuc2Zvcm0gVHJhbnNmb3JtIHRvIHRyYW5zaXRpb24gdG8uXG4gKiBAcGFyYW0ge1RyYW5zaXRpb25hYmxlfSBbdHJhbnNpdGlvbl0gVmFsaWQgdHJhbnNpdGlvbmFibGUgb2JqZWN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIGNhbGxiYWNrIHRvIGNhbGwgYWZ0ZXIgdHJhbnNpdGlvbiBjb21wbGV0ZXNcbiAqIEByZXR1cm4ge1N0YXRlTW9kaWZpZXJ9IHRoaXNcbiAqL1xuU3RhdGVNb2RpZmllci5wcm90b3R5cGUuc2V0VHJhbnNmb3JtID0gZnVuY3Rpb24gc2V0VHJhbnNmb3JtKHRyYW5zZm9ybSwgdHJhbnNpdGlvbiwgY2FsbGJhY2spIHtcbiAgICB0aGlzLl90cmFuc2Zvcm1TdGF0ZS5zZXQodHJhbnNmb3JtLCB0cmFuc2l0aW9uLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgb3BhY2l0eSBvZiB0aGlzIG1vZGlmaWVyLCBlaXRoZXIgc3RhdGljYWxseSBvclxuICogICB0aHJvdWdoIGEgcHJvdmlkZWQgVHJhbnNpdGlvbmFibGUuXG4gKlxuICogQG1ldGhvZCBzZXRPcGFjaXR5XG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG9wYWNpdHkgT3BhY2l0eSB2YWx1ZSB0byB0cmFuc2l0aW9uIHRvLlxuICogQHBhcmFtIHtUcmFuc2l0aW9uYWJsZX0gdHJhbnNpdGlvbiBWYWxpZCB0cmFuc2l0aW9uYWJsZSBvYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGNhbGxiYWNrIHRvIGNhbGwgYWZ0ZXIgdHJhbnNpdGlvbiBjb21wbGV0ZXNcbiAqIEByZXR1cm4ge1N0YXRlTW9kaWZpZXJ9IHRoaXNcbiAqL1xuU3RhdGVNb2RpZmllci5wcm90b3R5cGUuc2V0T3BhY2l0eSA9IGZ1bmN0aW9uIHNldE9wYWNpdHkob3BhY2l0eSwgdHJhbnNpdGlvbiwgY2FsbGJhY2spIHtcbiAgICB0aGlzLl9vcGFjaXR5U3RhdGUuc2V0KG9wYWNpdHksIHRyYW5zaXRpb24sIGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBvcmlnaW4gb2YgdGhpcyBtb2RpZmllciwgZWl0aGVyIHN0YXRpY2FsbHkgb3JcbiAqICAgdGhyb3VnaCBhIHByb3ZpZGVkIFRyYW5zaXRpb25hYmxlLlxuICpcbiAqIEBtZXRob2Qgc2V0T3JpZ2luXG4gKlxuICogQHBhcmFtIHtBcnJheS5OdW1iZXJ9IG9yaWdpbiB0d28gZWxlbWVudCBhcnJheSB3aXRoIHZhbHVlcyBiZXR3ZWVuIDAgYW5kIDEuXG4gKiBAcGFyYW0ge1RyYW5zaXRpb25hYmxlfSB0cmFuc2l0aW9uIFZhbGlkIHRyYW5zaXRpb25hYmxlIG9iamVjdFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgY2FsbGJhY2sgdG8gY2FsbCBhZnRlciB0cmFuc2l0aW9uIGNvbXBsZXRlc1xuICogQHJldHVybiB7U3RhdGVNb2RpZmllcn0gdGhpc1xuICovXG5TdGF0ZU1vZGlmaWVyLnByb3RvdHlwZS5zZXRPcmlnaW4gPSBmdW5jdGlvbiBzZXRPcmlnaW4ob3JpZ2luLCB0cmFuc2l0aW9uLCBjYWxsYmFjaykge1xuICAgIGlmIChvcmlnaW4gPT09IG51bGwpIHtcbiAgICAgICAgaWYgKHRoaXMuX2hhc09yaWdpbikge1xuICAgICAgICAgICAgdGhpcy5fbW9kaWZpZXIub3JpZ2luRnJvbShudWxsKTtcbiAgICAgICAgICAgIHRoaXMuX2hhc09yaWdpbiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBlbHNlIGlmICghdGhpcy5faGFzT3JpZ2luKSB7XG4gICAgICAgIHRoaXMuX2hhc09yaWdpbiA9IHRydWU7XG4gICAgICAgIHRoaXMuX21vZGlmaWVyLm9yaWdpbkZyb20odGhpcy5fb3JpZ2luU3RhdGUpO1xuICAgIH1cbiAgICB0aGlzLl9vcmlnaW5TdGF0ZS5zZXQob3JpZ2luLCB0cmFuc2l0aW9uLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgYWxpZ25tZW50IG9mIHRoaXMgbW9kaWZpZXIsIGVpdGhlciBzdGF0aWNhbGx5IG9yXG4gKiAgIHRocm91Z2ggYSBwcm92aWRlZCBUcmFuc2l0aW9uYWJsZS5cbiAqXG4gKiBAbWV0aG9kIHNldEFsaWduXG4gKlxuICogQHBhcmFtIHtBcnJheS5OdW1iZXJ9IGFsaWduIHR3byBlbGVtZW50IGFycmF5IHdpdGggdmFsdWVzIGJldHdlZW4gMCBhbmQgMS5cbiAqIEBwYXJhbSB7VHJhbnNpdGlvbmFibGV9IHRyYW5zaXRpb24gVmFsaWQgdHJhbnNpdGlvbmFibGUgb2JqZWN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBjYWxsYmFjayB0byBjYWxsIGFmdGVyIHRyYW5zaXRpb24gY29tcGxldGVzXG4gKiBAcmV0dXJuIHtTdGF0ZU1vZGlmaWVyfSB0aGlzXG4gKi9cblN0YXRlTW9kaWZpZXIucHJvdG90eXBlLnNldEFsaWduID0gZnVuY3Rpb24gc2V0T3JpZ2luKGFsaWduLCB0cmFuc2l0aW9uLCBjYWxsYmFjaykge1xuICAgIGlmIChhbGlnbiA9PT0gbnVsbCkge1xuICAgICAgICBpZiAodGhpcy5faGFzQWxpZ24pIHtcbiAgICAgICAgICAgIHRoaXMuX21vZGlmaWVyLmFsaWduRnJvbShudWxsKTtcbiAgICAgICAgICAgIHRoaXMuX2hhc0FsaWduID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIGVsc2UgaWYgKCF0aGlzLl9oYXNBbGlnbikge1xuICAgICAgICB0aGlzLl9oYXNBbGlnbiA9IHRydWU7XG4gICAgICAgIHRoaXMuX21vZGlmaWVyLmFsaWduRnJvbSh0aGlzLl9hbGlnblN0YXRlKTtcbiAgICB9XG4gICAgdGhpcy5fYWxpZ25TdGF0ZS5zZXQoYWxpZ24sIHRyYW5zaXRpb24sIGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBzaXplIG9mIHRoaXMgbW9kaWZpZXIsIGVpdGhlciBzdGF0aWNhbGx5IG9yXG4gKiAgIHRocm91Z2ggYSBwcm92aWRlZCBUcmFuc2l0aW9uYWJsZS5cbiAqXG4gKiBAbWV0aG9kIHNldFNpemVcbiAqXG4gKiBAcGFyYW0ge0FycmF5Lk51bWJlcn0gc2l6ZSB0d28gZWxlbWVudCBhcnJheSB3aXRoIHZhbHVlcyBiZXR3ZWVuIDAgYW5kIDEuXG4gKiBAcGFyYW0ge1RyYW5zaXRpb25hYmxlfSB0cmFuc2l0aW9uIFZhbGlkIHRyYW5zaXRpb25hYmxlIG9iamVjdFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgY2FsbGJhY2sgdG8gY2FsbCBhZnRlciB0cmFuc2l0aW9uIGNvbXBsZXRlc1xuICogQHJldHVybiB7U3RhdGVNb2RpZmllcn0gdGhpc1xuICovXG5TdGF0ZU1vZGlmaWVyLnByb3RvdHlwZS5zZXRTaXplID0gZnVuY3Rpb24gc2V0U2l6ZShzaXplLCB0cmFuc2l0aW9uLCBjYWxsYmFjaykge1xuICAgIGlmIChzaXplID09PSBudWxsKSB7XG4gICAgICAgIGlmICh0aGlzLl9oYXNTaXplKSB7XG4gICAgICAgICAgICB0aGlzLl9tb2RpZmllci5zaXplRnJvbShudWxsKTtcbiAgICAgICAgICAgIHRoaXMuX2hhc1NpemUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgZWxzZSBpZiAoIXRoaXMuX2hhc1NpemUpIHtcbiAgICAgICAgdGhpcy5faGFzU2l6ZSA9IHRydWU7XG4gICAgICAgIHRoaXMuX21vZGlmaWVyLnNpemVGcm9tKHRoaXMuX3NpemVTdGF0ZSk7XG4gICAgfVxuICAgIHRoaXMuX3NpemVTdGF0ZS5zZXQoc2l6ZSwgdHJhbnNpdGlvbiwgY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTdG9wIHRoZSB0cmFuc2l0aW9uLlxuICpcbiAqIEBtZXRob2QgaGFsdFxuICovXG5TdGF0ZU1vZGlmaWVyLnByb3RvdHlwZS5oYWx0ID0gZnVuY3Rpb24gaGFsdCgpIHtcbiAgICB0aGlzLl90cmFuc2Zvcm1TdGF0ZS5oYWx0KCk7XG4gICAgdGhpcy5fb3BhY2l0eVN0YXRlLmhhbHQoKTtcbiAgICB0aGlzLl9vcmlnaW5TdGF0ZS5oYWx0KCk7XG4gICAgdGhpcy5fYWxpZ25TdGF0ZS5oYWx0KCk7XG4gICAgdGhpcy5fc2l6ZVN0YXRlLmhhbHQoKTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSB0cmFuc2Zvcm0gbWF0cml4IGNvbXBvbmVudC5cbiAqXG4gKiBAbWV0aG9kIGdldFRyYW5zZm9ybVxuICogQHJldHVybiB7T2JqZWN0fSB0cmFuc2Zvcm0gcHJvdmlkZXIgb2JqZWN0XG4gKi9cblN0YXRlTW9kaWZpZXIucHJvdG90eXBlLmdldFRyYW5zZm9ybSA9IGZ1bmN0aW9uIGdldFRyYW5zZm9ybSgpIHtcbiAgICByZXR1cm4gdGhpcy5fdHJhbnNmb3JtU3RhdGUuZ2V0KCk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgZGVzdGluYXRpb24gc3RhdGUgb2YgdGhlIHRyYW5zZm9ybSBjb21wb25lbnQuXG4gKlxuICogQG1ldGhvZCBnZXRGaW5hbFRyYW5zZm9ybVxuICogQHJldHVybiB7VHJhbnNmb3JtfSB0cmFuc2Zvcm0gbWF0cml4XG4gKi9cblN0YXRlTW9kaWZpZXIucHJvdG90eXBlLmdldEZpbmFsVHJhbnNmb3JtID0gZnVuY3Rpb24gZ2V0RmluYWxUcmFuc2Zvcm0oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RyYW5zZm9ybVN0YXRlLmdldEZpbmFsKCk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgb3BhY2l0eSBjb21wb25lbnQuXG4gKlxuICogQG1ldGhvZCBnZXRPcGFjaXR5XG4gKiBAcmV0dXJuIHtPYmplY3R9IG9wYWNpdHkgcHJvdmlkZXIgb2JqZWN0XG4gKi9cblN0YXRlTW9kaWZpZXIucHJvdG90eXBlLmdldE9wYWNpdHkgPSBmdW5jdGlvbiBnZXRPcGFjaXR5KCkge1xuICAgIHJldHVybiB0aGlzLl9vcGFjaXR5U3RhdGUuZ2V0KCk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgb3JpZ2luIGNvbXBvbmVudC5cbiAqXG4gKiBAbWV0aG9kIGdldE9yaWdpblxuICogQHJldHVybiB7T2JqZWN0fSBvcmlnaW4gcHJvdmlkZXIgb2JqZWN0XG4gKi9cblN0YXRlTW9kaWZpZXIucHJvdG90eXBlLmdldE9yaWdpbiA9IGZ1bmN0aW9uIGdldE9yaWdpbigpIHtcbiAgICByZXR1cm4gdGhpcy5faGFzT3JpZ2luID8gdGhpcy5fb3JpZ2luU3RhdGUuZ2V0KCkgOiBudWxsO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIGFsaWduIGNvbXBvbmVudC5cbiAqXG4gKiBAbWV0aG9kIGdldEFsaWduXG4gKiBAcmV0dXJuIHtPYmplY3R9IGFsaWduIHByb3ZpZGVyIG9iamVjdFxuICovXG5TdGF0ZU1vZGlmaWVyLnByb3RvdHlwZS5nZXRBbGlnbiA9IGZ1bmN0aW9uIGdldEFsaWduKCkge1xuICAgIHJldHVybiB0aGlzLl9oYXNBbGlnbiA/IHRoaXMuX2FsaWduU3RhdGUuZ2V0KCkgOiBudWxsO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIHNpemUgY29tcG9uZW50LlxuICpcbiAqIEBtZXRob2QgZ2V0U2l6ZVxuICogQHJldHVybiB7T2JqZWN0fSBzaXplIHByb3ZpZGVyIG9iamVjdFxuICovXG5TdGF0ZU1vZGlmaWVyLnByb3RvdHlwZS5nZXRTaXplID0gZnVuY3Rpb24gZ2V0U2l6ZSgpIHtcbiAgICByZXR1cm4gdGhpcy5faGFzU2l6ZSA/IHRoaXMuX3NpemVTdGF0ZS5nZXQoKSA6IG51bGw7XG59O1xuXG4vKipcbiAqIFJldHVybiByZW5kZXIgc3BlYyBmb3IgdGhpcyBTdGF0ZU1vZGlmaWVyLCBhcHBseWluZyB0byB0aGUgcHJvdmlkZWRcbiAqICAgIHRhcmdldCBjb21wb25lbnQuICBUaGlzIGlzIHNpbWlsYXIgdG8gcmVuZGVyKCkgZm9yIFN1cmZhY2VzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbWV0aG9kIG1vZGlmeVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB0YXJnZXQgKGFscmVhZHkgcmVuZGVyZWQpIHJlbmRlciBzcGVjIHRvXG4gKiAgICB3aGljaCB0byBhcHBseSB0aGUgdHJhbnNmb3JtLlxuICogQHJldHVybiB7T2JqZWN0fSByZW5kZXIgc3BlYyBmb3IgdGhpcyBTdGF0ZU1vZGlmaWVyLCBpbmNsdWRpbmcgdGhlXG4gKiAgICBwcm92aWRlZCB0YXJnZXRcbiAqL1xuU3RhdGVNb2RpZmllci5wcm90b3R5cGUubW9kaWZ5ID0gZnVuY3Rpb24gbW9kaWZ5KHRhcmdldCkge1xuICAgIHJldHVybiB0aGlzLl9tb2RpZmllci5tb2RpZnkodGFyZ2V0KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RhdGVNb2RpZmllcjtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9tb2RpZmllcnMvU3RhdGVNb2RpZmllci5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvbW9kaWZpZXJzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xudmFyIEV2ZW50SGFuZGxlciA9IHJlcXVpcmUoJy4uL2NvcmUvRXZlbnRIYW5kbGVyJyk7XG5cbi8qKlxuICogVGhlIFBoeXNpY3MgRW5naW5lIGlzIHJlc3BvbnNpYmxlIGZvciBtZWRpYXRpbmcgQm9kaWVzIGFuZCB0aGVpclxuICogaW50ZXJhY3Rpb24gd2l0aCBmb3JjZXMgYW5kIGNvbnN0cmFpbnRzLiBUaGUgUGh5c2ljcyBFbmdpbmUgaGFuZGxlcyB0aGVcbiAqIGxvZ2ljIG9mIGFkZGluZyBhbmQgcmVtb3ZpbmcgYm9kaWVzLCB1cGRhdGluZyB0aGVpciBzdGF0ZSBvZiB0aGUgb3ZlclxuICogdGltZS5cbiAqXG4gKiBAY2xhc3MgUGh5c2ljc0VuZ2luZVxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0gb3B0aW9ucyB7T2JqZWN0fSBvcHRpb25zXG4gKi9cbmZ1bmN0aW9uIFBoeXNpY3NFbmdpbmUob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IE9iamVjdC5jcmVhdGUoUGh5c2ljc0VuZ2luZS5ERUZBVUxUX09QVElPTlMpO1xuICAgIGlmIChvcHRpb25zKSB0aGlzLnNldE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICB0aGlzLl9wYXJ0aWNsZXMgICAgICA9IFtdOyAgIC8vbGlzdCBvZiBtYW5hZ2VkIHBhcnRpY2xlc1xuICAgIHRoaXMuX2JvZGllcyAgICAgICAgID0gW107ICAgLy9saXN0IG9mIG1hbmFnZWQgYm9kaWVzXG4gICAgdGhpcy5fYWdlbnRzICAgICAgICAgPSB7fTsgICAvL2hhc2ggb2YgbWFuYWdlZCBhZ2VudHNcbiAgICB0aGlzLl9mb3JjZXMgICAgICAgICA9IFtdOyAgIC8vbGlzdCBvZiBJRHMgb2YgYWdlbnRzIHRoYXQgYXJlIGZvcmNlc1xuICAgIHRoaXMuX2NvbnN0cmFpbnRzICAgID0gW107ICAgLy9saXN0IG9mIElEcyBvZiBhZ2VudHMgdGhhdCBhcmUgY29uc3RyYWludHNcblxuICAgIHRoaXMuX2J1ZmZlciAgICAgICAgID0gMC4wO1xuICAgIHRoaXMuX3ByZXZUaW1lICAgICAgID0gbm93KCk7XG4gICAgdGhpcy5faXNTbGVlcGluZyAgICAgPSBmYWxzZTtcbiAgICB0aGlzLl9ldmVudEhhbmRsZXIgICA9IG51bGw7XG4gICAgdGhpcy5fY3VyckFnZW50SWQgICAgPSAwO1xuICAgIHRoaXMuX2hhc0JvZGllcyAgICAgID0gZmFsc2U7XG59XG5cbnZhciBUSU1FU1RFUCA9IDE3O1xudmFyIE1JTl9USU1FX1NURVAgPSAxMDAwIC8gMTIwO1xudmFyIE1BWF9USU1FX1NURVAgPSAxNztcblxuLyoqXG4gKiBAcHJvcGVydHkgUGh5c2ljc0VuZ2luZS5ERUZBVUxUX09QVElPTlNcbiAqIEB0eXBlIE9iamVjdFxuICogQHByb3RlY3RlZFxuICogQHN0YXRpY1xuICovXG5QaHlzaWNzRW5naW5lLkRFRkFVTFRfT1BUSU9OUyA9IHtcblxuICAgIC8qKlxuICAgICAqIFRoZSBudW1iZXIgb2YgaXRlcmF0aW9ucyB0aGUgZW5naW5lIHRha2VzIHRvIHJlc29sdmUgY29uc3RyYWludHNcbiAgICAgKiBAYXR0cmlidXRlIGNvbnN0cmFpbnRTdGVwc1xuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIGNvbnN0cmFpbnRTdGVwcyA6IDEsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZW5lcmd5IHRocmVzaG9sZCBiZWZvcmUgdGhlIEVuZ2luZSBzdG9wcyB1cGRhdGluZ1xuICAgICAqIEBhdHRyaWJ1dGUgc2xlZXBUb2xlcmFuY2VcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICBzbGVlcFRvbGVyYW5jZSAgOiAxZS03XG59O1xuXG52YXIgbm93ID0gKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBEYXRlLm5vdztcbn0pKCk7XG5cbi8qKlxuICogT3B0aW9ucyBzZXR0ZXJcbiAqIEBtZXRob2Qgc2V0T3B0aW9uc1xuICogQHBhcmFtIG9wdGlvbnMge09iamVjdH1cbiAqL1xuUGh5c2ljc0VuZ2luZS5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIHNldE9wdGlvbnMob3B0cykge1xuICAgIGZvciAodmFyIGtleSBpbiBvcHRzKSBpZiAodGhpcy5vcHRpb25zW2tleV0pIHRoaXMub3B0aW9uc1trZXldID0gb3B0c1trZXldO1xufTtcblxuLyoqXG4gKiBNZXRob2QgdG8gYWRkIGEgcGh5c2ljcyBib2R5IHRvIHRoZSBlbmdpbmUuIE5lY2Vzc2FyeSB0byB1cGRhdGUgdGhlXG4gKiBib2R5IG92ZXIgdGltZS5cbiAqXG4gKiBAbWV0aG9kIGFkZEJvZHlcbiAqIEBwYXJhbSBib2R5IHtCb2R5fVxuICogQHJldHVybiBib2R5IHtCb2R5fVxuICovXG5QaHlzaWNzRW5naW5lLnByb3RvdHlwZS5hZGRCb2R5ID0gZnVuY3Rpb24gYWRkQm9keShib2R5KSB7XG4gICAgYm9keS5fZW5naW5lID0gdGhpcztcbiAgICBpZiAoYm9keS5pc0JvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9kaWVzLnB1c2goYm9keSk7XG4gICAgICAgIHRoaXMuX2hhc0JvZGllcyA9IHRydWU7XG4gICAgfVxuICAgIGVsc2UgdGhpcy5fcGFydGljbGVzLnB1c2goYm9keSk7XG4gICAgcmV0dXJuIGJvZHk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhIGJvZHkgZnJvbSB0aGUgZW5naW5lLiBEZXRhY2hlcyBib2R5IGZyb20gYWxsIGZvcmNlcyBhbmRcbiAqIGNvbnN0cmFpbnRzLlxuICpcbiAqIEBtZXRob2QgcmVtb3ZlQm9keVxuICogQHBhcmFtIGJvZHkge0JvZHl9XG4gKi9cblBoeXNpY3NFbmdpbmUucHJvdG90eXBlLnJlbW92ZUJvZHkgPSBmdW5jdGlvbiByZW1vdmVCb2R5KGJvZHkpIHtcbiAgICB2YXIgYXJyYXkgPSAoYm9keS5pc0JvZHkpID8gdGhpcy5fYm9kaWVzIDogdGhpcy5fcGFydGljbGVzO1xuICAgIHZhciBpbmRleCA9IGFycmF5LmluZGV4T2YoYm9keSk7XG4gICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBPYmplY3Qua2V5cyh0aGlzLl9hZ2VudHMpLmxlbmd0aDsgaSsrKSB0aGlzLmRldGFjaEZyb20oaSwgYm9keSk7XG4gICAgICAgIGFycmF5LnNwbGljZShpbmRleCwxKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZ2V0Qm9kaWVzKCkubGVuZ3RoID09PSAwKSB0aGlzLl9oYXNCb2RpZXMgPSBmYWxzZTtcbn07XG5cbmZ1bmN0aW9uIF9tYXBBZ2VudEFycmF5KGFnZW50KSB7XG4gICAgaWYgKGFnZW50LmFwcGx5Rm9yY2UpICAgICAgcmV0dXJuIHRoaXMuX2ZvcmNlcztcbiAgICBpZiAoYWdlbnQuYXBwbHlDb25zdHJhaW50KSByZXR1cm4gdGhpcy5fY29uc3RyYWludHM7XG59XG5cbmZ1bmN0aW9uIF9hdHRhY2hPbmUoYWdlbnQsIHRhcmdldHMsIHNvdXJjZSkge1xuICAgIGlmICh0YXJnZXRzID09PSB1bmRlZmluZWQpIHRhcmdldHMgPSB0aGlzLmdldFBhcnRpY2xlc0FuZEJvZGllcygpO1xuICAgIGlmICghKHRhcmdldHMgaW5zdGFuY2VvZiBBcnJheSkpIHRhcmdldHMgPSBbdGFyZ2V0c107XG5cbiAgICB0aGlzLl9hZ2VudHNbdGhpcy5fY3VyckFnZW50SWRdID0ge1xuICAgICAgICBhZ2VudCAgIDogYWdlbnQsXG4gICAgICAgIHRhcmdldHMgOiB0YXJnZXRzLFxuICAgICAgICBzb3VyY2UgIDogc291cmNlXG4gICAgfTtcblxuICAgIF9tYXBBZ2VudEFycmF5LmNhbGwodGhpcywgYWdlbnQpLnB1c2godGhpcy5fY3VyckFnZW50SWQpO1xuICAgIHJldHVybiB0aGlzLl9jdXJyQWdlbnRJZCsrO1xufVxuXG4vKipcbiAqIEF0dGFjaGVzIGEgZm9yY2Ugb3IgY29uc3RyYWludCB0byBhIEJvZHkuIFJldHVybnMgYW4gQWdlbnRJZCBvZiB0aGVcbiAqIGF0dGFjaGVkIGFnZW50IHdoaWNoIGNhbiBiZSB1c2VkIHRvIGRldGFjaCB0aGUgYWdlbnQuXG4gKlxuICogQG1ldGhvZCBhdHRhY2hcbiAqIEBwYXJhbSBhZ2VudCB7QWdlbnR8QXJyYXkuQWdlbnR9IEEgZm9yY2UsIGNvbnN0cmFpbnQsIG9yIGFycmF5IG9mIHRoZW0uXG4gKiBAcGFyYW0gW3RhcmdldHM9QWxsXSB7Qm9keXxBcnJheS5Cb2R5fSBUaGUgQm9keSBvciBCb2RpZXMgYWZmZWN0ZWQgYnkgdGhlIGFnZW50XG4gKiBAcGFyYW0gW3NvdXJjZV0ge0JvZHl9IFRoZSBzb3VyY2Ugb2YgdGhlIGFnZW50XG4gKiBAcmV0dXJuIEFnZW50SWQge051bWJlcn1cbiAqL1xuUGh5c2ljc0VuZ2luZS5wcm90b3R5cGUuYXR0YWNoID0gZnVuY3Rpb24gYXR0YWNoKGFnZW50cywgdGFyZ2V0cywgc291cmNlKSB7XG4gICAgaWYgKGFnZW50cyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIHZhciBhZ2VudElEcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFnZW50cy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIGFnZW50SURzW2ldID0gX2F0dGFjaE9uZS5jYWxsKHRoaXMsIGFnZW50c1tpXSwgdGFyZ2V0cywgc291cmNlKTtcbiAgICAgICAgcmV0dXJuIGFnZW50SURzO1xuICAgIH1cbiAgICBlbHNlIHJldHVybiBfYXR0YWNoT25lLmNhbGwodGhpcywgYWdlbnRzLCB0YXJnZXRzLCBzb3VyY2UpO1xufTtcblxuLyoqXG4gKiBBcHBlbmQgYSBib2R5IHRvIHRoZSB0YXJnZXRzIG9mIGEgcHJldmlvdXNseSBkZWZpbmVkIHBoeXNpY3MgYWdlbnQuXG4gKlxuICogQG1ldGhvZCBhdHRhY2hUb1xuICogQHBhcmFtIGFnZW50SUQge0FnZW50SWR9IFRoZSBhZ2VudElkIG9mIGEgcHJldmlvdXNseSBkZWZpbmVkIGFnZW50XG4gKiBAcGFyYW0gdGFyZ2V0IHtCb2R5fSBUaGUgQm9keSBhZmZlY3RlZCBieSB0aGUgYWdlbnRcbiAqL1xuUGh5c2ljc0VuZ2luZS5wcm90b3R5cGUuYXR0YWNoVG8gPSBmdW5jdGlvbiBhdHRhY2hUbyhhZ2VudElELCB0YXJnZXQpIHtcbiAgICBfZ2V0Qm91bmRBZ2VudC5jYWxsKHRoaXMsIGFnZW50SUQpLnRhcmdldHMucHVzaCh0YXJnZXQpO1xufTtcblxuLyoqXG4gKiBVbmRvZXMgUGh5c2ljc0VuZ2luZS5hdHRhY2guIFJlbW92ZXMgYW4gYWdlbnQgYW5kIGl0cyBhc3NvY2lhdGVkXG4gKiBlZmZlY3Qgb24gaXRzIGFmZmVjdGVkIEJvZGllcy5cbiAqXG4gKiBAbWV0aG9kIGRldGFjaFxuICogQHBhcmFtIGFnZW50SUQge0FnZW50SWR9IFRoZSBhZ2VudElkIG9mIGEgcHJldmlvdXNseSBkZWZpbmVkIGFnZW50XG4gKi9cblBoeXNpY3NFbmdpbmUucHJvdG90eXBlLmRldGFjaCA9IGZ1bmN0aW9uIGRldGFjaChpZCkge1xuICAgIC8vIGRldGFjaCBmcm9tIGZvcmNlcy9jb25zdHJhaW50cyBhcnJheVxuICAgIHZhciBhZ2VudCA9IHRoaXMuZ2V0QWdlbnQoaWQpO1xuICAgIHZhciBhZ2VudEFycmF5ID0gX21hcEFnZW50QXJyYXkuY2FsbCh0aGlzLCBhZ2VudCk7XG4gICAgdmFyIGluZGV4ID0gYWdlbnRBcnJheS5pbmRleE9mKGlkKTtcbiAgICBhZ2VudEFycmF5LnNwbGljZShpbmRleCwxKTtcblxuICAgIC8vIGRldGFjaCBhZ2VudHMgYXJyYXlcbiAgICBkZWxldGUgdGhpcy5fYWdlbnRzW2lkXTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGEgc2luZ2xlIEJvZHkgZnJvbSBhIHByZXZpb3VzbHkgZGVmaW5lZCBhZ2VudC5cbiAqXG4gKiBAbWV0aG9kIGRldGFjaFxuICogQHBhcmFtIGFnZW50SUQge0FnZW50SWR9IFRoZSBhZ2VudElkIG9mIGEgcHJldmlvdXNseSBkZWZpbmVkIGFnZW50XG4gKiBAcGFyYW0gdGFyZ2V0IHtCb2R5fSBUaGUgYm9keSB0byByZW1vdmUgZnJvbSB0aGUgYWdlbnRcbiAqL1xuUGh5c2ljc0VuZ2luZS5wcm90b3R5cGUuZGV0YWNoRnJvbSA9IGZ1bmN0aW9uIGRldGFjaEZyb20oaWQsIHRhcmdldCkge1xuICAgIHZhciBib3VuZEFnZW50ID0gX2dldEJvdW5kQWdlbnQuY2FsbCh0aGlzLCBpZCk7XG4gICAgaWYgKGJvdW5kQWdlbnQuc291cmNlID09PSB0YXJnZXQpIHRoaXMuZGV0YWNoKGlkKTtcbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIHRhcmdldHMgPSBib3VuZEFnZW50LnRhcmdldHM7XG4gICAgICAgIHZhciBpbmRleCA9IHRhcmdldHMuaW5kZXhPZih0YXJnZXQpO1xuICAgICAgICBpZiAoaW5kZXggPiAtMSkgdGFyZ2V0cy5zcGxpY2UoaW5kZXgsMSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBBIGNvbnZlbmllbmNlIG1ldGhvZCB0byBnaXZlIHRoZSBQaHlzaWNzIEVuZ2luZSBhIGNsZWFuIHNsYXRlIG9mXG4gKiBhZ2VudHMuIFByZXNlcnZlcyBhbGwgYWRkZWQgQm9keSBvYmplY3RzLlxuICpcbiAqIEBtZXRob2QgZGV0YWNoQWxsXG4gKi9cblBoeXNpY3NFbmdpbmUucHJvdG90eXBlLmRldGFjaEFsbCA9IGZ1bmN0aW9uIGRldGFjaEFsbCgpIHtcbiAgICB0aGlzLl9hZ2VudHMgICAgICAgID0ge307XG4gICAgdGhpcy5fZm9yY2VzICAgICAgICA9IFtdO1xuICAgIHRoaXMuX2NvbnN0cmFpbnRzICAgPSBbXTtcbiAgICB0aGlzLl9jdXJyQWdlbnRJZCAgID0gMDtcbn07XG5cbmZ1bmN0aW9uIF9nZXRCb3VuZEFnZW50KGlkKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FnZW50c1tpZF07XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgY29ycmVzcG9uZGluZyBhZ2VudCBnaXZlbiBpdHMgYWdlbnRJZC5cbiAqXG4gKiBAbWV0aG9kIGdldEFnZW50XG4gKiBAcGFyYW0gaWQge0FnZW50SWR9XG4gKi9cblBoeXNpY3NFbmdpbmUucHJvdG90eXBlLmdldEFnZW50ID0gZnVuY3Rpb24gZ2V0QWdlbnQoaWQpIHtcbiAgICByZXR1cm4gX2dldEJvdW5kQWdlbnQuY2FsbCh0aGlzLCBpZCkuYWdlbnQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYWxsIHBhcnRpY2xlcyB0aGF0IGFyZSBjdXJyZW50bHkgbWFuYWdlZCBieSB0aGUgUGh5c2ljcyBFbmdpbmUuXG4gKlxuICogQG1ldGhvZCBnZXRQYXJ0aWNsZXNcbiAqIEByZXR1cm4gcGFydGljbGVzIHtBcnJheS5QYXJ0aWNsZXN9XG4gKi9cblBoeXNpY3NFbmdpbmUucHJvdG90eXBlLmdldFBhcnRpY2xlcyA9IGZ1bmN0aW9uIGdldFBhcnRpY2xlcygpIHtcbiAgICByZXR1cm4gdGhpcy5fcGFydGljbGVzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFsbCBib2RpZXMsIGV4Y2VwdCBwYXJ0aWNsZXMsIHRoYXQgYXJlIGN1cnJlbnRseSBtYW5hZ2VkIGJ5IHRoZSBQaHlzaWNzIEVuZ2luZS5cbiAqXG4gKiBAbWV0aG9kIGdldEJvZGllc1xuICogQHJldHVybiBib2RpZXMge0FycmF5LkJvZGllc31cbiAqL1xuUGh5c2ljc0VuZ2luZS5wcm90b3R5cGUuZ2V0Qm9kaWVzID0gZnVuY3Rpb24gZ2V0Qm9kaWVzKCkge1xuICAgIHJldHVybiB0aGlzLl9ib2RpZXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYWxsIGJvZGllcyB0aGF0IGFyZSBjdXJyZW50bHkgbWFuYWdlZCBieSB0aGUgUGh5c2ljcyBFbmdpbmUuXG4gKlxuICogQG1ldGhvZCBnZXRCb2RpZXNcbiAqIEByZXR1cm4gYm9kaWVzIHtBcnJheS5Cb2RpZXN9XG4gKi9cblBoeXNpY3NFbmdpbmUucHJvdG90eXBlLmdldFBhcnRpY2xlc0FuZEJvZGllcyA9IGZ1bmN0aW9uIGdldFBhcnRpY2xlc0FuZEJvZGllcygpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRQYXJ0aWNsZXMoKS5jb25jYXQodGhpcy5nZXRCb2RpZXMoKSk7XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIG92ZXIgZXZlcnkgUGFydGljbGUgYW5kIGFwcGxpZXMgYSBmdW5jdGlvbiB3aG9zZSBmaXJzdFxuICogYXJndW1lbnQgaXMgdGhlIFBhcnRpY2xlXG4gKlxuICogQG1ldGhvZCBmb3JFYWNoUGFydGljbGVcbiAqIEBwYXJhbSBmbiB7RnVuY3Rpb259IEZ1bmN0aW9uIHRvIGl0ZXJhdGUgb3ZlclxuICogQHBhcmFtIFtkdF0ge051bWJlcn0gRGVsdGEgdGltZVxuICovXG5QaHlzaWNzRW5naW5lLnByb3RvdHlwZS5mb3JFYWNoUGFydGljbGUgPSBmdW5jdGlvbiBmb3JFYWNoUGFydGljbGUoZm4sIGR0KSB7XG4gICAgdmFyIHBhcnRpY2xlcyA9IHRoaXMuZ2V0UGFydGljbGVzKCk7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwLCBsZW4gPSBwYXJ0aWNsZXMubGVuZ3RoOyBpbmRleCA8IGxlbjsgaW5kZXgrKylcbiAgICAgICAgZm4uY2FsbCh0aGlzLCBwYXJ0aWNsZXNbaW5kZXhdLCBkdCk7XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIG92ZXIgZXZlcnkgQm9keSB0aGF0IGlzbid0IGEgUGFydGljbGUgYW5kIGFwcGxpZXNcbiAqIGEgZnVuY3Rpb24gd2hvc2UgZmlyc3QgYXJndW1lbnQgaXMgdGhlIEJvZHlcbiAqXG4gKiBAbWV0aG9kIGZvckVhY2hCb2R5XG4gKiBAcGFyYW0gZm4ge0Z1bmN0aW9ufSBGdW5jdGlvbiB0byBpdGVyYXRlIG92ZXJcbiAqIEBwYXJhbSBbZHRdIHtOdW1iZXJ9IERlbHRhIHRpbWVcbiAqL1xuUGh5c2ljc0VuZ2luZS5wcm90b3R5cGUuZm9yRWFjaEJvZHkgPSBmdW5jdGlvbiBmb3JFYWNoQm9keShmbiwgZHQpIHtcbiAgICBpZiAoIXRoaXMuX2hhc0JvZGllcykgcmV0dXJuO1xuICAgIHZhciBib2RpZXMgPSB0aGlzLmdldEJvZGllcygpO1xuICAgIGZvciAodmFyIGluZGV4ID0gMCwgbGVuID0gYm9kaWVzLmxlbmd0aDsgaW5kZXggPCBsZW47IGluZGV4KyspXG4gICAgICAgIGZuLmNhbGwodGhpcywgYm9kaWVzW2luZGV4XSwgZHQpO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyBvdmVyIGV2ZXJ5IEJvZHkgYW5kIGFwcGxpZXMgYSBmdW5jdGlvbiB3aG9zZSBmaXJzdFxuICogYXJndW1lbnQgaXMgdGhlIEJvZHlcbiAqXG4gKiBAbWV0aG9kIGZvckVhY2hcbiAqIEBwYXJhbSBmbiB7RnVuY3Rpb259IEZ1bmN0aW9uIHRvIGl0ZXJhdGUgb3ZlclxuICogQHBhcmFtIFtkdF0ge051bWJlcn0gRGVsdGEgdGltZVxuICovXG5QaHlzaWNzRW5naW5lLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gZm9yRWFjaChmbiwgZHQpIHtcbiAgICB0aGlzLmZvckVhY2hQYXJ0aWNsZShmbiwgZHQpO1xuICAgIHRoaXMuZm9yRWFjaEJvZHkoZm4sIGR0KTtcbn07XG5cbmZ1bmN0aW9uIF91cGRhdGVGb3JjZShpbmRleCkge1xuICAgIHZhciBib3VuZEFnZW50ID0gX2dldEJvdW5kQWdlbnQuY2FsbCh0aGlzLCB0aGlzLl9mb3JjZXNbaW5kZXhdKTtcbiAgICBib3VuZEFnZW50LmFnZW50LmFwcGx5Rm9yY2UoYm91bmRBZ2VudC50YXJnZXRzLCBib3VuZEFnZW50LnNvdXJjZSk7XG59XG5cbmZ1bmN0aW9uIF91cGRhdGVGb3JjZXMoKSB7XG4gICAgZm9yICh2YXIgaW5kZXggPSB0aGlzLl9mb3JjZXMubGVuZ3RoIC0gMTsgaW5kZXggPiAtMTsgaW5kZXgtLSlcbiAgICAgICAgX3VwZGF0ZUZvcmNlLmNhbGwodGhpcywgaW5kZXgpO1xufVxuXG5mdW5jdGlvbiBfdXBkYXRlQ29uc3RyYWludChpbmRleCwgZHQpIHtcbiAgICB2YXIgYm91bmRBZ2VudCA9IHRoaXMuX2FnZW50c1t0aGlzLl9jb25zdHJhaW50c1tpbmRleF1dO1xuICAgIHJldHVybiBib3VuZEFnZW50LmFnZW50LmFwcGx5Q29uc3RyYWludChib3VuZEFnZW50LnRhcmdldHMsIGJvdW5kQWdlbnQuc291cmNlLCBkdCk7XG59XG5cbmZ1bmN0aW9uIF91cGRhdGVDb25zdHJhaW50cyhkdCkge1xuICAgIHZhciBpdGVyYXRpb24gPSAwO1xuICAgIHdoaWxlIChpdGVyYXRpb24gPCB0aGlzLm9wdGlvbnMuY29uc3RyYWludFN0ZXBzKSB7XG4gICAgICAgIGZvciAodmFyIGluZGV4ID0gdGhpcy5fY29uc3RyYWludHMubGVuZ3RoIC0gMTsgaW5kZXggPiAtMTsgaW5kZXgtLSlcbiAgICAgICAgICAgIF91cGRhdGVDb25zdHJhaW50LmNhbGwodGhpcywgaW5kZXgsIGR0KTtcbiAgICAgICAgaXRlcmF0aW9uKys7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBfdXBkYXRlVmVsb2NpdGllcyhwYXJ0aWNsZSwgZHQpIHtcbiAgICBwYXJ0aWNsZS5pbnRlZ3JhdGVWZWxvY2l0eShkdCk7XG59XG5cbmZ1bmN0aW9uIF91cGRhdGVBbmd1bGFyVmVsb2NpdGllcyhib2R5LCBkdCkge1xuICAgIGJvZHkuaW50ZWdyYXRlQW5ndWxhck1vbWVudHVtKGR0KTtcbiAgICBib2R5LnVwZGF0ZUFuZ3VsYXJWZWxvY2l0eSgpO1xufVxuXG5mdW5jdGlvbiBfdXBkYXRlT3JpZW50YXRpb25zKGJvZHksIGR0KSB7XG4gICAgYm9keS5pbnRlZ3JhdGVPcmllbnRhdGlvbihkdCk7XG59XG5cbmZ1bmN0aW9uIF91cGRhdGVQb3NpdGlvbnMocGFydGljbGUsIGR0KSB7XG4gICAgcGFydGljbGUuaW50ZWdyYXRlUG9zaXRpb24oZHQpO1xuICAgIHBhcnRpY2xlLmVtaXQoJ3VwZGF0ZScsIHBhcnRpY2xlKTtcbn1cblxuZnVuY3Rpb24gX2ludGVncmF0ZShkdCkge1xuICAgIF91cGRhdGVGb3JjZXMuY2FsbCh0aGlzLCBkdCk7XG4gICAgdGhpcy5mb3JFYWNoKF91cGRhdGVWZWxvY2l0aWVzLCBkdCk7XG4gICAgdGhpcy5mb3JFYWNoQm9keShfdXBkYXRlQW5ndWxhclZlbG9jaXRpZXMsIGR0KTtcbiAgICBfdXBkYXRlQ29uc3RyYWludHMuY2FsbCh0aGlzLCBkdCk7XG4gICAgdGhpcy5mb3JFYWNoQm9keShfdXBkYXRlT3JpZW50YXRpb25zLCBkdCk7XG4gICAgdGhpcy5mb3JFYWNoKF91cGRhdGVQb3NpdGlvbnMsIGR0KTtcbn1cblxuZnVuY3Rpb24gX2dldEVuZXJneVBhcnRpY2xlcygpIHtcbiAgICB2YXIgZW5lcmd5ID0gMC4wO1xuICAgIHZhciBwYXJ0aWNsZUVuZXJneSA9IDAuMDtcbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24ocGFydGljbGUpIHtcbiAgICAgICAgcGFydGljbGVFbmVyZ3kgPSBwYXJ0aWNsZS5nZXRFbmVyZ3koKTtcbiAgICAgICAgZW5lcmd5ICs9IHBhcnRpY2xlRW5lcmd5O1xuICAgICAgICBpZiAocGFydGljbGVFbmVyZ3kgPCBwYXJ0aWNsZS5zbGVlcFRvbGVyYW5jZSkgcGFydGljbGUuc2xlZXAoKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZW5lcmd5O1xufVxuXG5mdW5jdGlvbiBfZ2V0RW5lcmd5Rm9yY2VzKCkge1xuICAgIHZhciBlbmVyZ3kgPSAwO1xuICAgIGZvciAodmFyIGluZGV4ID0gdGhpcy5fZm9yY2VzLmxlbmd0aCAtIDE7IGluZGV4ID4gLTE7IGluZGV4LS0pXG4gICAgICAgIGVuZXJneSArPSB0aGlzLl9mb3JjZXNbaW5kZXhdLmdldEVuZXJneSgpIHx8IDAuMDtcbiAgICByZXR1cm4gZW5lcmd5O1xufVxuXG5mdW5jdGlvbiBfZ2V0RW5lcmd5Q29uc3RyYWludHMoKSB7XG4gICAgdmFyIGVuZXJneSA9IDA7XG4gICAgZm9yICh2YXIgaW5kZXggPSB0aGlzLl9jb25zdHJhaW50cy5sZW5ndGggLSAxOyBpbmRleCA+IC0xOyBpbmRleC0tKVxuICAgICAgICBlbmVyZ3kgKz0gdGhpcy5fY29uc3RyYWludHNbaW5kZXhdLmdldEVuZXJneSgpIHx8IDAuMDtcbiAgICByZXR1cm4gZW5lcmd5O1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZXMgdGhlIGtpbmV0aWMgZW5lcmd5IG9mIGFsbCBCb2R5IG9iamVjdHMgYW5kIHBvdGVudGlhbCBlbmVyZ3lcbiAqIG9mIGFsbCBhdHRhY2hlZCBhZ2VudHMuXG4gKlxuICogVE9ETzogaW1wbGVtZW50LlxuICogQG1ldGhvZCBnZXRFbmVyZ3lcbiAqIEByZXR1cm4gZW5lcmd5IHtOdW1iZXJ9XG4gKi9cblBoeXNpY3NFbmdpbmUucHJvdG90eXBlLmdldEVuZXJneSA9IGZ1bmN0aW9uIGdldEVuZXJneSgpIHtcbiAgICByZXR1cm4gX2dldEVuZXJneVBhcnRpY2xlcy5jYWxsKHRoaXMpICsgX2dldEVuZXJneUZvcmNlcy5jYWxsKHRoaXMpICsgX2dldEVuZXJneUNvbnN0cmFpbnRzLmNhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgYWxsIEJvZHkgb2JqZWN0cyBtYW5hZ2VkIGJ5IHRoZSBwaHlzaWNzIGVuZ2luZSBvdmVyIHRoZVxuICogdGltZSBkdXJhdGlvbiBzaW5jZSB0aGUgbGFzdCB0aW1lIHN0ZXAgd2FzIGNhbGxlZC5cbiAqXG4gKiBAbWV0aG9kIHN0ZXBcbiAqL1xuUGh5c2ljc0VuZ2luZS5wcm90b3R5cGUuc3RlcCA9IGZ1bmN0aW9uIHN0ZXAoKSB7XG4vLyAgICAgICAgaWYgKHRoaXMuZ2V0RW5lcmd5KCkgPCB0aGlzLm9wdGlvbnMuc2xlZXBUb2xlcmFuY2UpIHtcbi8vICAgICAgICAgICAgdGhpcy5zbGVlcCgpO1xuLy8gICAgICAgICAgICByZXR1cm47XG4vLyAgICAgICAgfTtcblxuICAgIC8vc2V0IGN1cnJlbnQgZnJhbWUncyB0aW1lXG4gICAgdmFyIGN1cnJUaW1lID0gbm93KCk7XG5cbiAgICAvL21pbGxpc2Vjb25kcyBlbGFwc2VkIHNpbmNlIGxhc3QgZnJhbWVcbiAgICB2YXIgZHRGcmFtZSA9IGN1cnJUaW1lIC0gdGhpcy5fcHJldlRpbWU7XG5cbiAgICB0aGlzLl9wcmV2VGltZSA9IGN1cnJUaW1lO1xuXG4gICAgaWYgKGR0RnJhbWUgPCBNSU5fVElNRV9TVEVQKSByZXR1cm47XG4gICAgaWYgKGR0RnJhbWUgPiBNQVhfVElNRV9TVEVQKSBkdEZyYW1lID0gTUFYX1RJTUVfU1RFUDtcblxuICAgIC8vcm9idXN0IGludGVncmF0aW9uXG4vLyAgICAgICAgdGhpcy5fYnVmZmVyICs9IGR0RnJhbWU7XG4vLyAgICAgICAgd2hpbGUgKHRoaXMuX2J1ZmZlciA+IHRoaXMuX3RpbWVzdGVwKXtcbi8vICAgICAgICAgICAgX2ludGVncmF0ZS5jYWxsKHRoaXMsIHRoaXMuX3RpbWVzdGVwKTtcbi8vICAgICAgICAgICAgdGhpcy5fYnVmZmVyIC09IHRoaXMuX3RpbWVzdGVwO1xuLy8gICAgICAgIH07XG4vLyAgICAgICAgX2ludGVncmF0ZS5jYWxsKHRoaXMsIHRoaXMuX2J1ZmZlcik7XG4vLyAgICAgICAgdGhpcy5fYnVmZmVyID0gMC4wO1xuICAgIF9pbnRlZ3JhdGUuY2FsbCh0aGlzLCBUSU1FU1RFUCk7XG5cbi8vICAgICAgICB0aGlzLmVtaXQoJ3VwZGF0ZScsIHRoaXMpO1xufTtcblxuLyoqXG4gKiBUZWxscyB3aGV0aGVyIHRoZSBQaHlzaWNzIEVuZ2luZSBpcyBzbGVlcGluZyBvciBhd2FrZS5cbiAqIEBtZXRob2QgaXNTbGVlcGluZ1xuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuUGh5c2ljc0VuZ2luZS5wcm90b3R5cGUuaXNTbGVlcGluZyA9IGZ1bmN0aW9uIGlzU2xlZXBpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzU2xlZXBpbmc7XG59O1xuXG4vKipcbiAqIFN0b3BzIHRoZSBQaHlzaWNzIEVuZ2luZSBmcm9tIHVwZGF0aW5nLiBFbWl0cyBhbiAnZW5kJyBldmVudC5cbiAqIEBtZXRob2Qgc2xlZXBcbiAqL1xuUGh5c2ljc0VuZ2luZS5wcm90b3R5cGUuc2xlZXAgPSBmdW5jdGlvbiBzbGVlcCgpIHtcbiAgICB0aGlzLmVtaXQoJ2VuZCcsIHRoaXMpO1xuICAgIHRoaXMuX2lzU2xlZXBpbmcgPSB0cnVlO1xufTtcblxuLyoqXG4gKiBTdGFydHMgdGhlIFBoeXNpY3MgRW5naW5lIGZyb20gdXBkYXRpbmcuIEVtaXRzIGFuICdzdGFydCcgZXZlbnQuXG4gKiBAbWV0aG9kIHdha2VcbiAqL1xuUGh5c2ljc0VuZ2luZS5wcm90b3R5cGUud2FrZSA9IGZ1bmN0aW9uIHdha2UoKSB7XG4gICAgdGhpcy5fcHJldlRpbWUgPSBub3coKTtcbiAgICB0aGlzLmVtaXQoJ3N0YXJ0JywgdGhpcyk7XG4gICAgdGhpcy5faXNTbGVlcGluZyA9IGZhbHNlO1xufTtcblxuUGh5c2ljc0VuZ2luZS5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQodHlwZSwgZGF0YSkge1xuICAgIGlmICh0aGlzLl9ldmVudEhhbmRsZXIgPT09IG51bGwpIHJldHVybjtcbiAgICB0aGlzLl9ldmVudEhhbmRsZXIuZW1pdCh0eXBlLCBkYXRhKTtcbn07XG5cblBoeXNpY3NFbmdpbmUucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oZXZlbnQsIGZuKSB7XG4gICAgaWYgKHRoaXMuX2V2ZW50SGFuZGxlciA9PT0gbnVsbCkgdGhpcy5fZXZlbnRIYW5kbGVyID0gbmV3IEV2ZW50SGFuZGxlcigpO1xuICAgIHRoaXMuX2V2ZW50SGFuZGxlci5vbihldmVudCwgZm4pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQaHlzaWNzRW5naW5lO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL3BoeXNpY3MvUGh5c2ljc0VuZ2luZS5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvcGh5c2ljc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IGRhdmlkQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbnZhciBWZWN0b3IgPSByZXF1aXJlKCcuLi8uLi9tYXRoL1ZlY3RvcicpO1xudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4uLy4uL2NvcmUvVHJhbnNmb3JtJyk7XG52YXIgRXZlbnRIYW5kbGVyID0gcmVxdWlyZSgnLi4vLi4vY29yZS9FdmVudEhhbmRsZXInKTtcbnZhciBJbnRlZ3JhdG9yID0gcmVxdWlyZSgnLi4vaW50ZWdyYXRvcnMvU3ltcGxlY3RpY0V1bGVyJyk7XG5cbi8qKlxuICogQSBwb2ludCBib2R5IHRoYXQgaXMgY29udHJvbGxlZCBieSB0aGUgUGh5c2ljcyBFbmdpbmUuIEEgcGFydGljbGUgaGFzXG4gKiAgIHBvc2l0aW9uIGFuZCB2ZWxvY2l0eSBzdGF0ZXMgdGhhdCBhcmUgdXBkYXRlZCBieSB0aGUgUGh5c2ljcyBFbmdpbmUuXG4gKiAgIFVsdGltYXRlbHksIGEgcGFydGljbGUgaXMgYSBfc3BlY2lhbCB0eXBlIG9mIG1vZGlmaWVyLCBhbmQgY2FuIGJlIGFkZGVkIHRvXG4gKiAgIHRoZSBGYW1vdXMgcmVuZGVyIHRyZWUgbGlrZSBhbnkgb3RoZXIgbW9kaWZpZXIuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAY2xhc3MgUGFydGljbGVcbiAqIEB1c2VzIEV2ZW50SGFuZGxlclxuICogQHVzZXMgTW9kaWZpZXJcbiAqIEBleHRlbnNpb25mb3IgQm9keVxuICogQHBhcmFtIHtPcHRpb25zfSBbb3B0aW9uc10gQW4gb2JqZWN0IG9mIGNvbmZpZ3VyYWJsZSBvcHRpb25zLlxuICogQHBhcmFtIHtBcnJheX0gW29wdGlvbnMucG9zaXRpb25dIFRoZSBwb3NpdGlvbiBvZiB0aGUgcGFydGljbGUuXG4gKiBAcGFyYW0ge0FycmF5fSBbb3B0aW9ucy52ZWxvY2l0eV0gVGhlIHZlbG9jaXR5IG9mIHRoZSBwYXJ0aWNsZS5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5tYXNzXSBUaGUgbWFzcyBvZiB0aGUgcGFydGljbGUuXG4gKiBAcGFyYW0ge0hleGFkZWNpbWFsfSBbb3B0aW9ucy5heGlzXSBUaGUgYXhpcyBhIHBhcnRpY2xlIGNhbiBtb3ZlIGFsb25nLiBDYW4gYmUgYml0d2lzZSBPUmVkIGUuZy4sIFBhcnRpY2xlLkFYRVMuWCwgUGFydGljbGUuQVhFUy5YIHwgUGFydGljbGUuQVhFUy5ZXG4gKlxuICovXG4gZnVuY3Rpb24gUGFydGljbGUob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgLy8gcmVnaXN0ZXJzXG4gICAgdGhpcy5wb3NpdGlvbiA9IG5ldyBWZWN0b3IoKTtcbiAgICB0aGlzLnZlbG9jaXR5ID0gbmV3IFZlY3RvcigpO1xuICAgIHRoaXMuZm9yY2UgICAgPSBuZXcgVmVjdG9yKCk7XG5cbiAgICB2YXIgZGVmYXVsdHMgID0gUGFydGljbGUuREVGQVVMVF9PUFRJT05TO1xuXG4gICAgLy8gc2V0IHZlY3RvcnNcbiAgICB0aGlzLnNldFBvc2l0aW9uKG9wdGlvbnMucG9zaXRpb24gfHwgZGVmYXVsdHMucG9zaXRpb24pO1xuICAgIHRoaXMuc2V0VmVsb2NpdHkob3B0aW9ucy52ZWxvY2l0eSB8fCBkZWZhdWx0cy52ZWxvY2l0eSk7XG4gICAgdGhpcy5mb3JjZS5zZXQob3B0aW9ucy5mb3JjZSB8fCBbMCwwLDBdKTtcblxuICAgIC8vIHNldCBzY2FsYXJzXG4gICAgdGhpcy5tYXNzID0gKG9wdGlvbnMubWFzcyAhPT0gdW5kZWZpbmVkKVxuICAgICAgICA/IG9wdGlvbnMubWFzc1xuICAgICAgICA6IGRlZmF1bHRzLm1hc3M7XG5cbiAgICB0aGlzLmF4aXMgPSAob3B0aW9ucy5heGlzICE9PSB1bmRlZmluZWQpXG4gICAgICAgID8gb3B0aW9ucy5heGlzXG4gICAgICAgIDogZGVmYXVsdHMuYXhpcztcblxuICAgIHRoaXMuaW52ZXJzZU1hc3MgPSAxIC8gdGhpcy5tYXNzO1xuXG4gICAgLy8gc3RhdGUgdmFyaWFibGVzXG4gICAgdGhpcy5faXNTbGVlcGluZyAgICAgPSBmYWxzZTtcbiAgICB0aGlzLl9lbmdpbmUgICAgICAgICA9IG51bGw7XG4gICAgdGhpcy5fZXZlbnRPdXRwdXQgICAgPSBudWxsO1xuICAgIHRoaXMuX3Bvc2l0aW9uR2V0dGVyID0gbnVsbDtcblxuICAgIHRoaXMudHJhbnNmb3JtID0gVHJhbnNmb3JtLmlkZW50aXR5LnNsaWNlKCk7XG5cbiAgICAvLyBjYWNoZWQgX3NwZWNcbiAgICB0aGlzLl9zcGVjID0ge1xuICAgICAgICB0cmFuc2Zvcm0gOiB0aGlzLnRyYW5zZm9ybSxcbiAgICAgICAgdGFyZ2V0ICAgIDogbnVsbFxuICAgIH07XG59XG5cblBhcnRpY2xlLkRFRkFVTFRfT1BUSU9OUyA9IHtcbiAgICBwb3NpdGlvbiA6IFswLDAsMF0sXG4gICAgdmVsb2NpdHkgOiBbMCwwLDBdLFxuICAgIG1hc3MgOiAxLFxuICAgIGF4aXMgOiB1bmRlZmluZWRcbn07XG5cbi8qKlxuICogS2luZXRpYyBlbmVyZ3kgdGhyZXNob2xkIG5lZWRlZCB0byB1cGRhdGUgdGhlIGJvZHlcbiAqXG4gKiBAcHJvcGVydHkgU0xFRVBfVE9MRVJBTkNFXG4gKiBAdHlwZSBOdW1iZXJcbiAqIEBzdGF0aWNcbiAqIEBkZWZhdWx0IDFlLTdcbiAqL1xuUGFydGljbGUuU0xFRVBfVE9MRVJBTkNFID0gMWUtNztcblxuLyoqXG4gKiBBeGVzIGJ5IHdoaWNoIGEgYm9keSBjYW4gdHJhbnNsYXRlXG4gKlxuICogQHByb3BlcnR5IEFYRVNcbiAqIEB0eXBlIEhleGFkZWNpbWFsXG4gKiBAc3RhdGljXG4gKiBAZGVmYXVsdCAxZS03XG4gKi9cblBhcnRpY2xlLkFYRVMgPSB7XG4gICAgWCA6IDB4MDAsIC8vIGhleGFkZWNpbWFsIGZvciAwXG4gICAgWSA6IDB4MDEsIC8vIGhleGFkZWNpbWFsIGZvciAxXG4gICAgWiA6IDB4MDIgIC8vIGhleGFkZWNpbWFsIGZvciAyXG59O1xuXG4vLyBJbnRlZ3JhdG9yIGZvciB1cGRhdGluZyB0aGUgcGFydGljbGUncyBzdGF0ZVxuLy8gVE9ETzogbWFrZSB0aGlzIGEgc2luZ2xldG9uXG5QYXJ0aWNsZS5JTlRFR1JBVE9SID0gbmV3IEludGVncmF0b3IoKTtcblxuLy9DYXRhbG9ndWUgb2Ygb3V0cHV0dGVkIGV2ZW50c1xudmFyIF9ldmVudHMgPSB7XG4gICAgc3RhcnQgIDogJ3N0YXJ0JyxcbiAgICB1cGRhdGUgOiAndXBkYXRlJyxcbiAgICBlbmQgICAgOiAnZW5kJ1xufTtcblxuLy8gQ2FjaGVkIHRpbWluZyBmdW5jdGlvblxudmFyIG5vdyA9IChmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gRGF0ZS5ub3c7XG59KSgpO1xuXG4vKipcbiAqIFN0b3BzIHRoZSBwYXJ0aWNsZSBmcm9tIHVwZGF0aW5nXG4gKiBAbWV0aG9kIHNsZWVwXG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5zbGVlcCA9IGZ1bmN0aW9uIHNsZWVwKCkge1xuICAgIGlmICh0aGlzLl9pc1NsZWVwaW5nKSByZXR1cm47XG4gICAgdGhpcy5lbWl0KF9ldmVudHMuZW5kLCB0aGlzKTtcbiAgICB0aGlzLl9pc1NsZWVwaW5nID0gdHJ1ZTtcbn07XG5cbi8qKlxuICogU3RhcnRzIHRoZSBwYXJ0aWNsZSB1cGRhdGVcbiAqIEBtZXRob2Qgd2FrZVxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUud2FrZSA9IGZ1bmN0aW9uIHdha2UoKSB7XG4gICAgaWYgKCF0aGlzLl9pc1NsZWVwaW5nKSByZXR1cm47XG4gICAgdGhpcy5lbWl0KF9ldmVudHMuc3RhcnQsIHRoaXMpO1xuICAgIHRoaXMuX2lzU2xlZXBpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wcmV2VGltZSA9IG5vdygpO1xufTtcblxuLyoqXG4gKiBAYXR0cmlidXRlIGlzQm9keVxuICogQHR5cGUgQm9vbGVhblxuICogQHN0YXRpY1xuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuaXNCb2R5ID0gZmFsc2U7XG5cbi8qKlxuICogQmFzaWMgc2V0dGVyIGZvciBwb3NpdGlvblxuICogQG1ldGhvZCBnZXRQb3NpdGlvblxuICogQHBhcmFtIHBvc2l0aW9uIHtBcnJheXxWZWN0b3J9XG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5zZXRQb3NpdGlvbiA9IGZ1bmN0aW9uIHNldFBvc2l0aW9uKHBvc2l0aW9uKSB7XG4gICAgdGhpcy5wb3NpdGlvbi5zZXQocG9zaXRpb24pO1xufTtcblxuLyoqXG4gKiAxLWRpbWVuc2lvbmFsIHNldHRlciBmb3IgcG9zaXRpb25cbiAqIEBtZXRob2Qgc2V0UG9zaXRpb24xRFxuICogQHBhcmFtIHZhbHVlIHtOdW1iZXJ9XG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5zZXRQb3NpdGlvbjFEID0gZnVuY3Rpb24gc2V0UG9zaXRpb24xRCh4KSB7XG4gICAgdGhpcy5wb3NpdGlvbi54ID0geDtcbn07XG5cbi8qKlxuICogQmFzaWMgZ2V0dGVyIGZ1bmN0aW9uIGZvciBwb3NpdGlvblxuICogQG1ldGhvZCBnZXRQb3NpdGlvblxuICogQHJldHVybiBwb3NpdGlvbiB7QXJyYXl9XG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uIGdldFBvc2l0aW9uKCkge1xuICAgIGlmICh0aGlzLl9wb3NpdGlvbkdldHRlciBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxuICAgICAgICB0aGlzLnNldFBvc2l0aW9uKHRoaXMuX3Bvc2l0aW9uR2V0dGVyKCkpO1xuXG4gICAgdGhpcy5fZW5naW5lLnN0ZXAoKTtcblxuICAgIHJldHVybiB0aGlzLnBvc2l0aW9uLmdldCgpO1xufTtcblxuLyoqXG4gKiAxLWRpbWVuc2lvbmFsIGdldHRlciBmb3IgcG9zaXRpb25cbiAqIEBtZXRob2QgZ2V0UG9zaXRpb24xRFxuICogQHJldHVybiB2YWx1ZSB7TnVtYmVyfVxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuZ2V0UG9zaXRpb24xRCA9IGZ1bmN0aW9uIGdldFBvc2l0aW9uMUQoKSB7XG4gICAgdGhpcy5fZW5naW5lLnN0ZXAoKTtcbiAgICByZXR1cm4gdGhpcy5wb3NpdGlvbi54O1xufTtcblxuLyoqXG4gKiBEZWZpbmVzIHRoZSBwb3NpdGlvbiBmcm9tIG91dHNpZGUgdGhlIFBoeXNpY3MgRW5naW5lXG4gKiBAbWV0aG9kIHBvc2l0aW9uRnJvbVxuICogQHBhcmFtIHBvc2l0aW9uR2V0dGVyIHtGdW5jdGlvbn1cbiAqL1xuUGFydGljbGUucHJvdG90eXBlLnBvc2l0aW9uRnJvbSA9IGZ1bmN0aW9uIHBvc2l0aW9uRnJvbShwb3NpdGlvbkdldHRlcikge1xuICAgIHRoaXMuX3Bvc2l0aW9uR2V0dGVyID0gcG9zaXRpb25HZXR0ZXI7XG59O1xuXG4vKipcbiAqIEJhc2ljIHNldHRlciBmdW5jdGlvbiBmb3IgdmVsb2NpdHkgVmVjdG9yXG4gKiBAbWV0aG9kIHNldFZlbG9jaXR5XG4gKiBAZnVuY3Rpb25cbiAqL1xuUGFydGljbGUucHJvdG90eXBlLnNldFZlbG9jaXR5ID0gZnVuY3Rpb24gc2V0VmVsb2NpdHkodmVsb2NpdHkpIHtcbiAgICB0aGlzLnZlbG9jaXR5LnNldCh2ZWxvY2l0eSk7XG4gICAgdGhpcy53YWtlKCk7XG59O1xuXG4vKipcbiAqIDEtZGltZW5zaW9uYWwgc2V0dGVyIGZvciB2ZWxvY2l0eVxuICogQG1ldGhvZCBzZXRWZWxvY2l0eTFEXG4gKiBAcGFyYW0gdmVsb2NpdHkge051bWJlcn1cbiAqL1xuUGFydGljbGUucHJvdG90eXBlLnNldFZlbG9jaXR5MUQgPSBmdW5jdGlvbiBzZXRWZWxvY2l0eTFEKHgpIHtcbiAgICB0aGlzLnZlbG9jaXR5LnggPSB4O1xuICAgIHRoaXMud2FrZSgpO1xufTtcblxuLyoqXG4gKiBCYXNpYyBnZXR0ZXIgZnVuY3Rpb24gZm9yIHZlbG9jaXR5IFZlY3RvclxuICogQG1ldGhvZCBnZXRWZWxvY2l0eVxuICogQHJldHVybiB2ZWxvY2l0eSB7QXJyYXl9XG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5nZXRWZWxvY2l0eSA9IGZ1bmN0aW9uIGdldFZlbG9jaXR5KCkge1xuICAgIHJldHVybiB0aGlzLnZlbG9jaXR5LmdldCgpO1xufTtcblxuLyoqXG4gKiAxLWRpbWVuc2lvbmFsIGdldHRlciBmb3IgdmVsb2NpdHlcbiAqIEBtZXRob2QgZ2V0VmVsb2NpdHkxRFxuICogQHJldHVybiB2ZWxvY2l0eSB7TnVtYmVyfVxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuZ2V0VmVsb2NpdHkxRCA9IGZ1bmN0aW9uIGdldFZlbG9jaXR5MUQoKSB7XG4gICAgcmV0dXJuIHRoaXMudmVsb2NpdHkueDtcbn07XG5cbi8qKlxuICogQmFzaWMgc2V0dGVyIGZ1bmN0aW9uIGZvciBtYXNzIHF1YW50aXR5XG4gKiBAbWV0aG9kIHNldE1hc3NcbiAqIEBwYXJhbSBtYXNzIHtOdW1iZXJ9IG1hc3NcbiAqL1xuUGFydGljbGUucHJvdG90eXBlLnNldE1hc3MgPSBmdW5jdGlvbiBzZXRNYXNzKG1hc3MpIHtcbiAgICB0aGlzLm1hc3MgPSBtYXNzO1xuICAgIHRoaXMuaW52ZXJzZU1hc3MgPSAxIC8gbWFzcztcbn07XG5cbi8qKlxuICogQmFzaWMgZ2V0dGVyIGZ1bmN0aW9uIGZvciBtYXNzIHF1YW50aXR5XG4gKiBAbWV0aG9kIGdldE1hc3NcbiAqIEByZXR1cm4gbWFzcyB7TnVtYmVyfVxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuZ2V0TWFzcyA9IGZ1bmN0aW9uIGdldE1hc3MoKSB7XG4gICAgcmV0dXJuIHRoaXMubWFzcztcbn07XG5cbi8qKlxuICogUmVzZXQgcG9zaXRpb24gYW5kIHZlbG9jaXR5XG4gKiBAbWV0aG9kIHJlc2V0XG4gKiBAcGFyYW0gcG9zaXRpb24ge0FycmF5fFZlY3Rvcn1cbiAqIEBwYXJhbSB2ZWxvY2l0eSB7QXJyYXl8VmVjdG9yfVxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiByZXNldChwb3NpdGlvbiwgdmVsb2NpdHkpIHtcbiAgICB0aGlzLnNldFBvc2l0aW9uKHBvc2l0aW9uIHx8IFswLDAsMF0pO1xuICAgIHRoaXMuc2V0VmVsb2NpdHkodmVsb2NpdHkgfHwgWzAsMCwwXSk7XG59O1xuXG4vKipcbiAqIEFkZCBmb3JjZSB2ZWN0b3IgdG8gZXhpc3RpbmcgaW50ZXJuYWwgZm9yY2UgVmVjdG9yXG4gKiBAbWV0aG9kIGFwcGx5Rm9yY2VcbiAqIEBwYXJhbSBmb3JjZSB7VmVjdG9yfVxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuYXBwbHlGb3JjZSA9IGZ1bmN0aW9uIGFwcGx5Rm9yY2UoZm9yY2UpIHtcbiAgICBpZiAoZm9yY2UuaXNaZXJvKCkpIHJldHVybjtcbiAgICB0aGlzLmZvcmNlLmFkZChmb3JjZSkucHV0KHRoaXMuZm9yY2UpO1xuICAgIHRoaXMud2FrZSgpO1xufTtcblxuLyoqXG4gKiBBZGQgaW1wdWxzZSAoY2hhbmdlIGluIHZlbG9jaXR5KSBWZWN0b3IgdG8gdGhpcyBWZWN0b3IncyB2ZWxvY2l0eS5cbiAqIEBtZXRob2QgYXBwbHlJbXB1bHNlXG4gKiBAcGFyYW0gaW1wdWxzZSB7VmVjdG9yfVxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuYXBwbHlJbXB1bHNlID0gZnVuY3Rpb24gYXBwbHlJbXB1bHNlKGltcHVsc2UpIHtcbiAgICBpZiAoaW1wdWxzZS5pc1plcm8oKSkgcmV0dXJuO1xuICAgIHZhciB2ZWxvY2l0eSA9IHRoaXMudmVsb2NpdHk7XG4gICAgdmVsb2NpdHkuYWRkKGltcHVsc2UubXVsdCh0aGlzLmludmVyc2VNYXNzKSkucHV0KHZlbG9jaXR5KTtcbn07XG5cbi8qKlxuICogVXBkYXRlIGEgcGFydGljbGUncyB2ZWxvY2l0eSBmcm9tIGl0cyBmb3JjZSBhY2N1bXVsYXRvclxuICogQG1ldGhvZCBpbnRlZ3JhdGVWZWxvY2l0eVxuICogQHBhcmFtIGR0IHtOdW1iZXJ9IFRpbWUgZGlmZmVyZW50aWFsXG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5pbnRlZ3JhdGVWZWxvY2l0eSA9IGZ1bmN0aW9uIGludGVncmF0ZVZlbG9jaXR5KGR0KSB7XG4gICAgUGFydGljbGUuSU5URUdSQVRPUi5pbnRlZ3JhdGVWZWxvY2l0eSh0aGlzLCBkdCk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSBhIHBhcnRpY2xlJ3MgcG9zaXRpb24gZnJvbSBpdHMgdmVsb2NpdHlcbiAqIEBtZXRob2QgaW50ZWdyYXRlUG9zaXRpb25cbiAqIEBwYXJhbSBkdCB7TnVtYmVyfSBUaW1lIGRpZmZlcmVudGlhbFxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuaW50ZWdyYXRlUG9zaXRpb24gPSBmdW5jdGlvbiBpbnRlZ3JhdGVQb3NpdGlvbihkdCkge1xuICAgIFBhcnRpY2xlLklOVEVHUkFUT1IuaW50ZWdyYXRlUG9zaXRpb24odGhpcywgZHQpO1xufTtcblxuLyoqXG4gKiBVcGRhdGUgdGhlIHBvc2l0aW9uIGFuZCB2ZWxvY2l0eSBvZiB0aGUgcGFydGljbGVcbiAqIEBtZXRob2QgX2ludGVncmF0ZVxuICogQHByb3RlY3RlZFxuICogQHBhcmFtIGR0IHtOdW1iZXJ9IFRpbWUgZGlmZmVyZW50aWFsXG4gKi9cblBhcnRpY2xlLnByb3RvdHlwZS5faW50ZWdyYXRlID0gZnVuY3Rpb24gX2ludGVncmF0ZShkdCkge1xuICAgIHRoaXMuaW50ZWdyYXRlVmVsb2NpdHkoZHQpO1xuICAgIHRoaXMuaW50ZWdyYXRlUG9zaXRpb24oZHQpO1xufTtcblxuLyoqXG4gKiBHZXQga2luZXRpYyBlbmVyZ3kgb2YgdGhlIHBhcnRpY2xlLlxuICogQG1ldGhvZCBnZXRFbmVyZ3lcbiAqIEBmdW5jdGlvblxuICovXG5QYXJ0aWNsZS5wcm90b3R5cGUuZ2V0RW5lcmd5ID0gZnVuY3Rpb24gZ2V0RW5lcmd5KCkge1xuICAgIHJldHVybiAwLjUgKiB0aGlzLm1hc3MgKiB0aGlzLnZlbG9jaXR5Lm5vcm1TcXVhcmVkKCk7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlIHRyYW5zZm9ybSBmcm9tIHRoZSBjdXJyZW50IHBvc2l0aW9uIHN0YXRlXG4gKiBAbWV0aG9kIGdldFRyYW5zZm9ybVxuICogQHJldHVybiBUcmFuc2Zvcm0ge1RyYW5zZm9ybX1cbiAqL1xuUGFydGljbGUucHJvdG90eXBlLmdldFRyYW5zZm9ybSA9IGZ1bmN0aW9uIGdldFRyYW5zZm9ybSgpIHtcbiAgICB0aGlzLl9lbmdpbmUuc3RlcCgpO1xuXG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbjtcbiAgICB2YXIgYXhpcyA9IHRoaXMuYXhpcztcbiAgICB2YXIgdHJhbnNmb3JtID0gdGhpcy50cmFuc2Zvcm07XG5cbiAgICBpZiAoYXhpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChheGlzICYgflBhcnRpY2xlLkFYRVMuWCkge1xuICAgICAgICAgICAgcG9zaXRpb24ueCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF4aXMgJiB+UGFydGljbGUuQVhFUy5ZKSB7XG4gICAgICAgICAgICBwb3NpdGlvbi55ID0gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXhpcyAmIH5QYXJ0aWNsZS5BWEVTLlopIHtcbiAgICAgICAgICAgIHBvc2l0aW9uLnogPSAwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdHJhbnNmb3JtWzEyXSA9IHBvc2l0aW9uLng7XG4gICAgdHJhbnNmb3JtWzEzXSA9IHBvc2l0aW9uLnk7XG4gICAgdHJhbnNmb3JtWzE0XSA9IHBvc2l0aW9uLno7XG5cbiAgICByZXR1cm4gdHJhbnNmb3JtO1xufTtcblxuLyoqXG4gKiBUaGUgbW9kaWZ5IGludGVyZmFjZSBvZiBhIE1vZGlmaWVyXG4gKiBAbWV0aG9kIG1vZGlmeVxuICogQHBhcmFtIHRhcmdldCB7U3BlY31cbiAqIEByZXR1cm4gU3BlYyB7U3BlY31cbiAqL1xuUGFydGljbGUucHJvdG90eXBlLm1vZGlmeSA9IGZ1bmN0aW9uIG1vZGlmeSh0YXJnZXQpIHtcbiAgICB2YXIgX3NwZWMgPSB0aGlzLl9zcGVjO1xuICAgIF9zcGVjLnRyYW5zZm9ybSA9IHRoaXMuZ2V0VHJhbnNmb3JtKCk7XG4gICAgX3NwZWMudGFyZ2V0ID0gdGFyZ2V0O1xuICAgIHJldHVybiBfc3BlYztcbn07XG5cbi8vIHByaXZhdGVcbmZ1bmN0aW9uIF9jcmVhdGVFdmVudE91dHB1dCgpIHtcbiAgICB0aGlzLl9ldmVudE91dHB1dCA9IG5ldyBFdmVudEhhbmRsZXIoKTtcbiAgICB0aGlzLl9ldmVudE91dHB1dC5iaW5kVGhpcyh0aGlzKTtcbiAgICAvL292ZXJyaWRlcyBvbi9yZW1vdmVMaXN0ZW5lci9waXBlL3VucGlwZSBtZXRob2RzXG4gICAgRXZlbnRIYW5kbGVyLnNldE91dHB1dEhhbmRsZXIodGhpcywgdGhpcy5fZXZlbnRPdXRwdXQpO1xufVxuXG5QYXJ0aWNsZS5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQodHlwZSwgZGF0YSkge1xuICAgIGlmICghdGhpcy5fZXZlbnRPdXRwdXQpIHJldHVybjtcbiAgICB0aGlzLl9ldmVudE91dHB1dC5lbWl0KHR5cGUsIGRhdGEpO1xufTtcblxuUGFydGljbGUucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oKSB7XG4gICAgX2NyZWF0ZUV2ZW50T3V0cHV0LmNhbGwodGhpcyk7XG4gICAgcmV0dXJuIHRoaXMub24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5QYXJ0aWNsZS5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcigpIHtcbiAgICBfY3JlYXRlRXZlbnRPdXRwdXQuY2FsbCh0aGlzKTtcbiAgICByZXR1cm4gdGhpcy5yZW1vdmVMaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblBhcnRpY2xlLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24gcGlwZSgpIHtcbiAgICBfY3JlYXRlRXZlbnRPdXRwdXQuY2FsbCh0aGlzKTtcbiAgICByZXR1cm4gdGhpcy5waXBlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuUGFydGljbGUucHJvdG90eXBlLnVucGlwZSA9IGZ1bmN0aW9uIHVucGlwZSgpIHtcbiAgICBfY3JlYXRlRXZlbnRPdXRwdXQuY2FsbCh0aGlzKTtcbiAgICByZXR1cm4gdGhpcy51bnBpcGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFydGljbGU7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvcGh5c2ljcy9ib2RpZXMvUGFydGljbGUuanNcIixcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL3BoeXNpY3MvYm9kaWVzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogZGF2aWRAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4uLy4uL21hdGgvVmVjdG9yJyk7XG52YXIgRXZlbnRIYW5kbGVyID0gcmVxdWlyZSgnLi4vLi4vY29yZS9FdmVudEhhbmRsZXInKTtcblxuLyoqXG4gKiBGb3JjZSBiYXNlIGNsYXNzLlxuICpcbiAqIEBjbGFzcyBGb3JjZVxuICogQHVzZXMgRXZlbnRIYW5kbGVyXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRm9yY2UoZm9yY2UpIHtcbiAgICB0aGlzLmZvcmNlID0gbmV3IFZlY3Rvcihmb3JjZSk7XG4gICAgdGhpcy5fZW5lcmd5ID0gMC4wO1xuICAgIHRoaXMuX2V2ZW50T3V0cHV0ID0gbnVsbDtcbn1cblxuLyoqXG4gKiBCYXNpYyBzZXR0ZXIgZm9yIG9wdGlvbnNcbiAqXG4gKiBAbWV0aG9kIHNldE9wdGlvbnNcbiAqIEBwYXJhbSBvcHRpb25zIHtPYmplY3RzfVxuICovXG5Gb3JjZS5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIHNldE9wdGlvbnMob3B0aW9ucykge1xuICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zKSB0aGlzLm9wdGlvbnNba2V5XSA9IG9wdGlvbnNba2V5XTtcbn07XG5cbi8qKlxuICogQWRkcyBhIGZvcmNlIHRvIGEgcGh5c2ljcyBib2R5J3MgZm9yY2UgYWNjdW11bGF0b3IuXG4gKlxuICogQG1ldGhvZCBhcHBseUZvcmNlXG4gKiBAcGFyYW0gYm9keSB7Qm9keX1cbiAqL1xuRm9yY2UucHJvdG90eXBlLmFwcGx5Rm9yY2UgPSBmdW5jdGlvbiBhcHBseUZvcmNlKGJvZHkpIHtcbiAgICBib2R5LmFwcGx5Rm9yY2UodGhpcy5mb3JjZSk7XG59O1xuXG4vKipcbiAqIEdldHRlciBmb3IgYSBmb3JjZSdzIHBvdGVudGlhbCBlbmVyZ3kuXG4gKlxuICogQG1ldGhvZCBnZXRFbmVyZ3lcbiAqIEByZXR1cm4gZW5lcmd5IHtOdW1iZXJ9XG4gKi9cbkZvcmNlLnByb3RvdHlwZS5nZXRFbmVyZ3kgPSBmdW5jdGlvbiBnZXRFbmVyZ3koKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VuZXJneTtcbn07XG5cbi8qXG4gKiBTZXR0ZXIgZm9yIGEgZm9yY2UncyBwb3RlbnRpYWwgZW5lcmd5LlxuICpcbiAqIEBtZXRob2Qgc2V0RW5lcmd5XG4gKiBAcGFyYW0gZW5lcmd5IHtOdW1iZXJ9XG4gKi9cbkZvcmNlLnByb3RvdHlwZS5zZXRFbmVyZ3kgPSBmdW5jdGlvbiBzZXRFbmVyZ3koZW5lcmd5KSB7XG4gICAgdGhpcy5fZW5lcmd5ID0gZW5lcmd5O1xufTtcblxuZnVuY3Rpb24gX2NyZWF0ZUV2ZW50T3V0cHV0KCkge1xuICAgIHRoaXMuX2V2ZW50T3V0cHV0ID0gbmV3IEV2ZW50SGFuZGxlcigpO1xuICAgIHRoaXMuX2V2ZW50T3V0cHV0LmJpbmRUaGlzKHRoaXMpO1xuICAgIEV2ZW50SGFuZGxlci5zZXRPdXRwdXRIYW5kbGVyKHRoaXMsIHRoaXMuX2V2ZW50T3V0cHV0KTtcbn1cblxuRm9yY2UucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oKSB7XG4gICAgX2NyZWF0ZUV2ZW50T3V0cHV0LmNhbGwodGhpcyk7XG4gICAgcmV0dXJuIHRoaXMub24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5Gb3JjZS5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiBhZGRMaXN0ZW5lcigpIHtcbiAgICBfY3JlYXRlRXZlbnRPdXRwdXQuY2FsbCh0aGlzKTtcbiAgICByZXR1cm4gdGhpcy5hZGRMaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcbkZvcmNlLnByb3RvdHlwZS5waXBlID0gZnVuY3Rpb24gcGlwZSgpIHtcbiAgICBfY3JlYXRlRXZlbnRPdXRwdXQuY2FsbCh0aGlzKTtcbiAgICByZXR1cm4gdGhpcy5waXBlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuRm9yY2UucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMucmVtb3ZlTGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5Gb3JjZS5wcm90b3R5cGUudW5waXBlID0gZnVuY3Rpb24gdW5waXBlKCkge1xuICAgIHJldHVybiB0aGlzLnVucGlwZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGb3JjZTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9waHlzaWNzL2ZvcmNlcy9Gb3JjZS5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvcGh5c2ljcy9mb3JjZXNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyOiBkYXZpZEBmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG52YXIgRm9yY2UgPSByZXF1aXJlKCcuL0ZvcmNlJyk7XG52YXIgVmVjdG9yID0gcmVxdWlyZSgnLi4vLi4vbWF0aC9WZWN0b3InKTtcblxuLyoqXG4gKiAgQSBmb3JjZSB0aGF0IG1vdmVzIGEgcGh5c2ljcyBib2R5IHRvIGEgbG9jYXRpb24gd2l0aCBhIHNwcmluZyBtb3Rpb24uXG4gKiAgICBUaGUgYm9keSBjYW4gYmUgbW92ZWQgdG8gYW5vdGhlciBwaHlzaWNzIGJvZHksIG9yIGFuIGFuY2hvciBwb2ludC5cbiAqXG4gKiAgQGNsYXNzIFNwcmluZ1xuICogIEBjb25zdHJ1Y3RvclxuICogIEBleHRlbmRzIEZvcmNlXG4gKiAgQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgb3B0aW9ucyB0byBzZXQgb24gZHJhZ1xuICovXG5mdW5jdGlvbiBTcHJpbmcob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IE9iamVjdC5jcmVhdGUodGhpcy5jb25zdHJ1Y3Rvci5ERUZBVUxUX09QVElPTlMpO1xuICAgIGlmIChvcHRpb25zKSB0aGlzLnNldE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICAvL3JlZ2lzdGVyc1xuICAgIHRoaXMuZGlzcCA9IG5ldyBWZWN0b3IoMCwwLDApO1xuXG4gICAgX2luaXQuY2FsbCh0aGlzKTtcbiAgICBGb3JjZS5jYWxsKHRoaXMpO1xufVxuXG5TcHJpbmcucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShGb3JjZS5wcm90b3R5cGUpO1xuU3ByaW5nLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNwcmluZztcblxuLyoqIEBjb25zdCAqLyB2YXIgcGkgPSBNYXRoLlBJO1xuXG4vKipcbiAqIEBwcm9wZXJ0eSBTcHJpbmcuRk9SQ0VfRlVOQ1RJT05TXG4gKiBAdHlwZSBPYmplY3RcbiAqIEBwcm90ZWN0ZWRcbiAqIEBzdGF0aWNcbiAqL1xuU3ByaW5nLkZPUkNFX0ZVTkNUSU9OUyA9IHtcblxuICAgIC8qKlxuICAgICAqIEEgRkVORSAoRmluaXRlbHkgRXh0ZW5zaWJsZSBOb25saW5lYXIgRWxhc3RpYykgc3ByaW5nIGZvcmNlXG4gICAgICogICAgICBzZWU6IGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRkVORVxuICAgICAqIEBhdHRyaWJ1dGUgRkVORVxuICAgICAqIEB0eXBlIEZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGRpc3QgY3VycmVudCBkaXN0YW5jZSB0YXJnZXQgaXMgZnJvbSBzb3VyY2UgYm9keVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSByTWF4IG1heGltdW0gcmFuZ2Ugb2YgaW5mbHVlbmNlXG4gICAgICogQHJldHVybiB7TnVtYmVyfSB1bnNjYWxlZCBmb3JjZVxuICAgICAqL1xuICAgIEZFTkUgOiBmdW5jdGlvbihkaXN0LCByTWF4KSB7XG4gICAgICAgIHZhciByTWF4U21hbGwgPSByTWF4ICogLjk5O1xuICAgICAgICB2YXIgciA9IE1hdGgubWF4KE1hdGgubWluKGRpc3QsIHJNYXhTbWFsbCksIC1yTWF4U21hbGwpO1xuICAgICAgICByZXR1cm4gciAvICgxIC0gciAqIHIvKHJNYXggKiByTWF4KSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEEgSG9va2VhbiBzcHJpbmcgZm9yY2UsIGxpbmVhciBpbiB0aGUgZGlzcGxhY2VtZW50XG4gICAgICogICAgICBzZWU6IGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRkVORVxuICAgICAqIEBhdHRyaWJ1dGUgRkVORVxuICAgICAqIEB0eXBlIEZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGRpc3QgY3VycmVudCBkaXN0YW5jZSB0YXJnZXQgaXMgZnJvbSBzb3VyY2UgYm9keVxuICAgICAqIEByZXR1cm4ge051bWJlcn0gdW5zY2FsZWQgZm9yY2VcbiAgICAgKi9cbiAgICBIT09LIDogZnVuY3Rpb24oZGlzdCkge1xuICAgICAgICByZXR1cm4gZGlzdDtcbiAgICB9XG59O1xuXG4vKipcbiAqIEBwcm9wZXJ0eSBTcHJpbmcuREVGQVVMVF9PUFRJT05TXG4gKiBAdHlwZSBPYmplY3RcbiAqIEBwcm90ZWN0ZWRcbiAqIEBzdGF0aWNcbiAqL1xuU3ByaW5nLkRFRkFVTFRfT1BUSU9OUyA9IHtcblxuICAgIC8qKlxuICAgICAqIFRoZSBhbW91bnQgb2YgdGltZSBpbiBtaWxsaXNlY29uZHMgdGFrZW4gZm9yIG9uZSBjb21wbGV0ZSBvc2NpbGxhdGlvblxuICAgICAqIHdoZW4gdGhlcmUgaXMgbm8gZGFtcGluZ1xuICAgICAqICAgIFJhbmdlIDogWzE1MCwgSW5maW5pdHldXG4gICAgICogQGF0dHJpYnV0ZSBwZXJpb2RcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKiBAZGVmYXVsdCAzMDBcbiAgICAgKi9cbiAgICBwZXJpb2QgICAgICAgIDogMzAwLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhbXBpbmcgb2YgdGhlIHNwcmluZy5cbiAgICAgKiAgICBSYW5nZSA6IFswLCAxXVxuICAgICAqICAgIDAgPSBubyBkYW1waW5nLCBhbmQgdGhlIHNwcmluZyB3aWxsIG9zY2lsbGF0ZSBmb3JldmVyXG4gICAgICogICAgMSA9IGNyaXRpY2FsbHkgZGFtcGVkICh0aGUgc3ByaW5nIHdpbGwgbmV2ZXIgb3NjaWxsYXRlKVxuICAgICAqIEBhdHRyaWJ1dGUgZGFtcGluZ1JhdGlvXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICogQGRlZmF1bHQgMC4xXG4gICAgICovXG4gICAgZGFtcGluZ1JhdGlvIDogMC4xLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHJlc3QgbGVuZ3RoIG9mIHRoZSBzcHJpbmdcbiAgICAgKiAgICBSYW5nZSA6IFswLCBJbmZpbml0eV1cbiAgICAgKiBAYXR0cmlidXRlIGxlbmd0aFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqIEBkZWZhdWx0IDBcbiAgICAgKi9cbiAgICBsZW5ndGggOiAwLFxuXG4gICAgLyoqXG4gICAgICogVGhlIG1heGltdW0gbGVuZ3RoIG9mIHRoZSBzcHJpbmcgKGZvciBhIEZFTkUgc3ByaW5nKVxuICAgICAqICAgIFJhbmdlIDogWzAsIEluZmluaXR5XVxuICAgICAqIEBhdHRyaWJ1dGUgbGVuZ3RoXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICogQGRlZmF1bHQgSW5maW5pdHlcbiAgICAgKi9cbiAgICBtYXhMZW5ndGggOiBJbmZpbml0eSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBsb2NhdGlvbiBvZiB0aGUgc3ByaW5nJ3MgYW5jaG9yLCBpZiBub3QgYW5vdGhlciBwaHlzaWNzIGJvZHlcbiAgICAgKlxuICAgICAqIEBhdHRyaWJ1dGUgYW5jaG9yXG4gICAgICogQHR5cGUgQXJyYXlcbiAgICAgKiBAb3B0aW9uYWxcbiAgICAgKi9cbiAgICBhbmNob3IgOiB1bmRlZmluZWQsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgdHlwZSBvZiBzcHJpbmcgZm9yY2VcbiAgICAgKiBAYXR0cmlidXRlIGZvcmNlRnVuY3Rpb25cbiAgICAgKiBAdHlwZSBGdW5jdGlvblxuICAgICAqL1xuICAgIGZvcmNlRnVuY3Rpb24gOiBTcHJpbmcuRk9SQ0VfRlVOQ1RJT05TLkhPT0tcbn07XG5cbmZ1bmN0aW9uIF9zZXRGb3JjZUZ1bmN0aW9uKGZuKSB7XG4gICAgdGhpcy5mb3JjZUZ1bmN0aW9uID0gZm47XG59XG5cbmZ1bmN0aW9uIF9jYWxjU3RpZmZuZXNzKCkge1xuICAgIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zO1xuICAgIG9wdGlvbnMuc3RpZmZuZXNzID0gTWF0aC5wb3coMiAqIHBpIC8gb3B0aW9ucy5wZXJpb2QsIDIpO1xufVxuXG5mdW5jdGlvbiBfY2FsY0RhbXBpbmcoKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG4gICAgb3B0aW9ucy5kYW1waW5nID0gNCAqIHBpICogb3B0aW9ucy5kYW1waW5nUmF0aW8gLyBvcHRpb25zLnBlcmlvZDtcbn1cblxuZnVuY3Rpb24gX2NhbGNFbmVyZ3koc3RyZW5ndGgsIGRpc3QpIHtcbiAgICByZXR1cm4gMC41ICogc3RyZW5ndGggKiBkaXN0ICogZGlzdDtcbn1cblxuZnVuY3Rpb24gX2luaXQoKSB7XG4gICAgX3NldEZvcmNlRnVuY3Rpb24uY2FsbCh0aGlzLCB0aGlzLm9wdGlvbnMuZm9yY2VGdW5jdGlvbik7XG4gICAgX2NhbGNTdGlmZm5lc3MuY2FsbCh0aGlzKTtcbiAgICBfY2FsY0RhbXBpbmcuY2FsbCh0aGlzKTtcbn1cblxuLyoqXG4gKiBCYXNpYyBvcHRpb25zIHNldHRlclxuICpcbiAqIEBtZXRob2Qgc2V0T3B0aW9uc1xuICogQHBhcmFtIG9wdGlvbnMge09iamVjdHN9XG4gKi9cblNwcmluZy5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIHNldE9wdGlvbnMob3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zLmFuY2hvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmFuY2hvci5wb3NpdGlvbiBpbnN0YW5jZW9mIFZlY3RvcikgdGhpcy5vcHRpb25zLmFuY2hvciA9IG9wdGlvbnMuYW5jaG9yLnBvc2l0aW9uO1xuICAgICAgICBpZiAob3B0aW9ucy5hbmNob3IgICBpbnN0YW5jZW9mIFZlY3RvcikgIHRoaXMub3B0aW9ucy5hbmNob3IgPSBvcHRpb25zLmFuY2hvcjtcbiAgICAgICAgaWYgKG9wdGlvbnMuYW5jaG9yICAgaW5zdGFuY2VvZiBBcnJheSkgIHRoaXMub3B0aW9ucy5hbmNob3IgPSBuZXcgVmVjdG9yKG9wdGlvbnMuYW5jaG9yKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMucGVyaW9kICE9PSB1bmRlZmluZWQpIHRoaXMub3B0aW9ucy5wZXJpb2QgPSBvcHRpb25zLnBlcmlvZDtcbiAgICBpZiAob3B0aW9ucy5kYW1waW5nUmF0aW8gIT09IHVuZGVmaW5lZCkgdGhpcy5vcHRpb25zLmRhbXBpbmdSYXRpbyA9IG9wdGlvbnMuZGFtcGluZ1JhdGlvO1xuICAgIGlmIChvcHRpb25zLmxlbmd0aCAhPT0gdW5kZWZpbmVkKSB0aGlzLm9wdGlvbnMubGVuZ3RoID0gb3B0aW9ucy5sZW5ndGg7XG4gICAgaWYgKG9wdGlvbnMuZm9yY2VGdW5jdGlvbiAhPT0gdW5kZWZpbmVkKSB0aGlzLm9wdGlvbnMuZm9yY2VGdW5jdGlvbiA9IG9wdGlvbnMuZm9yY2VGdW5jdGlvbjtcbiAgICBpZiAob3B0aW9ucy5tYXhMZW5ndGggIT09IHVuZGVmaW5lZCkgdGhpcy5vcHRpb25zLm1heExlbmd0aCA9IG9wdGlvbnMubWF4TGVuZ3RoO1xuXG4gICAgX2luaXQuY2FsbCh0aGlzKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIHNwcmluZyBmb3JjZSB0byBhIHBoeXNpY3MgYm9keSdzIGZvcmNlIGFjY3VtdWxhdG9yLlxuICpcbiAqIEBtZXRob2QgYXBwbHlGb3JjZVxuICogQHBhcmFtIHRhcmdldHMge0FycmF5LkJvZHl9IEFycmF5IG9mIGJvZGllcyB0byBhcHBseSBmb3JjZSB0by5cbiAqL1xuU3ByaW5nLnByb3RvdHlwZS5hcHBseUZvcmNlID0gZnVuY3Rpb24gYXBwbHlGb3JjZSh0YXJnZXRzLCBzb3VyY2UpIHtcbiAgICB2YXIgZm9yY2UgICAgICAgID0gdGhpcy5mb3JjZTtcbiAgICB2YXIgZGlzcCAgICAgICAgID0gdGhpcy5kaXNwO1xuICAgIHZhciBvcHRpb25zICAgICAgPSB0aGlzLm9wdGlvbnM7XG5cbiAgICB2YXIgc3RpZmZuZXNzICAgID0gb3B0aW9ucy5zdGlmZm5lc3M7XG4gICAgdmFyIGRhbXBpbmcgICAgICA9IG9wdGlvbnMuZGFtcGluZztcbiAgICB2YXIgcmVzdExlbmd0aCAgID0gb3B0aW9ucy5sZW5ndGg7XG4gICAgdmFyIGxNYXggICAgICAgICA9IG9wdGlvbnMubWF4TGVuZ3RoO1xuICAgIHZhciBhbmNob3IgICAgICAgPSBvcHRpb25zLmFuY2hvciB8fCBzb3VyY2UucG9zaXRpb247XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhcmdldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IHRhcmdldHNbaV07XG4gICAgICAgIHZhciBwMiA9IHRhcmdldC5wb3NpdGlvbjtcbiAgICAgICAgdmFyIHYyID0gdGFyZ2V0LnZlbG9jaXR5O1xuXG4gICAgICAgIGFuY2hvci5zdWIocDIpLnB1dChkaXNwKTtcbiAgICAgICAgdmFyIGRpc3QgPSBkaXNwLm5vcm0oKSAtIHJlc3RMZW5ndGg7XG5cbiAgICAgICAgaWYgKGRpc3QgPT09IDApIHJldHVybjtcblxuICAgICAgICAvL2lmIGRhbXBpbmdSYXRpbyBzcGVjaWZpZWQsIHRoZW4gb3ZlcnJpZGUgc3RyZW5ndGggYW5kIGRhbXBpbmdcbiAgICAgICAgdmFyIG0gICAgICA9IHRhcmdldC5tYXNzO1xuICAgICAgICBzdGlmZm5lc3MgKj0gbTtcbiAgICAgICAgZGFtcGluZyAgICo9IG07XG5cbiAgICAgICAgZGlzcC5ub3JtYWxpemUoc3RpZmZuZXNzICogdGhpcy5mb3JjZUZ1bmN0aW9uKGRpc3QsIGxNYXgpKVxuICAgICAgICAgICAgLnB1dChmb3JjZSk7XG5cbiAgICAgICAgaWYgKGRhbXBpbmcpXG4gICAgICAgICAgICBpZiAoc291cmNlKSBmb3JjZS5hZGQodjIuc3ViKHNvdXJjZS52ZWxvY2l0eSkubXVsdCgtZGFtcGluZykpLnB1dChmb3JjZSk7XG4gICAgICAgICAgICBlbHNlIGZvcmNlLmFkZCh2Mi5tdWx0KC1kYW1waW5nKSkucHV0KGZvcmNlKTtcblxuICAgICAgICB0YXJnZXQuYXBwbHlGb3JjZShmb3JjZSk7XG4gICAgICAgIGlmIChzb3VyY2UpIHNvdXJjZS5hcHBseUZvcmNlKGZvcmNlLm11bHQoLTEpKTtcblxuICAgICAgICB0aGlzLnNldEVuZXJneShfY2FsY0VuZXJneShzdGlmZm5lc3MsIGRpc3QpKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIENhbGN1bGF0ZXMgdGhlIHBvdGVudGlhbCBlbmVyZ3kgb2YgdGhlIHNwcmluZy5cbiAqXG4gKiBAbWV0aG9kIGdldEVuZXJneVxuICogQHBhcmFtIHRhcmdldCB7Qm9keX0gICAgIFRoZSBwaHlzaWNzIGJvZHkgYXR0YWNoZWQgdG8gdGhlIHNwcmluZ1xuICogQHJldHVybiBlbmVyZ3kge051bWJlcn1cbiAqL1xuU3ByaW5nLnByb3RvdHlwZS5nZXRFbmVyZ3kgPSBmdW5jdGlvbiBnZXRFbmVyZ3kodGFyZ2V0KSB7XG4gICAgdmFyIG9wdGlvbnMgICAgICAgID0gdGhpcy5vcHRpb25zO1xuICAgIHZhciByZXN0TGVuZ3RoICA9IG9wdGlvbnMubGVuZ3RoO1xuICAgIHZhciBhbmNob3IgICAgICA9IG9wdGlvbnMuYW5jaG9yO1xuICAgIHZhciBzdHJlbmd0aCAgICA9IG9wdGlvbnMuc3RpZmZuZXNzO1xuXG4gICAgdmFyIGRpc3QgPSBhbmNob3Iuc3ViKHRhcmdldC5wb3NpdGlvbikubm9ybSgpIC0gcmVzdExlbmd0aDtcbiAgICByZXR1cm4gMC41ICogc3RyZW5ndGggKiBkaXN0ICogZGlzdDtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgYW5jaG9yIHRvIGEgbmV3IHBvc2l0aW9uXG4gKlxuICogQG1ldGhvZCBzZXRBbmNob3JcbiAqIEBwYXJhbSBhbmNob3Ige0FycmF5fSAgICBOZXcgYW5jaG9yIG9mIHRoZSBzcHJpbmdcbiAqL1xuU3ByaW5nLnByb3RvdHlwZS5zZXRBbmNob3IgPSBmdW5jdGlvbiBzZXRBbmNob3IoYW5jaG9yKSB7XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuYW5jaG9yKSB0aGlzLm9wdGlvbnMuYW5jaG9yID0gbmV3IFZlY3RvcigpO1xuICAgIHRoaXMub3B0aW9ucy5hbmNob3Iuc2V0KGFuY2hvcik7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNwcmluZztcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9waHlzaWNzL2ZvcmNlcy9TcHJpbmcuanNcIixcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL3BoeXNpY3MvZm9yY2VzXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogZGF2aWRAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxudmFyIE9wdGlvbnNNYW5hZ2VyID0gcmVxdWlyZSgnLi4vLi4vY29yZS9PcHRpb25zTWFuYWdlcicpO1xuXG4vKipcbiAqIE9yZGluYXJ5IERpZmZlcmVudGlhbCBFcXVhdGlvbiAoT0RFKSBJbnRlZ3JhdG9yLlxuICogTWFuYWdlcyB1cGRhdGluZyBhIHBoeXNpY3MgYm9keSdzIHN0YXRlIG92ZXIgdGltZS5cbiAqXG4gKiAgcCA9IHBvc2l0aW9uLCB2ID0gdmVsb2NpdHksIG0gPSBtYXNzLCBmID0gZm9yY2UsIGR0ID0gY2hhbmdlIGluIHRpbWVcbiAqXG4gKiAgICAgIHYgPC0gdiArIGR0ICogZiAvIG1cbiAqICAgICAgcCA8LSBwICsgZHQgKiB2XG4gKlxuICogIHEgPSBvcmllbnRhdGlvbiwgdyA9IGFuZ3VsYXIgdmVsb2NpdHksIEwgPSBhbmd1bGFyIG1vbWVudHVtXG4gKlxuICogICAgICBMIDwtIEwgKyBkdCAqIHRcbiAqICAgICAgcSA8LSBxICsgZHQvMiAqIHEgKiB3XG4gKlxuICogQGNsYXNzIFN5bXBsZWN0aWNFdWxlclxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBPcHRpb25zIHRvIHNldFxuICovXG5mdW5jdGlvbiBTeW1wbGVjdGljRXVsZXIob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IE9iamVjdC5jcmVhdGUoU3ltcGxlY3RpY0V1bGVyLkRFRkFVTFRfT1BUSU9OUyk7XG4gICAgdGhpcy5fb3B0aW9uc01hbmFnZXIgPSBuZXcgT3B0aW9uc01hbmFnZXIodGhpcy5vcHRpb25zKTtcblxuICAgIGlmIChvcHRpb25zKSB0aGlzLnNldE9wdGlvbnMob3B0aW9ucyk7XG59XG5cbi8qKlxuICogQHByb3BlcnR5IFN5bXBsZWN0aWNFdWxlci5ERUZBVUxUX09QVElPTlNcbiAqIEB0eXBlIE9iamVjdFxuICogQHByb3RlY3RlZFxuICogQHN0YXRpY1xuICovXG5TeW1wbGVjdGljRXVsZXIuREVGQVVMVF9PUFRJT05TID0ge1xuXG4gICAgLyoqXG4gICAgICogVGhlIG1heGltdW0gdmVsb2NpdHkgb2YgYSBwaHlzaWNzIGJvZHlcbiAgICAgKiAgICAgIFJhbmdlIDogWzAsIEluZmluaXR5XVxuICAgICAqIEBhdHRyaWJ1dGUgdmVsb2NpdHlDYXBcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cblxuICAgIHZlbG9jaXR5Q2FwIDogdW5kZWZpbmVkLFxuXG4gICAgLyoqXG4gICAgICogVGhlIG1heGltdW0gYW5ndWxhciB2ZWxvY2l0eSBvZiBhIHBoeXNpY3MgYm9keVxuICAgICAqICAgICAgUmFuZ2UgOiBbMCwgSW5maW5pdHldXG4gICAgICogQGF0dHJpYnV0ZSBhbmd1bGFyVmVsb2NpdHlDYXBcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICBhbmd1bGFyVmVsb2NpdHlDYXAgOiB1bmRlZmluZWRcbn07XG5cbi8qXG4gKiBTZXR0ZXIgZm9yIG9wdGlvbnNcbiAqXG4gKiBAbWV0aG9kIHNldE9wdGlvbnNcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKi9cblN5bXBsZWN0aWNFdWxlci5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIHNldE9wdGlvbnMob3B0aW9ucykge1xuICAgIHRoaXMuX29wdGlvbnNNYW5hZ2VyLnBhdGNoKG9wdGlvbnMpO1xufTtcblxuLypcbiAqIEdldHRlciBmb3Igb3B0aW9uc1xuICpcbiAqIEBtZXRob2QgZ2V0T3B0aW9uc1xuICogQHJldHVybiB7T2JqZWN0fSBvcHRpb25zXG4gKi9cblN5bXBsZWN0aWNFdWxlci5wcm90b3R5cGUuZ2V0T3B0aW9ucyA9IGZ1bmN0aW9uIGdldE9wdGlvbnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX29wdGlvbnNNYW5hZ2VyLnZhbHVlKCk7XG59O1xuXG4vKlxuICogVXBkYXRlcyB0aGUgdmVsb2NpdHkgb2YgYSBwaHlzaWNzIGJvZHkgZnJvbSBpdHMgYWNjdW11bGF0ZWQgZm9yY2UuXG4gKiAgICAgIHYgPC0gdiArIGR0ICogZiAvIG1cbiAqXG4gKiBAbWV0aG9kIGludGVncmF0ZVZlbG9jaXR5XG4gKiBAcGFyYW0ge0JvZHl9IHBoeXNpY3MgYm9keVxuICogQHBhcmFtIHtOdW1iZXJ9IGR0IGRlbHRhIHRpbWVcbiAqL1xuU3ltcGxlY3RpY0V1bGVyLnByb3RvdHlwZS5pbnRlZ3JhdGVWZWxvY2l0eSA9IGZ1bmN0aW9uIGludGVncmF0ZVZlbG9jaXR5KGJvZHksIGR0KSB7XG4gICAgdmFyIHYgPSBib2R5LnZlbG9jaXR5O1xuICAgIHZhciB3ID0gYm9keS5pbnZlcnNlTWFzcztcbiAgICB2YXIgZiA9IGJvZHkuZm9yY2U7XG5cbiAgICBpZiAoZi5pc1plcm8oKSkgcmV0dXJuO1xuXG4gICAgdi5hZGQoZi5tdWx0KGR0ICogdykpLnB1dCh2KTtcbiAgICBmLmNsZWFyKCk7XG59O1xuXG4vKlxuICogVXBkYXRlcyB0aGUgcG9zaXRpb24gb2YgYSBwaHlzaWNzIGJvZHkgZnJvbSBpdHMgdmVsb2NpdHkuXG4gKiAgICAgIHAgPC0gcCArIGR0ICogdlxuICpcbiAqIEBtZXRob2QgaW50ZWdyYXRlUG9zaXRpb25cbiAqIEBwYXJhbSB7Qm9keX0gcGh5c2ljcyBib2R5XG4gKiBAcGFyYW0ge051bWJlcn0gZHQgZGVsdGEgdGltZVxuICovXG5TeW1wbGVjdGljRXVsZXIucHJvdG90eXBlLmludGVncmF0ZVBvc2l0aW9uID0gZnVuY3Rpb24gaW50ZWdyYXRlUG9zaXRpb24oYm9keSwgZHQpIHtcbiAgICB2YXIgcCA9IGJvZHkucG9zaXRpb247XG4gICAgdmFyIHYgPSBib2R5LnZlbG9jaXR5O1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy52ZWxvY2l0eUNhcCkgdi5jYXAodGhpcy5vcHRpb25zLnZlbG9jaXR5Q2FwKS5wdXQodik7XG4gICAgcC5hZGQodi5tdWx0KGR0KSkucHV0KHApO1xufTtcblxuLypcbiAqIFVwZGF0ZXMgdGhlIGFuZ3VsYXIgbW9tZW50dW0gb2YgYSBwaHlzaWNzIGJvZHkgZnJvbSBpdHMgYWNjdW11bGVkIHRvcnF1ZS5cbiAqICAgICAgTCA8LSBMICsgZHQgKiB0XG4gKlxuICogQG1ldGhvZCBpbnRlZ3JhdGVBbmd1bGFyTW9tZW50dW1cbiAqIEBwYXJhbSB7Qm9keX0gcGh5c2ljcyBib2R5IChleGNlcHQgYSBwYXJ0aWNsZSlcbiAqIEBwYXJhbSB7TnVtYmVyfSBkdCBkZWx0YSB0aW1lXG4gKi9cblN5bXBsZWN0aWNFdWxlci5wcm90b3R5cGUuaW50ZWdyYXRlQW5ndWxhck1vbWVudHVtID0gZnVuY3Rpb24gaW50ZWdyYXRlQW5ndWxhck1vbWVudHVtKGJvZHksIGR0KSB7XG4gICAgdmFyIEwgPSBib2R5LmFuZ3VsYXJNb21lbnR1bTtcbiAgICB2YXIgdCA9IGJvZHkudG9ycXVlO1xuXG4gICAgaWYgKHQuaXNaZXJvKCkpIHJldHVybjtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5ndWxhclZlbG9jaXR5Q2FwKSB0LmNhcCh0aGlzLm9wdGlvbnMuYW5ndWxhclZlbG9jaXR5Q2FwKS5wdXQodCk7XG4gICAgTC5hZGQodC5tdWx0KGR0KSkucHV0KEwpO1xuICAgIHQuY2xlYXIoKTtcbn07XG5cbi8qXG4gKiBVcGRhdGVzIHRoZSBvcmllbnRhdGlvbiBvZiBhIHBoeXNpY3MgYm9keSBmcm9tIGl0cyBhbmd1bGFyIHZlbG9jaXR5LlxuICogICAgICBxIDwtIHEgKyBkdC8yICogcSAqIHdcbiAqXG4gKiBAbWV0aG9kIGludGVncmF0ZU9yaWVudGF0aW9uXG4gKiBAcGFyYW0ge0JvZHl9IHBoeXNpY3MgYm9keSAoZXhjZXB0IGEgcGFydGljbGUpXG4gKiBAcGFyYW0ge051bWJlcn0gZHQgZGVsdGEgdGltZVxuICovXG5TeW1wbGVjdGljRXVsZXIucHJvdG90eXBlLmludGVncmF0ZU9yaWVudGF0aW9uID0gZnVuY3Rpb24gaW50ZWdyYXRlT3JpZW50YXRpb24oYm9keSwgZHQpIHtcbiAgICB2YXIgcSA9IGJvZHkub3JpZW50YXRpb247XG4gICAgdmFyIHcgPSBib2R5LmFuZ3VsYXJWZWxvY2l0eTtcblxuICAgIGlmICh3LmlzWmVybygpKSByZXR1cm47XG4gICAgcS5hZGQocS5tdWx0aXBseSh3KS5zY2FsYXJNdWx0aXBseSgwLjUgKiBkdCkpLnB1dChxKTtcbi8vICAgICAgICBxLm5vcm1hbGl6ZS5wdXQocSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN5bXBsZWN0aWNFdWxlcjtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy9waHlzaWNzL2ludGVncmF0b3JzL1N5bXBsZWN0aWNFdWxlci5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvcGh5c2ljcy9pbnRlZ3JhdG9yc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IGRhdmlkQGZhbW8udXNcbiAqIEBsaWNlbnNlIE1QTCAyLjBcbiAqIEBjb3B5cmlnaHQgRmFtb3VzIEluZHVzdHJpZXMsIEluYy4gMjAxNFxuICovXG5cbnZhciBVdGlsaXR5ID0gcmVxdWlyZSgnLi4vdXRpbGl0aWVzL1V0aWxpdHknKTtcblxuLyoqXG4gKiBUcmFuc2l0aW9uIG1ldGEtbWV0aG9kIHRvIHN1cHBvcnQgdHJhbnNpdGlvbmluZyBtdWx0aXBsZVxuICogICB2YWx1ZXMgd2l0aCBzY2FsYXItb25seSBtZXRob2RzLlxuICpcbiAqXG4gKiBAY2xhc3MgTXVsdGlwbGVUcmFuc2l0aW9uXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbWV0aG9kIFRyYW5zaW9uYWJsZSBjbGFzcyB0byBtdWx0aXBsZXhcbiAqL1xuZnVuY3Rpb24gTXVsdGlwbGVUcmFuc2l0aW9uKG1ldGhvZCkge1xuICAgIHRoaXMubWV0aG9kID0gbWV0aG9kO1xuICAgIHRoaXMuX2luc3RhbmNlcyA9IFtdO1xuICAgIHRoaXMuc3RhdGUgPSBbXTtcbn1cblxuTXVsdGlwbGVUcmFuc2l0aW9uLlNVUFBPUlRTX01VTFRJUExFID0gdHJ1ZTtcblxuLyoqXG4gKiBHZXQgdGhlIHN0YXRlIG9mIGVhY2ggdHJhbnNpdGlvbi5cbiAqXG4gKiBAbWV0aG9kIGdldFxuICpcbiAqIEByZXR1cm4gc3RhdGUge051bWJlcnxBcnJheX0gc3RhdGUgYXJyYXlcbiAqL1xuTXVsdGlwbGVUcmFuc2l0aW9uLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBnZXQoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9pbnN0YW5jZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5zdGF0ZVtpXSA9IHRoaXMuX2luc3RhbmNlc1tpXS5nZXQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3RhdGU7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgZW5kIHN0YXRlcyB3aXRoIGEgc2hhcmVkIHRyYW5zaXRpb24sIHdpdGggb3B0aW9uYWwgY2FsbGJhY2suXG4gKlxuICogQG1ldGhvZCBzZXRcbiAqXG4gKiBAcGFyYW0ge051bWJlcnxBcnJheX0gZW5kU3RhdGUgRmluYWwgU3RhdGUuICBVc2UgYSBtdWx0aS1lbGVtZW50IGFyZ3VtZW50IGZvciBtdWx0aXBsZSB0cmFuc2l0aW9ucy5cbiAqIEBwYXJhbSB7T2JqZWN0fSB0cmFuc2l0aW9uIFRyYW5zaXRpb24gZGVmaW5pdGlvbiwgc2hhcmVkIGFtb25nIGFsbCBpbnN0YW5jZXNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGNhbGxlZCB3aGVuIGFsbCBlbmRTdGF0ZXMgaGF2ZSBiZWVuIHJlYWNoZWQuXG4gKi9cbk11bHRpcGxlVHJhbnNpdGlvbi5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KGVuZFN0YXRlLCB0cmFuc2l0aW9uLCBjYWxsYmFjaykge1xuICAgIHZhciBfYWxsQ2FsbGJhY2sgPSBVdGlsaXR5LmFmdGVyKGVuZFN0YXRlLmxlbmd0aCwgY2FsbGJhY2spO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW5kU3RhdGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKCF0aGlzLl9pbnN0YW5jZXNbaV0pIHRoaXMuX2luc3RhbmNlc1tpXSA9IG5ldyAodGhpcy5tZXRob2QpKCk7XG4gICAgICAgIHRoaXMuX2luc3RhbmNlc1tpXS5zZXQoZW5kU3RhdGVbaV0sIHRyYW5zaXRpb24sIF9hbGxDYWxsYmFjayk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZXNldCBhbGwgdHJhbnNpdGlvbnMgdG8gc3RhcnQgc3RhdGUuXG4gKlxuICogQG1ldGhvZCByZXNldFxuICpcbiAqIEBwYXJhbSAge051bWJlcnxBcnJheX0gc3RhcnRTdGF0ZSBTdGFydCBzdGF0ZVxuICovXG5NdWx0aXBsZVRyYW5zaXRpb24ucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gcmVzZXQoc3RhcnRTdGF0ZSkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhcnRTdGF0ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoIXRoaXMuX2luc3RhbmNlc1tpXSkgdGhpcy5faW5zdGFuY2VzW2ldID0gbmV3ICh0aGlzLm1ldGhvZCkoKTtcbiAgICAgICAgdGhpcy5faW5zdGFuY2VzW2ldLnJlc2V0KHN0YXJ0U3RhdGVbaV0pO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTXVsdGlwbGVUcmFuc2l0aW9uO1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL3RyYW5zaXRpb25zL011bHRpcGxlVHJhbnNpdGlvbi5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvdHJhbnNpdGlvbnNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyOiBkYXZpZEBmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG4vKmdsb2JhbCBjb25zb2xlKi9cblxudmFyIFBFID0gcmVxdWlyZSgnLi4vcGh5c2ljcy9QaHlzaWNzRW5naW5lJyk7XG52YXIgUGFydGljbGUgPSByZXF1aXJlKCcuLi9waHlzaWNzL2JvZGllcy9QYXJ0aWNsZScpO1xudmFyIFNwcmluZyA9IHJlcXVpcmUoJy4uL3BoeXNpY3MvZm9yY2VzL1NwcmluZycpO1xudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4uL21hdGgvVmVjdG9yJyk7XG5cbi8qKlxuICogU3ByaW5nVHJhbnNpdGlvbiBpcyBhIG1ldGhvZCBvZiB0cmFuc2l0aW9uaW5nIGJldHdlZW4gdHdvIHZhbHVlcyAobnVtYmVycyxcbiAqIG9yIGFycmF5cyBvZiBudW1iZXJzKSB3aXRoIGEgYm91bmNlLiBUaGUgdHJhbnNpdGlvbiB3aWxsIG92ZXJzaG9vdCB0aGUgdGFyZ2V0XG4gKiBzdGF0ZSBkZXBlbmRpbmcgb24gdGhlIHBhcmFtZXRlcnMgb2YgdGhlIHRyYW5zaXRpb24uXG4gKlxuICogQGNsYXNzIFNwcmluZ1RyYW5zaXRpb25cbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfEFycmF5fSBbc3RhdGU9MF0gSW5pdGlhbCBzdGF0ZVxuICovXG5mdW5jdGlvbiBTcHJpbmdUcmFuc2l0aW9uKHN0YXRlKSB7XG4gICAgc3RhdGUgPSBzdGF0ZSB8fCAwO1xuICAgIHRoaXMuZW5kU3RhdGUgID0gbmV3IFZlY3RvcihzdGF0ZSk7XG4gICAgdGhpcy5pbml0U3RhdGUgPSBuZXcgVmVjdG9yKCk7XG5cbiAgICB0aGlzLl9kaW1lbnNpb25zICAgICAgID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3Jlc3RUb2xlcmFuY2UgICAgPSAxZS0xMDtcbiAgICB0aGlzLl9hYnNSZXN0VG9sZXJhbmNlID0gdGhpcy5fcmVzdFRvbGVyYW5jZTtcbiAgICB0aGlzLl9jYWxsYmFjayAgICAgICAgID0gdW5kZWZpbmVkO1xuXG4gICAgdGhpcy5QRSAgICAgICA9IG5ldyBQRSgpO1xuICAgIHRoaXMuc3ByaW5nICAgPSBuZXcgU3ByaW5nKHthbmNob3IgOiB0aGlzLmVuZFN0YXRlfSk7XG4gICAgdGhpcy5wYXJ0aWNsZSA9IG5ldyBQYXJ0aWNsZSgpO1xuXG4gICAgdGhpcy5QRS5hZGRCb2R5KHRoaXMucGFydGljbGUpO1xuICAgIHRoaXMuUEUuYXR0YWNoKHRoaXMuc3ByaW5nLCB0aGlzLnBhcnRpY2xlKTtcbn1cblxuU3ByaW5nVHJhbnNpdGlvbi5TVVBQT1JUU19NVUxUSVBMRSA9IDM7XG5cbi8qKlxuICogQHByb3BlcnR5IFNwcmluZ1RyYW5zaXRpb24uREVGQVVMVF9PUFRJT05TXG4gKiBAdHlwZSBPYmplY3RcbiAqIEBwcm90ZWN0ZWRcbiAqIEBzdGF0aWNcbiAqL1xuU3ByaW5nVHJhbnNpdGlvbi5ERUZBVUxUX09QVElPTlMgPSB7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYW1vdW50IG9mIHRpbWUgaW4gbWlsbGlzZWNvbmRzIHRha2VuIGZvciBvbmUgY29tcGxldGUgb3NjaWxsYXRpb25cbiAgICAgKiB3aGVuIHRoZXJlIGlzIG5vIGRhbXBpbmdcbiAgICAgKiAgICBSYW5nZSA6IFswLCBJbmZpbml0eV1cbiAgICAgKlxuICAgICAqIEBhdHRyaWJ1dGUgcGVyaW9kXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICogQGRlZmF1bHQgMzAwXG4gICAgICovXG4gICAgcGVyaW9kIDogMzAwLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGRhbXBpbmcgb2YgdGhlIHNuYXAuXG4gICAgICogICAgUmFuZ2UgOiBbMCwgMV1cbiAgICAgKiAgICAwID0gbm8gZGFtcGluZywgYW5kIHRoZSBzcHJpbmcgd2lsbCBvc2NpbGxhdGUgZm9yZXZlclxuICAgICAqICAgIDEgPSBjcml0aWNhbGx5IGRhbXBlZCAodGhlIHNwcmluZyB3aWxsIG5ldmVyIG9zY2lsbGF0ZSlcbiAgICAgKlxuICAgICAqIEBhdHRyaWJ1dGUgZGFtcGluZ1JhdGlvXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICogQGRlZmF1bHQgMC41XG4gICAgICovXG4gICAgZGFtcGluZ1JhdGlvIDogMC41LFxuXG4gICAgLyoqXG4gICAgICogVGhlIGluaXRpYWwgdmVsb2NpdHkgb2YgdGhlIHRyYW5zaXRpb24uXG4gICAgICpcbiAgICAgKiBAYXR0cmlidXRlIHZlbG9jaXR5XG4gICAgICogQHR5cGUgTnVtYmVyfEFycmF5XG4gICAgICogQGRlZmF1bHQgMFxuICAgICAqL1xuICAgIHZlbG9jaXR5IDogMFxufTtcblxuZnVuY3Rpb24gX2dldEVuZXJneSgpIHtcbiAgICByZXR1cm4gdGhpcy5wYXJ0aWNsZS5nZXRFbmVyZ3koKSArIHRoaXMuc3ByaW5nLmdldEVuZXJneSh0aGlzLnBhcnRpY2xlKTtcbn1cblxuZnVuY3Rpb24gX3NldFBhcnRpY2xlUG9zaXRpb24ocCkge1xuICAgIHRoaXMucGFydGljbGUuc2V0UG9zaXRpb24ocCk7XG59XG5cbmZ1bmN0aW9uIF9zZXRQYXJ0aWNsZVZlbG9jaXR5KHYpIHtcbiAgICB0aGlzLnBhcnRpY2xlLnNldFZlbG9jaXR5KHYpO1xufVxuXG5mdW5jdGlvbiBfZ2V0UGFydGljbGVQb3NpdGlvbigpIHtcbiAgICByZXR1cm4gKHRoaXMuX2RpbWVuc2lvbnMgPT09IDApXG4gICAgICAgID8gdGhpcy5wYXJ0aWNsZS5nZXRQb3NpdGlvbjFEKClcbiAgICAgICAgOiB0aGlzLnBhcnRpY2xlLmdldFBvc2l0aW9uKCk7XG59XG5cbmZ1bmN0aW9uIF9nZXRQYXJ0aWNsZVZlbG9jaXR5KCkge1xuICAgIHJldHVybiAodGhpcy5fZGltZW5zaW9ucyA9PT0gMClcbiAgICAgICAgPyB0aGlzLnBhcnRpY2xlLmdldFZlbG9jaXR5MUQoKVxuICAgICAgICA6IHRoaXMucGFydGljbGUuZ2V0VmVsb2NpdHkoKTtcbn1cblxuZnVuY3Rpb24gX3NldENhbGxiYWNrKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fY2FsbGJhY2sgPSBjYWxsYmFjaztcbn1cblxuZnVuY3Rpb24gX3dha2UoKSB7XG4gICAgdGhpcy5QRS53YWtlKCk7XG59XG5cbmZ1bmN0aW9uIF9zbGVlcCgpIHtcbiAgICB0aGlzLlBFLnNsZWVwKCk7XG59XG5cbmZ1bmN0aW9uIF91cGRhdGUoKSB7XG4gICAgaWYgKHRoaXMuUEUuaXNTbGVlcGluZygpKSB7XG4gICAgICAgIGlmICh0aGlzLl9jYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGNiID0gdGhpcy5fY2FsbGJhY2s7XG4gICAgICAgICAgICB0aGlzLl9jYWxsYmFjayA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNiKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChfZ2V0RW5lcmd5LmNhbGwodGhpcykgPCB0aGlzLl9hYnNSZXN0VG9sZXJhbmNlKSB7XG4gICAgICAgIF9zZXRQYXJ0aWNsZVBvc2l0aW9uLmNhbGwodGhpcywgdGhpcy5lbmRTdGF0ZSk7XG4gICAgICAgIF9zZXRQYXJ0aWNsZVZlbG9jaXR5LmNhbGwodGhpcywgWzAsMCwwXSk7XG4gICAgICAgIF9zbGVlcC5jYWxsKHRoaXMpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gX3NldHVwRGVmaW5pdGlvbihkZWZpbml0aW9uKSB7XG4gICAgLy8gVE9ETyBmaXggbm8tY29uc29sZSBlcnJvclxuICAgIC8qIGVzbGludCBuby1jb25zb2xlOiAwICovXG4gICAgdmFyIGRlZmF1bHRzID0gU3ByaW5nVHJhbnNpdGlvbi5ERUZBVUxUX09QVElPTlM7XG4gICAgaWYgKGRlZmluaXRpb24ucGVyaW9kID09PSB1bmRlZmluZWQpICAgICAgIGRlZmluaXRpb24ucGVyaW9kICAgICAgID0gZGVmYXVsdHMucGVyaW9kO1xuICAgIGlmIChkZWZpbml0aW9uLmRhbXBpbmdSYXRpbyA9PT0gdW5kZWZpbmVkKSBkZWZpbml0aW9uLmRhbXBpbmdSYXRpbyA9IGRlZmF1bHRzLmRhbXBpbmdSYXRpbztcbiAgICBpZiAoZGVmaW5pdGlvbi52ZWxvY2l0eSA9PT0gdW5kZWZpbmVkKSAgICAgZGVmaW5pdGlvbi52ZWxvY2l0eSAgICAgPSBkZWZhdWx0cy52ZWxvY2l0eTtcblxuICAgIGlmIChkZWZpbml0aW9uLnBlcmlvZCA8IDE1MCkge1xuICAgICAgICBkZWZpbml0aW9uLnBlcmlvZCA9IDE1MDtcbiAgICAgICAgY29uc29sZS53YXJuKCdUaGUgcGVyaW9kIG9mIGEgU3ByaW5nVHJhbnNpdGlvbiBpcyBjYXBwZWQgYXQgMTUwIG1zLiBVc2UgYSBTbmFwVHJhbnNpdGlvbiBmb3IgZmFzdGVyIHRyYW5zaXRpb25zJyk7XG4gICAgfVxuXG4gICAgLy9zZXR1cCBzcHJpbmdcbiAgICB0aGlzLnNwcmluZy5zZXRPcHRpb25zKHtcbiAgICAgICAgcGVyaW9kICAgICAgIDogZGVmaW5pdGlvbi5wZXJpb2QsXG4gICAgICAgIGRhbXBpbmdSYXRpbyA6IGRlZmluaXRpb24uZGFtcGluZ1JhdGlvXG4gICAgfSk7XG5cbiAgICAvL3NldHVwIHBhcnRpY2xlXG4gICAgX3NldFBhcnRpY2xlVmVsb2NpdHkuY2FsbCh0aGlzLCBkZWZpbml0aW9uLnZlbG9jaXR5KTtcbn1cblxuZnVuY3Rpb24gX3NldEFic29sdXRlUmVzdFRvbGVyYW5jZSgpIHtcbiAgICB2YXIgZGlzdGFuY2UgPSB0aGlzLmVuZFN0YXRlLnN1Yih0aGlzLmluaXRTdGF0ZSkubm9ybVNxdWFyZWQoKTtcbiAgICB0aGlzLl9hYnNSZXN0VG9sZXJhbmNlID0gKGRpc3RhbmNlID09PSAwKVxuICAgICAgICA/IHRoaXMuX3Jlc3RUb2xlcmFuY2VcbiAgICAgICAgOiB0aGlzLl9yZXN0VG9sZXJhbmNlICogZGlzdGFuY2U7XG59XG5cbmZ1bmN0aW9uIF9zZXRUYXJnZXQodGFyZ2V0KSB7XG4gICAgdGhpcy5lbmRTdGF0ZS5zZXQodGFyZ2V0KTtcbiAgICBfc2V0QWJzb2x1dGVSZXN0VG9sZXJhbmNlLmNhbGwodGhpcyk7XG59XG5cbi8qKlxuICogUmVzZXRzIHRoZSBwb3NpdGlvbiBhbmQgdmVsb2NpdHlcbiAqXG4gKiBAbWV0aG9kIHJlc2V0XG4gKlxuICogQHBhcmFtIHtOdW1iZXJ8QXJyYXkuTnVtYmVyfSBwb3MgcG9zaXRpb25hbCBzdGF0ZVxuICogQHBhcmFtIHtOdW1iZXJ8QXJyYXl9IHZlbCB2ZWxvY2l0eVxuICovXG5TcHJpbmdUcmFuc2l0aW9uLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uIHJlc2V0KHBvcywgdmVsKSB7XG4gICAgdGhpcy5fZGltZW5zaW9ucyA9IChwb3MgaW5zdGFuY2VvZiBBcnJheSlcbiAgICAgICAgPyBwb3MubGVuZ3RoXG4gICAgICAgIDogMDtcblxuICAgIHRoaXMuaW5pdFN0YXRlLnNldChwb3MpO1xuICAgIF9zZXRQYXJ0aWNsZVBvc2l0aW9uLmNhbGwodGhpcywgcG9zKTtcbiAgICBfc2V0VGFyZ2V0LmNhbGwodGhpcywgcG9zKTtcbiAgICBpZiAodmVsKSBfc2V0UGFydGljbGVWZWxvY2l0eS5jYWxsKHRoaXMsIHZlbCk7XG4gICAgX3NldENhbGxiYWNrLmNhbGwodGhpcywgdW5kZWZpbmVkKTtcbn07XG5cbi8qKlxuICogR2V0dGVyIGZvciB2ZWxvY2l0eVxuICpcbiAqIEBtZXRob2QgZ2V0VmVsb2NpdHlcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ8QXJyYXl9IHZlbG9jaXR5XG4gKi9cblNwcmluZ1RyYW5zaXRpb24ucHJvdG90eXBlLmdldFZlbG9jaXR5ID0gZnVuY3Rpb24gZ2V0VmVsb2NpdHkoKSB7XG4gICAgcmV0dXJuIF9nZXRQYXJ0aWNsZVZlbG9jaXR5LmNhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIFNldHRlciBmb3IgdmVsb2NpdHlcbiAqXG4gKiBAbWV0aG9kIHNldFZlbG9jaXR5XG4gKlxuICogQHJldHVybiB7TnVtYmVyfEFycmF5fSB2ZWxvY2l0eVxuICovXG5TcHJpbmdUcmFuc2l0aW9uLnByb3RvdHlwZS5zZXRWZWxvY2l0eSA9IGZ1bmN0aW9uIHNldFZlbG9jaXR5KHYpIHtcbiAgICB0aGlzLmNhbGwodGhpcywgX3NldFBhcnRpY2xlVmVsb2NpdHkodikpO1xufTtcblxuLyoqXG4gKiBEZXRlY3RzIHdoZXRoZXIgYSB0cmFuc2l0aW9uIGlzIGluIHByb2dyZXNzXG4gKlxuICogQG1ldGhvZCBpc0FjdGl2ZVxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblNwcmluZ1RyYW5zaXRpb24ucHJvdG90eXBlLmlzQWN0aXZlID0gZnVuY3Rpb24gaXNBY3RpdmUoKSB7XG4gICAgcmV0dXJuICF0aGlzLlBFLmlzU2xlZXBpbmcoKTtcbn07XG5cbi8qKlxuICogSGFsdCB0aGUgdHJhbnNpdGlvblxuICpcbiAqIEBtZXRob2QgaGFsdFxuICovXG5TcHJpbmdUcmFuc2l0aW9uLnByb3RvdHlwZS5oYWx0ID0gZnVuY3Rpb24gaGFsdCgpIHtcbiAgICB0aGlzLnNldCh0aGlzLmdldCgpKTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSBjdXJyZW50IHBvc2l0aW9uIG9mIHRoZSB0cmFuc2l0aW9uXG4gKlxuICogQG1ldGhvZCBnZXRcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ8QXJyYXl9IHN0YXRlXG4gKi9cblNwcmluZ1RyYW5zaXRpb24ucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldCgpIHtcbiAgICBfdXBkYXRlLmNhbGwodGhpcyk7XG4gICAgcmV0dXJuIF9nZXRQYXJ0aWNsZVBvc2l0aW9uLmNhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgZW5kIHBvc2l0aW9uIGFuZCB0cmFuc2l0aW9uLCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIG9uIGNvbXBsZXRpb24uXG4gKlxuICogQG1ldGhvZCBzZXRcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ8QXJyYXl9IGVuZFN0YXRlIEZpbmFsIHN0YXRlXG4gKiBAcGFyYW0ge09iamVjdH0gIGRlZmluaXRpb24gIFRyYW5zaXRpb24gZGVmaW5pdGlvblxuICogQHBhcmFtICB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrXG4gKi9cblNwcmluZ1RyYW5zaXRpb24ucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldChlbmRTdGF0ZSwgZGVmaW5pdGlvbiwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWRlZmluaXRpb24pIHtcbiAgICAgICAgdGhpcy5yZXNldChlbmRTdGF0ZSk7XG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX2RpbWVuc2lvbnMgPSAoZW5kU3RhdGUgaW5zdGFuY2VvZiBBcnJheSlcbiAgICAgICAgPyBlbmRTdGF0ZS5sZW5ndGhcbiAgICAgICAgOiAwO1xuXG4gICAgX3dha2UuY2FsbCh0aGlzKTtcbiAgICBfc2V0dXBEZWZpbml0aW9uLmNhbGwodGhpcywgZGVmaW5pdGlvbik7XG4gICAgX3NldFRhcmdldC5jYWxsKHRoaXMsIGVuZFN0YXRlKTtcbiAgICBfc2V0Q2FsbGJhY2suY2FsbCh0aGlzLCBjYWxsYmFjayk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNwcmluZ1RyYW5zaXRpb247XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvdHJhbnNpdGlvbnMvU3ByaW5nVHJhbnNpdGlvbi5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvdHJhbnNpdGlvbnNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gKiBMaWNlbnNlLCB2LiAyLjAuIElmIGEgY29weSBvZiB0aGUgTVBMIHdhcyBub3QgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzXG4gKiBmaWxlLCBZb3UgY2FuIG9idGFpbiBvbmUgYXQgaHR0cDovL21vemlsbGEub3JnL01QTC8yLjAvLlxuICpcbiAqIE93bmVyOiBkYXZpZEBmYW1vLnVzXG4gKiBAbGljZW5zZSBNUEwgMi4wXG4gKiBAY29weXJpZ2h0IEZhbW91cyBJbmR1c3RyaWVzLCBJbmMuIDIwMTRcbiAqL1xuXG52YXIgTXVsdGlwbGVUcmFuc2l0aW9uID0gcmVxdWlyZSgnLi9NdWx0aXBsZVRyYW5zaXRpb24nKTtcbnZhciBUd2VlblRyYW5zaXRpb24gPSByZXF1aXJlKCcuL1R3ZWVuVHJhbnNpdGlvbicpO1xuXG4vKipcbiAqIEEgc3RhdGUgbWFpbnRhaW5lciBmb3IgYSBzbW9vdGggdHJhbnNpdGlvbiBiZXR3ZWVuXG4gKiAgICBudW1lcmljYWxseS1zcGVjaWZpZWQgc3RhdGVzLiBFeGFtcGxlIG51bWVyaWMgc3RhdGVzIGluY2x1ZGUgZmxvYXRzIG9yXG4gKiAgICBUcmFuc2Zvcm0gb2JqZWN0cy5cbiAqXG4gKiBBbiBpbml0aWFsIHN0YXRlIGlzIHNldCB3aXRoIHRoZSBjb25zdHJ1Y3RvciBvciBzZXQoc3RhcnRTdGF0ZSkuIEFcbiAqICAgIGNvcnJlc3BvbmRpbmcgZW5kIHN0YXRlIGFuZCB0cmFuc2l0aW9uIGFyZSBzZXQgd2l0aCBzZXQoZW5kU3RhdGUsXG4gKiAgICB0cmFuc2l0aW9uKS4gU3Vic2VxdWVudCBjYWxscyB0byBzZXQoZW5kU3RhdGUsIHRyYW5zaXRpb24pIGJlZ2luIGF0XG4gKiAgICB0aGUgbGFzdCBzdGF0ZS4gQ2FsbHMgdG8gZ2V0KHRpbWVzdGFtcCkgcHJvdmlkZSB0aGUgaW50ZXJwb2xhdGVkIHN0YXRlXG4gKiAgICBhbG9uZyB0aGUgd2F5LlxuICpcbiAqIE5vdGUgdGhhdCB0aGVyZSBpcyBubyBldmVudCBsb29wIGhlcmUgLSBjYWxscyB0byBnZXQoKSBhcmUgdGhlIG9ubHkgd2F5XG4gKiAgICB0byBmaW5kIHN0YXRlIHByb2plY3RlZCB0byB0aGUgY3VycmVudCAob3IgcHJvdmlkZWQpIHRpbWUgYW5kIGFyZVxuICogICAgdGhlIG9ubHkgd2F5IHRvIHRyaWdnZXIgY2FsbGJhY2tzLiBVc3VhbGx5IHRoaXMga2luZCBvZiBvYmplY3Qgd291bGRcbiAqICAgIGJlIHBhcnQgb2YgdGhlIHJlbmRlcigpIHBhdGggb2YgYSB2aXNpYmxlIGNvbXBvbmVudC5cbiAqXG4gKiBAY2xhc3MgVHJhbnNpdGlvbmFibGVcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtudW1iZXJ8QXJyYXkuTnVtYmVyfE9iamVjdC48bnVtYmVyfHN0cmluZywgbnVtYmVyPn0gc3RhcnRcbiAqICAgIGJlZ2lubmluZyBzdGF0ZVxuICovXG5mdW5jdGlvbiBUcmFuc2l0aW9uYWJsZShzdGFydCkge1xuICAgIHRoaXMuY3VycmVudEFjdGlvbiA9IG51bGw7XG4gICAgdGhpcy5hY3Rpb25RdWV1ZSA9IFtdO1xuICAgIHRoaXMuY2FsbGJhY2tRdWV1ZSA9IFtdO1xuXG4gICAgdGhpcy5zdGF0ZSA9IDA7XG4gICAgdGhpcy52ZWxvY2l0eSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9jYWxsYmFjayA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9lbmdpbmVJbnN0YW5jZSA9IG51bGw7XG4gICAgdGhpcy5fY3VycmVudE1ldGhvZCA9IG51bGw7XG5cbiAgICB0aGlzLnNldChzdGFydCk7XG59XG5cbnZhciB0cmFuc2l0aW9uTWV0aG9kcyA9IHt9O1xuXG5UcmFuc2l0aW9uYWJsZS5yZWdpc3Rlck1ldGhvZCA9IGZ1bmN0aW9uIHJlZ2lzdGVyTWV0aG9kKG5hbWUsIGVuZ2luZUNsYXNzKSB7XG4gICAgaWYgKCEobmFtZSBpbiB0cmFuc2l0aW9uTWV0aG9kcykpIHtcbiAgICAgICAgdHJhbnNpdGlvbk1ldGhvZHNbbmFtZV0gPSBlbmdpbmVDbGFzcztcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGVsc2UgcmV0dXJuIGZhbHNlO1xufTtcblxuVHJhbnNpdGlvbmFibGUudW5yZWdpc3Rlck1ldGhvZCA9IGZ1bmN0aW9uIHVucmVnaXN0ZXJNZXRob2QobmFtZSkge1xuICAgIGlmIChuYW1lIGluIHRyYW5zaXRpb25NZXRob2RzKSB7XG4gICAgICAgIGRlbGV0ZSB0cmFuc2l0aW9uTWV0aG9kc1tuYW1lXTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGVsc2UgcmV0dXJuIGZhbHNlO1xufTtcblxuZnVuY3Rpb24gX2xvYWROZXh0KCkge1xuICAgIGlmICh0aGlzLl9jYWxsYmFjaykge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSB0aGlzLl9jYWxsYmFjaztcbiAgICAgICAgdGhpcy5fY2FsbGJhY2sgPSB1bmRlZmluZWQ7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmFjdGlvblF1ZXVlLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHRoaXMuc2V0KHRoaXMuZ2V0KCkpOyAvLyBubyB1cGRhdGUgcmVxdWlyZWRcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmN1cnJlbnRBY3Rpb24gPSB0aGlzLmFjdGlvblF1ZXVlLnNoaWZ0KCk7XG4gICAgdGhpcy5fY2FsbGJhY2sgPSB0aGlzLmNhbGxiYWNrUXVldWUuc2hpZnQoKTtcblxuICAgIHZhciBtZXRob2QgPSBudWxsO1xuICAgIHZhciBlbmRWYWx1ZSA9IHRoaXMuY3VycmVudEFjdGlvblswXTtcbiAgICB2YXIgdHJhbnNpdGlvbiA9IHRoaXMuY3VycmVudEFjdGlvblsxXTtcbiAgICBpZiAodHJhbnNpdGlvbiBpbnN0YW5jZW9mIE9iamVjdCAmJiB0cmFuc2l0aW9uLm1ldGhvZCkge1xuICAgICAgICBtZXRob2QgPSB0cmFuc2l0aW9uLm1ldGhvZDtcbiAgICAgICAgaWYgKHR5cGVvZiBtZXRob2QgPT09ICdzdHJpbmcnKSBtZXRob2QgPSB0cmFuc2l0aW9uTWV0aG9kc1ttZXRob2RdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbWV0aG9kID0gVHdlZW5UcmFuc2l0aW9uO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9jdXJyZW50TWV0aG9kICE9PSBtZXRob2QpIHtcbiAgICAgICAgaWYgKCEoZW5kVmFsdWUgaW5zdGFuY2VvZiBPYmplY3QpIHx8IG1ldGhvZC5TVVBQT1JUU19NVUxUSVBMRSA9PT0gdHJ1ZSB8fCBlbmRWYWx1ZS5sZW5ndGggPD0gbWV0aG9kLlNVUFBPUlRTX01VTFRJUExFKSB7XG4gICAgICAgICAgICB0aGlzLl9lbmdpbmVJbnN0YW5jZSA9IG5ldyBtZXRob2QoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2VuZ2luZUluc3RhbmNlID0gbmV3IE11bHRpcGxlVHJhbnNpdGlvbihtZXRob2QpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2N1cnJlbnRNZXRob2QgPSBtZXRob2Q7XG4gICAgfVxuXG4gICAgdGhpcy5fZW5naW5lSW5zdGFuY2UucmVzZXQodGhpcy5zdGF0ZSwgdGhpcy52ZWxvY2l0eSk7XG4gICAgaWYgKHRoaXMudmVsb2NpdHkgIT09IHVuZGVmaW5lZCkgdHJhbnNpdGlvbi52ZWxvY2l0eSA9IHRoaXMudmVsb2NpdHk7XG4gICAgdGhpcy5fZW5naW5lSW5zdGFuY2Uuc2V0KGVuZFZhbHVlLCB0cmFuc2l0aW9uLCBfbG9hZE5leHQuYmluZCh0aGlzKSk7XG59XG5cbi8qKlxuICogQWRkIHRyYW5zaXRpb24gdG8gZW5kIHN0YXRlIHRvIHRoZSBxdWV1ZSBvZiBwZW5kaW5nIHRyYW5zaXRpb25zLiBTcGVjaWFsXG4gKiAgICBVc2U6IGNhbGxpbmcgd2l0aG91dCBhIHRyYW5zaXRpb24gcmVzZXRzIHRoZSBvYmplY3QgdG8gdGhhdCBzdGF0ZSB3aXRoXG4gKiAgICBubyBwZW5kaW5nIGFjdGlvbnNcbiAqXG4gKiBAbWV0aG9kIHNldFxuICpcbiAqIEBwYXJhbSB7bnVtYmVyfEZhbW91c01hdHJpeHxBcnJheS5OdW1iZXJ8T2JqZWN0LjxudW1iZXIsIG51bWJlcj59IGVuZFN0YXRlXG4gKiAgICBlbmQgc3RhdGUgdG8gd2hpY2ggd2UgaW50ZXJwb2xhdGVcbiAqIEBwYXJhbSB7dHJhbnNpdGlvbj19IHRyYW5zaXRpb24gb2JqZWN0IG9mIHR5cGUge2R1cmF0aW9uOiBudW1iZXIsIGN1cnZlOlxuICogICAgZlswLDFdIC0+IFswLDFdIG9yIG5hbWV9LiBJZiB0cmFuc2l0aW9uIGlzIG9taXR0ZWQsIGNoYW5nZSB3aWxsIGJlXG4gKiAgICBpbnN0YW50YW5lb3VzLlxuICogQHBhcmFtIHtmdW5jdGlvbigpPX0gY2FsbGJhY2sgWmVyby1hcmd1bWVudCBmdW5jdGlvbiB0byBjYWxsIG9uIG9ic2VydmVkXG4gKiAgICBjb21wbGV0aW9uICh0PTEpXG4gKi9cblRyYW5zaXRpb25hYmxlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiBzZXQoZW5kU3RhdGUsIHRyYW5zaXRpb24sIGNhbGxiYWNrKSB7XG4gICAgaWYgKCF0cmFuc2l0aW9uKSB7XG4gICAgICAgIHRoaXMucmVzZXQoZW5kU3RhdGUpO1xuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHZhciBhY3Rpb24gPSBbZW5kU3RhdGUsIHRyYW5zaXRpb25dO1xuICAgIHRoaXMuYWN0aW9uUXVldWUucHVzaChhY3Rpb24pO1xuICAgIHRoaXMuY2FsbGJhY2tRdWV1ZS5wdXNoKGNhbGxiYWNrKTtcbiAgICBpZiAoIXRoaXMuY3VycmVudEFjdGlvbikgX2xvYWROZXh0LmNhbGwodGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENhbmNlbCBhbGwgdHJhbnNpdGlvbnMgYW5kIHJlc2V0IHRvIGEgc3RhYmxlIHN0YXRlXG4gKlxuICogQG1ldGhvZCByZXNldFxuICpcbiAqIEBwYXJhbSB7bnVtYmVyfEFycmF5Lk51bWJlcnxPYmplY3QuPG51bWJlciwgbnVtYmVyPn0gc3RhcnRTdGF0ZVxuICogICAgc3RhYmxlIHN0YXRlIHRvIHNldCB0b1xuICovXG5UcmFuc2l0aW9uYWJsZS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiByZXNldChzdGFydFN0YXRlLCBzdGFydFZlbG9jaXR5KSB7XG4gICAgdGhpcy5fY3VycmVudE1ldGhvZCA9IG51bGw7XG4gICAgdGhpcy5fZW5naW5lSW5zdGFuY2UgPSBudWxsO1xuICAgIHRoaXMuX2NhbGxiYWNrID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuc3RhdGUgPSBzdGFydFN0YXRlO1xuICAgIHRoaXMudmVsb2NpdHkgPSBzdGFydFZlbG9jaXR5O1xuICAgIHRoaXMuY3VycmVudEFjdGlvbiA9IG51bGw7XG4gICAgdGhpcy5hY3Rpb25RdWV1ZSA9IFtdO1xuICAgIHRoaXMuY2FsbGJhY2tRdWV1ZSA9IFtdO1xufTtcblxuLyoqXG4gKiBBZGQgZGVsYXkgYWN0aW9uIHRvIHRoZSBwZW5kaW5nIGFjdGlvbiBxdWV1ZSBxdWV1ZS5cbiAqXG4gKiBAbWV0aG9kIGRlbGF5XG4gKlxuICogQHBhcmFtIHtudW1iZXJ9IGR1cmF0aW9uIGRlbGF5IHRpbWUgKG1zKVxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgWmVyby1hcmd1bWVudCBmdW5jdGlvbiB0byBjYWxsIG9uIG9ic2VydmVkXG4gKiAgICBjb21wbGV0aW9uICh0PTEpXG4gKi9cblRyYW5zaXRpb25hYmxlLnByb3RvdHlwZS5kZWxheSA9IGZ1bmN0aW9uIGRlbGF5KGR1cmF0aW9uLCBjYWxsYmFjaykge1xuICAgIHRoaXMuc2V0KHRoaXMuZ2V0KCksIHtkdXJhdGlvbjogZHVyYXRpb24sXG4gICAgICAgIGN1cnZlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9fSxcbiAgICAgICAgY2FsbGJhY2tcbiAgICApO1xufTtcblxuLyoqXG4gKiBHZXQgaW50ZXJwb2xhdGVkIHN0YXRlIG9mIGN1cnJlbnQgYWN0aW9uIGF0IHByb3ZpZGVkIHRpbWUuIElmIHRoZSBsYXN0XG4gKiAgICBhY3Rpb24gaGFzIGNvbXBsZXRlZCwgaW52b2tlIGl0cyBjYWxsYmFjay5cbiAqXG4gKiBAbWV0aG9kIGdldFxuICpcbiAqIEBwYXJhbSB7bnVtYmVyPX0gdGltZXN0YW1wIEV2YWx1YXRlIHRoZSBjdXJ2ZSBhdCBhIG5vcm1hbGl6ZWQgdmVyc2lvbiBvZiB0aGlzXG4gKiAgICB0aW1lLiBJZiBvbWl0dGVkLCB1c2UgY3VycmVudCB0aW1lLiAoVW5peCBlcG9jaCB0aW1lKVxuICogQHJldHVybiB7bnVtYmVyfE9iamVjdC48bnVtYmVyfHN0cmluZywgbnVtYmVyPn0gYmVnaW5uaW5nIHN0YXRlXG4gKiAgICBpbnRlcnBvbGF0ZWQgdG8gdGhpcyBwb2ludCBpbiB0aW1lLlxuICovXG5UcmFuc2l0aW9uYWJsZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0KHRpbWVzdGFtcCkge1xuICAgIGlmICh0aGlzLl9lbmdpbmVJbnN0YW5jZSkge1xuICAgICAgICBpZiAodGhpcy5fZW5naW5lSW5zdGFuY2UuZ2V0VmVsb2NpdHkpXG4gICAgICAgICAgICB0aGlzLnZlbG9jaXR5ID0gdGhpcy5fZW5naW5lSW5zdGFuY2UuZ2V0VmVsb2NpdHkoKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuX2VuZ2luZUluc3RhbmNlLmdldCh0aW1lc3RhbXApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0ZTtcbn07XG5cbi8qKlxuICogSXMgdGhlcmUgYXQgbGVhc3Qgb25lIGFjdGlvbiBwZW5kaW5nIGNvbXBsZXRpb24/XG4gKlxuICogQG1ldGhvZCBpc0FjdGl2ZVxuICpcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cblRyYW5zaXRpb25hYmxlLnByb3RvdHlwZS5pc0FjdGl2ZSA9IGZ1bmN0aW9uIGlzQWN0aXZlKCkge1xuICAgIHJldHVybiAhIXRoaXMuY3VycmVudEFjdGlvbjtcbn07XG5cbi8qKlxuICogSGFsdCB0cmFuc2l0aW9uIGF0IGN1cnJlbnQgc3RhdGUgYW5kIGVyYXNlIGFsbCBwZW5kaW5nIGFjdGlvbnMuXG4gKlxuICogQG1ldGhvZCBoYWx0XG4gKi9cblRyYW5zaXRpb25hYmxlLnByb3RvdHlwZS5oYWx0ID0gZnVuY3Rpb24gaGFsdCgpIHtcbiAgICB0aGlzLnNldCh0aGlzLmdldCgpKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNpdGlvbmFibGU7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvdHJhbnNpdGlvbnMvVHJhbnNpdGlvbmFibGUuanNcIixcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL3RyYW5zaXRpb25zXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogZGF2aWRAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxudmFyIFRyYW5zaXRpb25hYmxlID0gcmVxdWlyZSgnLi9UcmFuc2l0aW9uYWJsZScpO1xudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4uL2NvcmUvVHJhbnNmb3JtJyk7XG52YXIgVXRpbGl0eSA9IHJlcXVpcmUoJy4uL3V0aWxpdGllcy9VdGlsaXR5Jyk7XG5cbi8qKlxuICogQSBjbGFzcyBmb3IgdHJhbnNpdGlvbmluZyB0aGUgc3RhdGUgb2YgYSBUcmFuc2Zvcm0gYnkgdHJhbnNpdGlvbmluZ1xuICogaXRzIHRyYW5zbGF0ZSwgc2NhbGUsIHNrZXcgYW5kIHJvdGF0ZSBjb21wb25lbnRzIGluZGVwZW5kZW50bHkuXG4gKlxuICogQGNsYXNzIFRyYW5zaXRpb25hYmxlVHJhbnNmb3JtXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0gW3RyYW5zZm9ybT1UcmFuc2Zvcm0uaWRlbnRpdHldIHtUcmFuc2Zvcm19IFRoZSBpbml0aWFsIHRyYW5zZm9ybSBzdGF0ZVxuICovXG5mdW5jdGlvbiBUcmFuc2l0aW9uYWJsZVRyYW5zZm9ybSh0cmFuc2Zvcm0pIHtcbiAgICB0aGlzLl9maW5hbCA9IFRyYW5zZm9ybS5pZGVudGl0eS5zbGljZSgpO1xuICAgIHRoaXMudHJhbnNsYXRlID0gbmV3IFRyYW5zaXRpb25hYmxlKFswLCAwLCAwXSk7XG4gICAgdGhpcy5yb3RhdGUgPSBuZXcgVHJhbnNpdGlvbmFibGUoWzAsIDAsIDBdKTtcbiAgICB0aGlzLnNrZXcgPSBuZXcgVHJhbnNpdGlvbmFibGUoWzAsIDAsIDBdKTtcbiAgICB0aGlzLnNjYWxlID0gbmV3IFRyYW5zaXRpb25hYmxlKFsxLCAxLCAxXSk7XG5cbiAgICBpZiAodHJhbnNmb3JtKSB0aGlzLnNldCh0cmFuc2Zvcm0pO1xufVxuXG5mdW5jdGlvbiBfYnVpbGQoKSB7XG4gICAgcmV0dXJuIFRyYW5zZm9ybS5idWlsZCh7XG4gICAgICAgIHRyYW5zbGF0ZTogdGhpcy50cmFuc2xhdGUuZ2V0KCksXG4gICAgICAgIHJvdGF0ZTogdGhpcy5yb3RhdGUuZ2V0KCksXG4gICAgICAgIHNrZXc6IHRoaXMuc2tldy5nZXQoKSxcbiAgICAgICAgc2NhbGU6IHRoaXMuc2NhbGUuZ2V0KClcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBBbiBvcHRpbWl6ZWQgd2F5IG9mIHNldHRpbmcgb25seSB0aGUgdHJhbnNsYXRpb24gY29tcG9uZW50IG9mIGEgVHJhbnNmb3JtXG4gKlxuICogQG1ldGhvZCBzZXRUcmFuc2xhdGVcbiAqIEBjaGFpbmFibGVcbiAqXG4gKiBAcGFyYW0gdHJhbnNsYXRlIHtBcnJheX0gICAgIE5ldyB0cmFuc2xhdGlvbiBzdGF0ZVxuICogQHBhcmFtIFt0cmFuc2l0aW9uXSB7T2JqZWN0fSBUcmFuc2l0aW9uIGRlZmluaXRpb25cbiAqIEBwYXJhbSBbY2FsbGJhY2tdIHtGdW5jdGlvbn0gQ2FsbGJhY2tcbiAqIEByZXR1cm4ge1RyYW5zaXRpb25hYmxlVHJhbnNmb3JtfVxuICovXG5UcmFuc2l0aW9uYWJsZVRyYW5zZm9ybS5wcm90b3R5cGUuc2V0VHJhbnNsYXRlID0gZnVuY3Rpb24gc2V0VHJhbnNsYXRlKHRyYW5zbGF0ZSwgdHJhbnNpdGlvbiwgY2FsbGJhY2spIHtcbiAgICB0aGlzLnRyYW5zbGF0ZS5zZXQodHJhbnNsYXRlLCB0cmFuc2l0aW9uLCBjYWxsYmFjayk7XG4gICAgdGhpcy5fZmluYWwgPSB0aGlzLl9maW5hbC5zbGljZSgpO1xuICAgIHRoaXMuX2ZpbmFsWzEyXSA9IHRyYW5zbGF0ZVswXTtcbiAgICB0aGlzLl9maW5hbFsxM10gPSB0cmFuc2xhdGVbMV07XG4gICAgaWYgKHRyYW5zbGF0ZVsyXSAhPT0gdW5kZWZpbmVkKSB0aGlzLl9maW5hbFsxNF0gPSB0cmFuc2xhdGVbMl07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFuIG9wdGltaXplZCB3YXkgb2Ygc2V0dGluZyBvbmx5IHRoZSBzY2FsZSBjb21wb25lbnQgb2YgYSBUcmFuc2Zvcm1cbiAqXG4gKiBAbWV0aG9kIHNldFNjYWxlXG4gKiBAY2hhaW5hYmxlXG4gKlxuICogQHBhcmFtIHNjYWxlIHtBcnJheX0gICAgICAgICBOZXcgc2NhbGUgc3RhdGVcbiAqIEBwYXJhbSBbdHJhbnNpdGlvbl0ge09iamVjdH0gVHJhbnNpdGlvbiBkZWZpbml0aW9uXG4gKiBAcGFyYW0gW2NhbGxiYWNrXSB7RnVuY3Rpb259IENhbGxiYWNrXG4gKiBAcmV0dXJuIHtUcmFuc2l0aW9uYWJsZVRyYW5zZm9ybX1cbiAqL1xuVHJhbnNpdGlvbmFibGVUcmFuc2Zvcm0ucHJvdG90eXBlLnNldFNjYWxlID0gZnVuY3Rpb24gc2V0U2NhbGUoc2NhbGUsIHRyYW5zaXRpb24sIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5zY2FsZS5zZXQoc2NhbGUsIHRyYW5zaXRpb24sIGNhbGxiYWNrKTtcbiAgICB0aGlzLl9maW5hbCA9IHRoaXMuX2ZpbmFsLnNsaWNlKCk7XG4gICAgdGhpcy5fZmluYWxbMF0gPSBzY2FsZVswXTtcbiAgICB0aGlzLl9maW5hbFs1XSA9IHNjYWxlWzFdO1xuICAgIGlmIChzY2FsZVsyXSAhPT0gdW5kZWZpbmVkKSB0aGlzLl9maW5hbFsxMF0gPSBzY2FsZVsyXTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQW4gb3B0aW1pemVkIHdheSBvZiBzZXR0aW5nIG9ubHkgdGhlIHJvdGF0aW9uYWwgY29tcG9uZW50IG9mIGEgVHJhbnNmb3JtXG4gKlxuICogQG1ldGhvZCBzZXRSb3RhdGVcbiAqIEBjaGFpbmFibGVcbiAqXG4gKiBAcGFyYW0gZXVsZXJBbmdsZXMge0FycmF5fSAgIEV1bGVyIGFuZ2xlcyBmb3IgbmV3IHJvdGF0aW9uIHN0YXRlXG4gKiBAcGFyYW0gW3RyYW5zaXRpb25dIHtPYmplY3R9IFRyYW5zaXRpb24gZGVmaW5pdGlvblxuICogQHBhcmFtIFtjYWxsYmFja10ge0Z1bmN0aW9ufSBDYWxsYmFja1xuICogQHJldHVybiB7VHJhbnNpdGlvbmFibGVUcmFuc2Zvcm19XG4gKi9cblRyYW5zaXRpb25hYmxlVHJhbnNmb3JtLnByb3RvdHlwZS5zZXRSb3RhdGUgPSBmdW5jdGlvbiBzZXRSb3RhdGUoZXVsZXJBbmdsZXMsIHRyYW5zaXRpb24sIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5yb3RhdGUuc2V0KGV1bGVyQW5nbGVzLCB0cmFuc2l0aW9uLCBjYWxsYmFjayk7XG4gICAgdGhpcy5fZmluYWwgPSBfYnVpbGQuY2FsbCh0aGlzKTtcbiAgICB0aGlzLl9maW5hbCA9IFRyYW5zZm9ybS5idWlsZCh7XG4gICAgICAgIHRyYW5zbGF0ZTogdGhpcy50cmFuc2xhdGUuZ2V0KCksXG4gICAgICAgIHJvdGF0ZTogZXVsZXJBbmdsZXMsXG4gICAgICAgIHNjYWxlOiB0aGlzLnNjYWxlLmdldCgpLFxuICAgICAgICBza2V3OiB0aGlzLnNrZXcuZ2V0KClcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQW4gb3B0aW1pemVkIHdheSBvZiBzZXR0aW5nIG9ubHkgdGhlIHNrZXcgY29tcG9uZW50IG9mIGEgVHJhbnNmb3JtXG4gKlxuICogQG1ldGhvZCBzZXRTa2V3XG4gKiBAY2hhaW5hYmxlXG4gKlxuICogQHBhcmFtIHNrZXdBbmdsZXMge0FycmF5fSAgICBOZXcgc2tldyBzdGF0ZVxuICogQHBhcmFtIFt0cmFuc2l0aW9uXSB7T2JqZWN0fSBUcmFuc2l0aW9uIGRlZmluaXRpb25cbiAqIEBwYXJhbSBbY2FsbGJhY2tdIHtGdW5jdGlvbn0gQ2FsbGJhY2tcbiAqIEByZXR1cm4ge1RyYW5zaXRpb25hYmxlVHJhbnNmb3JtfVxuICovXG5UcmFuc2l0aW9uYWJsZVRyYW5zZm9ybS5wcm90b3R5cGUuc2V0U2tldyA9IGZ1bmN0aW9uIHNldFNrZXcoc2tld0FuZ2xlcywgdHJhbnNpdGlvbiwgY2FsbGJhY2spIHtcbiAgICB0aGlzLnNrZXcuc2V0KHNrZXdBbmdsZXMsIHRyYW5zaXRpb24sIGNhbGxiYWNrKTtcbiAgICB0aGlzLl9maW5hbCA9IFRyYW5zZm9ybS5idWlsZCh7XG4gICAgICAgIHRyYW5zbGF0ZTogdGhpcy50cmFuc2xhdGUuZ2V0KCksXG4gICAgICAgIHJvdGF0ZTogdGhpcy5yb3RhdGUuZ2V0KCksXG4gICAgICAgIHNjYWxlOiB0aGlzLnNjYWxlLmdldCgpLFxuICAgICAgICBza2V3OiBza2V3QW5nbGVzXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHRlciBmb3IgYSBUcmFuc2l0aW9uYWJsZVRyYW5zZm9ybSB3aXRoIG9wdGlvbmFsIHBhcmFtZXRlcnMgdG8gdHJhbnNpdGlvblxuICogYmV0d2VlbiBUcmFuc2Zvcm1zXG4gKlxuICogQG1ldGhvZCBzZXRcbiAqIEBjaGFpbmFibGVcbiAqXG4gKiBAcGFyYW0gdHJhbnNmb3JtIHtBcnJheX0gICAgIE5ldyB0cmFuc2Zvcm0gc3RhdGVcbiAqIEBwYXJhbSBbdHJhbnNpdGlvbl0ge09iamVjdH0gVHJhbnNpdGlvbiBkZWZpbml0aW9uXG4gKiBAcGFyYW0gW2NhbGxiYWNrXSB7RnVuY3Rpb259IENhbGxiYWNrXG4gKiBAcmV0dXJuIHtUcmFuc2l0aW9uYWJsZVRyYW5zZm9ybX1cbiAqL1xuVHJhbnNpdGlvbmFibGVUcmFuc2Zvcm0ucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCh0cmFuc2Zvcm0sIHRyYW5zaXRpb24sIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fZmluYWwgPSB0cmFuc2Zvcm07XG4gICAgdmFyIGNvbXBvbmVudHMgPSBUcmFuc2Zvcm0uaW50ZXJwcmV0KHRyYW5zZm9ybSk7XG5cbiAgICB2YXIgX2NhbGxiYWNrID0gY2FsbGJhY2sgPyBVdGlsaXR5LmFmdGVyKDQsIGNhbGxiYWNrKSA6IG51bGw7XG4gICAgdGhpcy50cmFuc2xhdGUuc2V0KGNvbXBvbmVudHMudHJhbnNsYXRlLCB0cmFuc2l0aW9uLCBfY2FsbGJhY2spO1xuICAgIHRoaXMucm90YXRlLnNldChjb21wb25lbnRzLnJvdGF0ZSwgdHJhbnNpdGlvbiwgX2NhbGxiYWNrKTtcbiAgICB0aGlzLnNrZXcuc2V0KGNvbXBvbmVudHMuc2tldywgdHJhbnNpdGlvbiwgX2NhbGxiYWNrKTtcbiAgICB0aGlzLnNjYWxlLnNldChjb21wb25lbnRzLnNjYWxlLCB0cmFuc2l0aW9uLCBfY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBkZWZhdWx0IHRyYW5zaXRpb24gdG8gdXNlIGZvciB0cmFuc2l0aW9uaW5nIGJldHdlbiBUcmFuc2Zvcm0gc3RhdGVzXG4gKlxuICogQG1ldGhvZCBzZXREZWZhdWx0VHJhbnNpdGlvblxuICpcbiAqIEBwYXJhbSB0cmFuc2l0aW9uIHtPYmplY3R9IFRyYW5zaXRpb24gZGVmaW5pdGlvblxuICovXG5UcmFuc2l0aW9uYWJsZVRyYW5zZm9ybS5wcm90b3R5cGUuc2V0RGVmYXVsdFRyYW5zaXRpb24gPSBmdW5jdGlvbiBzZXREZWZhdWx0VHJhbnNpdGlvbih0cmFuc2l0aW9uKSB7XG4gICAgdGhpcy50cmFuc2xhdGUuc2V0RGVmYXVsdCh0cmFuc2l0aW9uKTtcbiAgICB0aGlzLnJvdGF0ZS5zZXREZWZhdWx0KHRyYW5zaXRpb24pO1xuICAgIHRoaXMuc2tldy5zZXREZWZhdWx0KHRyYW5zaXRpb24pO1xuICAgIHRoaXMuc2NhbGUuc2V0RGVmYXVsdCh0cmFuc2l0aW9uKTtcbn07XG5cbi8qKlxuICogR2V0dGVyLiBSZXR1cm5zIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBUcmFuc2Zvcm1cbiAqXG4gKiBAbWV0aG9kIGdldFxuICpcbiAqIEByZXR1cm4ge1RyYW5zZm9ybX1cbiAqL1xuVHJhbnNpdGlvbmFibGVUcmFuc2Zvcm0ucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldCgpIHtcbiAgICBpZiAodGhpcy5pc0FjdGl2ZSgpKSB7XG4gICAgICAgIHJldHVybiBfYnVpbGQuY2FsbCh0aGlzKTtcbiAgICB9XG4gICAgZWxzZSByZXR1cm4gdGhpcy5fZmluYWw7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgZGVzdGluYXRpb24gc3RhdGUgb2YgdGhlIFRyYW5zZm9ybVxuICpcbiAqIEBtZXRob2QgZ2V0RmluYWxcbiAqXG4gKiBAcmV0dXJuIFRyYW5zZm9ybSB7VHJhbnNmb3JtfVxuICovXG5UcmFuc2l0aW9uYWJsZVRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0RmluYWwgPSBmdW5jdGlvbiBnZXRGaW5hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5fZmluYWw7XG59O1xuXG4vKipcbiAqIERldGVybWluZSBpZiB0aGUgVHJhbnNpdGlvbmFsVHJhbnNmb3JtIGlzIGN1cnJlbnRseSB0cmFuc2l0aW9uaW5nXG4gKlxuICogQG1ldGhvZCBpc0FjdGl2ZVxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblRyYW5zaXRpb25hYmxlVHJhbnNmb3JtLnByb3RvdHlwZS5pc0FjdGl2ZSA9IGZ1bmN0aW9uIGlzQWN0aXZlKCkge1xuICAgIHJldHVybiB0aGlzLnRyYW5zbGF0ZS5pc0FjdGl2ZSgpIHx8IHRoaXMucm90YXRlLmlzQWN0aXZlKCkgfHwgdGhpcy5zY2FsZS5pc0FjdGl2ZSgpIHx8IHRoaXMuc2tldy5pc0FjdGl2ZSgpO1xufTtcblxuLyoqXG4gKiBIYWx0cyB0aGUgdHJhbnNpdGlvblxuICpcbiAqIEBtZXRob2QgaGFsdFxuICovXG5UcmFuc2l0aW9uYWJsZVRyYW5zZm9ybS5wcm90b3R5cGUuaGFsdCA9IGZ1bmN0aW9uIGhhbHQoKSB7XG4gICAgdGhpcy5fZmluYWwgPSB0aGlzLmdldCgpO1xuICAgIHRoaXMudHJhbnNsYXRlLmhhbHQoKTtcbiAgICB0aGlzLnJvdGF0ZS5oYWx0KCk7XG4gICAgdGhpcy5za2V3LmhhbHQoKTtcbiAgICB0aGlzLnNjYWxlLmhhbHQoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNpdGlvbmFibGVUcmFuc2Zvcm07XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvdHJhbnNpdGlvbnMvVHJhbnNpdGlvbmFibGVUcmFuc2Zvcm0uanNcIixcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL3RyYW5zaXRpb25zXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy5cbiAqXG4gKiBPd25lcjogZGF2aWRAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuXG5cblxuLyoqXG4gKlxuICogQSBzdGF0ZSBtYWludGFpbmVyIGZvciBhIHNtb290aCB0cmFuc2l0aW9uIGJldHdlZW5cbiAqICAgIG51bWVyaWNhbGx5LXNwZWNpZmllZCBzdGF0ZXMuICBFeGFtcGxlIG51bWVyaWMgc3RhdGVzIGluY2x1ZGUgZmxvYXRzIG9yXG4gKiAgICBUcmFuc2Zvcm5tIG9iamVjdHMuXG4gKlxuICogICAgQW4gaW5pdGlhbCBzdGF0ZSBpcyBzZXQgd2l0aCB0aGUgY29uc3RydWN0b3Igb3Igc2V0KHN0YXJ0VmFsdWUpLiBBXG4gKiAgICBjb3JyZXNwb25kaW5nIGVuZCBzdGF0ZSBhbmQgdHJhbnNpdGlvbiBhcmUgc2V0IHdpdGggc2V0KGVuZFZhbHVlLFxuICogICAgdHJhbnNpdGlvbikuIFN1YnNlcXVlbnQgY2FsbHMgdG8gc2V0KGVuZFZhbHVlLCB0cmFuc2l0aW9uKSBiZWdpbiBhdFxuICogICAgdGhlIGxhc3Qgc3RhdGUuIENhbGxzIHRvIGdldCh0aW1lc3RhbXApIHByb3ZpZGUgdGhlIF9pbnRlcnBvbGF0ZWQgc3RhdGVcbiAqICAgIGFsb25nIHRoZSB3YXkuXG4gKlxuICogICBOb3RlIHRoYXQgdGhlcmUgaXMgbm8gZXZlbnQgbG9vcCBoZXJlIC0gY2FsbHMgdG8gZ2V0KCkgYXJlIHRoZSBvbmx5IHdheVxuICogICAgdG8gZmluZCBvdXQgc3RhdGUgcHJvamVjdGVkIHRvIHRoZSBjdXJyZW50IChvciBwcm92aWRlZCkgdGltZSBhbmQgYXJlXG4gKiAgICB0aGUgb25seSB3YXkgdG8gdHJpZ2dlciBjYWxsYmFja3MuIFVzdWFsbHkgdGhpcyBraW5kIG9mIG9iamVjdCB3b3VsZFxuICogICAgYmUgcGFydCBvZiB0aGUgcmVuZGVyKCkgcGF0aCBvZiBhIHZpc2libGUgY29tcG9uZW50LlxuICpcbiAqIEBjbGFzcyBUd2VlblRyYW5zaXRpb25cbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIFRPRE9cbiAqICAgIGJlZ2lubmluZyBzdGF0ZVxuICovXG5mdW5jdGlvbiBUd2VlblRyYW5zaXRpb24ob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IE9iamVjdC5jcmVhdGUoVHdlZW5UcmFuc2l0aW9uLkRFRkFVTFRfT1BUSU9OUyk7XG4gICAgaWYgKG9wdGlvbnMpIHRoaXMuc2V0T3B0aW9ucyhvcHRpb25zKTtcblxuICAgIHRoaXMuX3N0YXJ0VGltZSA9IDA7XG4gICAgdGhpcy5fc3RhcnRWYWx1ZSA9IDA7XG4gICAgdGhpcy5fdXBkYXRlVGltZSA9IDA7XG4gICAgdGhpcy5fZW5kVmFsdWUgPSAwO1xuICAgIHRoaXMuX2N1cnZlID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX2R1cmF0aW9uID0gMDtcbiAgICB0aGlzLl9hY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLl9jYWxsYmFjayA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnN0YXRlID0gMDtcbiAgICB0aGlzLnZlbG9jaXR5ID0gdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIFRyYW5zaXRpb24gY3VydmVzIG1hcHBpbmcgaW5kZXBlbmRlbnQgdmFyaWFibGUgdCBmcm9tIGRvbWFpbiBbMCwxXSB0byBhXG4gKiAgICByYW5nZSB3aXRoaW4gWzAsMV0uIEluY2x1ZGVzIGZ1bmN0aW9ucyAnbGluZWFyJywgJ2Vhc2VJbicsICdlYXNlT3V0JyxcbiAqICAgICdlYXNlSW5PdXQnLCAnZWFzZU91dEJvdW5jZScsICdzcHJpbmcnLlxuICpcbiAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBDdXJ2ZVxuICogQGZpbmFsXG4gKi9cblR3ZWVuVHJhbnNpdGlvbi5DdXJ2ZXMgPSB7XG4gICAgbGluZWFyOiBmdW5jdGlvbih0KSB7XG4gICAgICAgIHJldHVybiB0O1xuICAgIH0sXG4gICAgZWFzZUluOiBmdW5jdGlvbih0KSB7XG4gICAgICAgIHJldHVybiB0KnQ7XG4gICAgfSxcbiAgICBlYXNlT3V0OiBmdW5jdGlvbih0KSB7XG4gICAgICAgIHJldHVybiB0KigyLXQpO1xuICAgIH0sXG4gICAgZWFzZUluT3V0OiBmdW5jdGlvbih0KSB7XG4gICAgICAgIGlmICh0IDw9IDAuNSkgcmV0dXJuIDIqdCp0O1xuICAgICAgICBlbHNlIHJldHVybiAtMip0KnQgKyA0KnQgLSAxO1xuICAgIH0sXG4gICAgZWFzZU91dEJvdW5jZTogZnVuY3Rpb24odCkge1xuICAgICAgICByZXR1cm4gdCooMyAtIDIqdCk7XG4gICAgfSxcbiAgICBzcHJpbmc6IGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgcmV0dXJuICgxIC0gdCkgKiBNYXRoLnNpbig2ICogTWF0aC5QSSAqIHQpICsgdDtcbiAgICB9XG59O1xuXG5Ud2VlblRyYW5zaXRpb24uU1VQUE9SVFNfTVVMVElQTEUgPSB0cnVlO1xuVHdlZW5UcmFuc2l0aW9uLkRFRkFVTFRfT1BUSU9OUyA9IHtcbiAgICBjdXJ2ZTogVHdlZW5UcmFuc2l0aW9uLkN1cnZlcy5saW5lYXIsXG4gICAgZHVyYXRpb246IDUwMCxcbiAgICBzcGVlZDogMCAvKiBjb25zaWRlcmVkIG9ubHkgaWYgcG9zaXRpdmUgKi9cbn07XG5cbnZhciByZWdpc3RlcmVkQ3VydmVzID0ge307XG5cbi8qKlxuICogQWRkIFwidW5pdFwiIGN1cnZlIHRvIGludGVybmFsIGRpY3Rpb25hcnkgb2YgcmVnaXN0ZXJlZCBjdXJ2ZXMuXG4gKlxuICogQG1ldGhvZCByZWdpc3RlckN1cnZlXG4gKlxuICogQHN0YXRpY1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBjdXJ2ZU5hbWUgZGljdGlvbmFyeSBrZXlcbiAqIEBwYXJhbSB7dW5pdEN1cnZlfSBjdXJ2ZSBmdW5jdGlvbiBvZiBvbmUgbnVtZXJpYyB2YXJpYWJsZSBtYXBwaW5nIFswLDFdXG4gKiAgICB0byByYW5nZSBpbnNpZGUgWzAsMV1cbiAqIEByZXR1cm4ge2Jvb2xlYW59IGZhbHNlIGlmIGtleSBpcyB0YWtlbiwgZWxzZSB0cnVlXG4gKi9cblR3ZWVuVHJhbnNpdGlvbi5yZWdpc3RlckN1cnZlID0gZnVuY3Rpb24gcmVnaXN0ZXJDdXJ2ZShjdXJ2ZU5hbWUsIGN1cnZlKSB7XG4gICAgaWYgKCFyZWdpc3RlcmVkQ3VydmVzW2N1cnZlTmFtZV0pIHtcbiAgICAgICAgcmVnaXN0ZXJlZEN1cnZlc1tjdXJ2ZU5hbWVdID0gY3VydmU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlIG9iamVjdCB3aXRoIGtleSBcImN1cnZlTmFtZVwiIGZyb20gaW50ZXJuYWwgZGljdGlvbmFyeSBvZiByZWdpc3RlcmVkXG4gKiAgICBjdXJ2ZXMuXG4gKlxuICogQG1ldGhvZCB1bnJlZ2lzdGVyQ3VydmVcbiAqXG4gKiBAc3RhdGljXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGN1cnZlTmFtZSBkaWN0aW9uYXJ5IGtleVxuICogQHJldHVybiB7Ym9vbGVhbn0gZmFsc2UgaWYga2V5IGhhcyBubyBkaWN0aW9uYXJ5IHZhbHVlXG4gKi9cblR3ZWVuVHJhbnNpdGlvbi51bnJlZ2lzdGVyQ3VydmUgPSBmdW5jdGlvbiB1bnJlZ2lzdGVyQ3VydmUoY3VydmVOYW1lKSB7XG4gICAgaWYgKHJlZ2lzdGVyZWRDdXJ2ZXNbY3VydmVOYW1lXSkge1xuICAgICAgICBkZWxldGUgcmVnaXN0ZXJlZEN1cnZlc1tjdXJ2ZU5hbWVdO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFJldHJpZXZlIGZ1bmN0aW9uIHdpdGgga2V5IFwiY3VydmVOYW1lXCIgZnJvbSBpbnRlcm5hbCBkaWN0aW9uYXJ5IG9mXG4gKiAgICByZWdpc3RlcmVkIGN1cnZlcy4gRGVmYXVsdCBjdXJ2ZXMgYXJlIGRlZmluZWQgaW4gdGhlXG4gKiAgICBUd2VlblRyYW5zaXRpb24uQ3VydmVzIGFycmF5LCB3aGVyZSB0aGUgdmFsdWVzIHJlcHJlc2VudFxuICogICAgdW5pdEN1cnZlIGZ1bmN0aW9ucy5cbiAqXG4gKiBAbWV0aG9kIGdldEN1cnZlXG4gKlxuICogQHN0YXRpY1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBjdXJ2ZU5hbWUgZGljdGlvbmFyeSBrZXlcbiAqIEByZXR1cm4ge3VuaXRDdXJ2ZX0gY3VydmUgZnVuY3Rpb24gb2Ygb25lIG51bWVyaWMgdmFyaWFibGUgbWFwcGluZyBbMCwxXVxuICogICAgdG8gcmFuZ2UgaW5zaWRlIFswLDFdXG4gKi9cblR3ZWVuVHJhbnNpdGlvbi5nZXRDdXJ2ZSA9IGZ1bmN0aW9uIGdldEN1cnZlKGN1cnZlTmFtZSkge1xuICAgIHZhciBjdXJ2ZSA9IHJlZ2lzdGVyZWRDdXJ2ZXNbY3VydmVOYW1lXTtcbiAgICBpZiAoY3VydmUgIT09IHVuZGVmaW5lZCkgcmV0dXJuIGN1cnZlO1xuICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKCdjdXJ2ZSBub3QgcmVnaXN0ZXJlZCcpO1xufTtcblxuLyoqXG4gKiBSZXRyaWV2ZSBhbGwgYXZhaWxhYmxlIGN1cnZlcy5cbiAqXG4gKiBAbWV0aG9kIGdldEN1cnZlc1xuICpcbiAqIEBzdGF0aWNcbiAqXG4gKiBAcmV0dXJuIHtvYmplY3R9IGN1cnZlIGZ1bmN0aW9ucyBvZiBvbmUgbnVtZXJpYyB2YXJpYWJsZSBtYXBwaW5nIFswLDFdXG4gKiAgICB0byByYW5nZSBpbnNpZGUgWzAsMV1cbiAqL1xuVHdlZW5UcmFuc2l0aW9uLmdldEN1cnZlcyA9IGZ1bmN0aW9uIGdldEN1cnZlcygpIHtcbiAgICByZXR1cm4gcmVnaXN0ZXJlZEN1cnZlcztcbn07XG5cbiAvLyBJbnRlcnBvbGF0ZTogSWYgYSBsaW5lYXIgZnVuY3Rpb24gZigwKSA9IGEsIGYoMSkgPSBiLCB0aGVuIHJldHVybiBmKHQpXG5mdW5jdGlvbiBfaW50ZXJwb2xhdGUoYSwgYiwgdCkge1xuICAgIHJldHVybiAoKDEgLSB0KSAqIGEpICsgKHQgKiBiKTtcbn1cblxuZnVuY3Rpb24gX2Nsb25lKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgaWYgKG9iaiBpbnN0YW5jZW9mIEFycmF5KSByZXR1cm4gb2JqLnNsaWNlKDApO1xuICAgICAgICBlbHNlIHJldHVybiBPYmplY3QuY3JlYXRlKG9iaik7XG4gICAgfVxuICAgIGVsc2UgcmV0dXJuIG9iajtcbn1cblxuLy8gRmlsbCBpbiBtaXNzaW5nIHByb3BlcnRpZXMgaW4gXCJ0cmFuc2l0aW9uXCIgd2l0aCB0aG9zZSBpbiBkZWZhdWx0VHJhbnNpdGlvbiwgYW5kXG4vLyAgIGNvbnZlcnQgaW50ZXJuYWwgbmFtZWQgY3VydmUgdG8gZnVuY3Rpb24gb2JqZWN0LCByZXR1cm5pbmcgYXMgbmV3XG4vLyAgIG9iamVjdC5cbmZ1bmN0aW9uIF9ub3JtYWxpemUodHJhbnNpdGlvbiwgZGVmYXVsdFRyYW5zaXRpb24pIHtcbiAgICB2YXIgcmVzdWx0ID0ge2N1cnZlOiBkZWZhdWx0VHJhbnNpdGlvbi5jdXJ2ZX07XG4gICAgaWYgKGRlZmF1bHRUcmFuc2l0aW9uLmR1cmF0aW9uKSByZXN1bHQuZHVyYXRpb24gPSBkZWZhdWx0VHJhbnNpdGlvbi5kdXJhdGlvbjtcbiAgICBpZiAoZGVmYXVsdFRyYW5zaXRpb24uc3BlZWQpIHJlc3VsdC5zcGVlZCA9IGRlZmF1bHRUcmFuc2l0aW9uLnNwZWVkO1xuICAgIGlmICh0cmFuc2l0aW9uIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgIGlmICh0cmFuc2l0aW9uLmR1cmF0aW9uICE9PSB1bmRlZmluZWQpIHJlc3VsdC5kdXJhdGlvbiA9IHRyYW5zaXRpb24uZHVyYXRpb247XG4gICAgICAgIGlmICh0cmFuc2l0aW9uLmN1cnZlKSByZXN1bHQuY3VydmUgPSB0cmFuc2l0aW9uLmN1cnZlO1xuICAgICAgICBpZiAodHJhbnNpdGlvbi5zcGVlZCkgcmVzdWx0LnNwZWVkID0gdHJhbnNpdGlvbi5zcGVlZDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiByZXN1bHQuY3VydmUgPT09ICdzdHJpbmcnKSByZXN1bHQuY3VydmUgPSBUd2VlblRyYW5zaXRpb24uZ2V0Q3VydmUocmVzdWx0LmN1cnZlKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIFNldCBpbnRlcm5hbCBvcHRpb25zLCBvdmVycmlkaW5nIGFueSBkZWZhdWx0IG9wdGlvbnMuXG4gKlxuICogQG1ldGhvZCBzZXRPcHRpb25zXG4gKlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIG9wdGlvbnMgb2JqZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnMuY3VydmVdIGZ1bmN0aW9uIG1hcHBpbmcgWzAsMV0gdG8gWzAsMV0gb3IgaWRlbnRpZmllclxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLmR1cmF0aW9uXSBkdXJhdGlvbiBpbiBtc1xuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnNwZWVkXSBzcGVlZCBpbiBwaXhlbHMgcGVyIG1zXG4gKi9cblR3ZWVuVHJhbnNpdGlvbi5wcm90b3R5cGUuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIHNldE9wdGlvbnMob3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zLmN1cnZlICE9PSB1bmRlZmluZWQpIHRoaXMub3B0aW9ucy5jdXJ2ZSA9IG9wdGlvbnMuY3VydmU7XG4gICAgaWYgKG9wdGlvbnMuZHVyYXRpb24gIT09IHVuZGVmaW5lZCkgdGhpcy5vcHRpb25zLmR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbjtcbiAgICBpZiAob3B0aW9ucy5zcGVlZCAhPT0gdW5kZWZpbmVkKSB0aGlzLm9wdGlvbnMuc3BlZWQgPSBvcHRpb25zLnNwZWVkO1xufTtcblxuLyoqXG4gKiBBZGQgdHJhbnNpdGlvbiB0byBlbmQgc3RhdGUgdG8gdGhlIHF1ZXVlIG9mIHBlbmRpbmcgdHJhbnNpdGlvbnMuIFNwZWNpYWxcbiAqICAgIFVzZTogY2FsbGluZyB3aXRob3V0IGEgdHJhbnNpdGlvbiByZXNldHMgdGhlIG9iamVjdCB0byB0aGF0IHN0YXRlIHdpdGhcbiAqICAgIG5vIHBlbmRpbmcgYWN0aW9uc1xuICpcbiAqIEBtZXRob2Qgc2V0XG4gKlxuICpcbiAqIEBwYXJhbSB7bnVtYmVyfEZhbW91c01hdHJpeHxBcnJheS5OdW1iZXJ8T2JqZWN0LjxudW1iZXIsIG51bWJlcj59IGVuZFZhbHVlXG4gKiAgICBlbmQgc3RhdGUgdG8gd2hpY2ggd2UgX2ludGVycG9sYXRlXG4gKiBAcGFyYW0ge3RyYW5zaXRpb249fSB0cmFuc2l0aW9uIG9iamVjdCBvZiB0eXBlIHtkdXJhdGlvbjogbnVtYmVyLCBjdXJ2ZTpcbiAqICAgIGZbMCwxXSAtPiBbMCwxXSBvciBuYW1lfS4gSWYgdHJhbnNpdGlvbiBpcyBvbWl0dGVkLCBjaGFuZ2Ugd2lsbCBiZVxuICogICAgaW5zdGFudGFuZW91cy5cbiAqIEBwYXJhbSB7ZnVuY3Rpb24oKT19IGNhbGxiYWNrIFplcm8tYXJndW1lbnQgZnVuY3Rpb24gdG8gY2FsbCBvbiBvYnNlcnZlZFxuICogICAgY29tcGxldGlvbiAodD0xKVxuICovXG5Ud2VlblRyYW5zaXRpb24ucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldChlbmRWYWx1ZSwgdHJhbnNpdGlvbiwgY2FsbGJhY2spIHtcbiAgICBpZiAoIXRyYW5zaXRpb24pIHtcbiAgICAgICAgdGhpcy5yZXNldChlbmRWYWx1ZSk7XG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3N0YXJ0VmFsdWUgPSBfY2xvbmUodGhpcy5nZXQoKSk7XG4gICAgdHJhbnNpdGlvbiA9IF9ub3JtYWxpemUodHJhbnNpdGlvbiwgdGhpcy5vcHRpb25zKTtcbiAgICBpZiAodHJhbnNpdGlvbi5zcGVlZCkge1xuICAgICAgICB2YXIgc3RhcnRWYWx1ZSA9IHRoaXMuX3N0YXJ0VmFsdWU7XG4gICAgICAgIGlmIChzdGFydFZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgICAgICB2YXIgdmFyaWFuY2UgPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBzdGFydFZhbHVlKSB2YXJpYW5jZSArPSAoZW5kVmFsdWVbaV0gLSBzdGFydFZhbHVlW2ldKSAqIChlbmRWYWx1ZVtpXSAtIHN0YXJ0VmFsdWVbaV0pO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi5kdXJhdGlvbiA9IE1hdGguc3FydCh2YXJpYW5jZSkgLyB0cmFuc2l0aW9uLnNwZWVkO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdHJhbnNpdGlvbi5kdXJhdGlvbiA9IE1hdGguYWJzKGVuZFZhbHVlIC0gc3RhcnRWYWx1ZSkgLyB0cmFuc2l0aW9uLnNwZWVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgICB0aGlzLl9lbmRWYWx1ZSA9IF9jbG9uZShlbmRWYWx1ZSk7XG4gICAgdGhpcy5fc3RhcnRWZWxvY2l0eSA9IF9jbG9uZSh0cmFuc2l0aW9uLnZlbG9jaXR5KTtcbiAgICB0aGlzLl9kdXJhdGlvbiA9IHRyYW5zaXRpb24uZHVyYXRpb247XG4gICAgdGhpcy5fY3VydmUgPSB0cmFuc2l0aW9uLmN1cnZlO1xuICAgIHRoaXMuX2FjdGl2ZSA9IHRydWU7XG4gICAgdGhpcy5fY2FsbGJhY2sgPSBjYWxsYmFjaztcbn07XG5cbi8qKlxuICogQ2FuY2VsIGFsbCB0cmFuc2l0aW9ucyBhbmQgcmVzZXQgdG8gYSBzdGFibGUgc3RhdGVcbiAqXG4gKiBAbWV0aG9kIHJlc2V0XG4gKlxuICogQHBhcmFtIHtudW1iZXJ8QXJyYXkuTnVtYmVyfE9iamVjdC48bnVtYmVyLCBudW1iZXI+fSBzdGFydFZhbHVlXG4gKiAgICBzdGFydGluZyBzdGF0ZVxuICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0VmVsb2NpdHlcbiAqICAgIHN0YXJ0aW5nIHZlbG9jaXR5XG4gKi9cblR3ZWVuVHJhbnNpdGlvbi5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiByZXNldChzdGFydFZhbHVlLCBzdGFydFZlbG9jaXR5KSB7XG4gICAgaWYgKHRoaXMuX2NhbGxiYWNrKSB7XG4gICAgICAgIHZhciBjYWxsYmFjayA9IHRoaXMuX2NhbGxiYWNrO1xuICAgICAgICB0aGlzLl9jYWxsYmFjayA9IHVuZGVmaW5lZDtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gICAgdGhpcy5zdGF0ZSA9IF9jbG9uZShzdGFydFZhbHVlKTtcbiAgICB0aGlzLnZlbG9jaXR5ID0gX2Nsb25lKHN0YXJ0VmVsb2NpdHkpO1xuICAgIHRoaXMuX3N0YXJ0VGltZSA9IDA7XG4gICAgdGhpcy5fZHVyYXRpb24gPSAwO1xuICAgIHRoaXMuX3VwZGF0ZVRpbWUgPSAwO1xuICAgIHRoaXMuX3N0YXJ0VmFsdWUgPSB0aGlzLnN0YXRlO1xuICAgIHRoaXMuX3N0YXJ0VmVsb2NpdHkgPSB0aGlzLnZlbG9jaXR5O1xuICAgIHRoaXMuX2VuZFZhbHVlID0gdGhpcy5zdGF0ZTtcbiAgICB0aGlzLl9hY3RpdmUgPSBmYWxzZTtcbn07XG5cbi8qKlxuICogR2V0IGN1cnJlbnQgdmVsb2NpdHlcbiAqXG4gKiBAbWV0aG9kIGdldFZlbG9jaXR5XG4gKlxuICogQHJldHVybnMge051bWJlcn0gdmVsb2NpdHlcbiAqL1xuVHdlZW5UcmFuc2l0aW9uLnByb3RvdHlwZS5nZXRWZWxvY2l0eSA9IGZ1bmN0aW9uIGdldFZlbG9jaXR5KCkge1xuICAgIHJldHVybiB0aGlzLnZlbG9jaXR5O1xufTtcblxuLyoqXG4gKiBHZXQgaW50ZXJwb2xhdGVkIHN0YXRlIG9mIGN1cnJlbnQgYWN0aW9uIGF0IHByb3ZpZGVkIHRpbWUuIElmIHRoZSBsYXN0XG4gKiAgICBhY3Rpb24gaGFzIGNvbXBsZXRlZCwgaW52b2tlIGl0cyBjYWxsYmFjay5cbiAqXG4gKiBAbWV0aG9kIGdldFxuICpcbiAqXG4gKiBAcGFyYW0ge251bWJlcj19IHRpbWVzdGFtcCBFdmFsdWF0ZSB0aGUgY3VydmUgYXQgYSBub3JtYWxpemVkIHZlcnNpb24gb2YgdGhpc1xuICogICAgdGltZS4gSWYgb21pdHRlZCwgdXNlIGN1cnJlbnQgdGltZS4gKFVuaXggZXBvY2ggdGltZSlcbiAqIEByZXR1cm4ge251bWJlcnxPYmplY3QuPG51bWJlcnxzdHJpbmcsIG51bWJlcj59IGJlZ2lubmluZyBzdGF0ZVxuICogICAgX2ludGVycG9sYXRlZCB0byB0aGlzIHBvaW50IGluIHRpbWUuXG4gKi9cblR3ZWVuVHJhbnNpdGlvbi5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0KHRpbWVzdGFtcCkge1xuICAgIHRoaXMudXBkYXRlKHRpbWVzdGFtcCk7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGU7XG59O1xuXG5mdW5jdGlvbiBfY2FsY3VsYXRlVmVsb2NpdHkoY3VycmVudCwgc3RhcnQsIGN1cnZlLCBkdXJhdGlvbiwgdCkge1xuICAgIHZhciB2ZWxvY2l0eTtcbiAgICB2YXIgZXBzID0gMWUtNztcbiAgICB2YXIgc3BlZWQgPSAoY3VydmUodCkgLSBjdXJ2ZSh0IC0gZXBzKSkgLyBlcHM7XG4gICAgaWYgKGN1cnJlbnQgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICB2ZWxvY2l0eSA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGN1cnJlbnQubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjdXJyZW50W2ldID09PSAnbnVtYmVyJylcbiAgICAgICAgICAgICAgICB2ZWxvY2l0eVtpXSA9IHNwZWVkICogKGN1cnJlbnRbaV0gLSBzdGFydFtpXSkgLyBkdXJhdGlvbjtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB2ZWxvY2l0eVtpXSA9IDA7XG4gICAgICAgIH1cblxuICAgIH1cbiAgICBlbHNlIHZlbG9jaXR5ID0gc3BlZWQgKiAoY3VycmVudCAtIHN0YXJ0KSAvIGR1cmF0aW9uO1xuICAgIHJldHVybiB2ZWxvY2l0eTtcbn1cblxuZnVuY3Rpb24gX2NhbGN1bGF0ZVN0YXRlKHN0YXJ0LCBlbmQsIHQpIHtcbiAgICB2YXIgc3RhdGU7XG4gICAgaWYgKHN0YXJ0IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgc3RhdGUgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGFydC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzdGFydFtpXSA9PT0gJ251bWJlcicpXG4gICAgICAgICAgICAgICAgc3RhdGVbaV0gPSBfaW50ZXJwb2xhdGUoc3RhcnRbaV0sIGVuZFtpXSwgdCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgc3RhdGVbaV0gPSBzdGFydFtpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHN0YXRlID0gX2ludGVycG9sYXRlKHN0YXJ0LCBlbmQsIHQpO1xuICAgIHJldHVybiBzdGF0ZTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgaW50ZXJuYWwgc3RhdGUgdG8gdGhlIHByb3ZpZGVkIHRpbWVzdGFtcC4gVGhpcyBtYXkgaW52b2tlIHRoZSBsYXN0XG4gKiAgICBjYWxsYmFjayBhbmQgYmVnaW4gYSBuZXcgYWN0aW9uLlxuICpcbiAqIEBtZXRob2QgdXBkYXRlXG4gKlxuICpcbiAqIEBwYXJhbSB7bnVtYmVyPX0gdGltZXN0YW1wIEV2YWx1YXRlIHRoZSBjdXJ2ZSBhdCBhIG5vcm1hbGl6ZWQgdmVyc2lvbiBvZiB0aGlzXG4gKiAgICB0aW1lLiBJZiBvbWl0dGVkLCB1c2UgY3VycmVudCB0aW1lLiAoVW5peCBlcG9jaCB0aW1lKVxuICovXG5Ud2VlblRyYW5zaXRpb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSh0aW1lc3RhbXApIHtcbiAgICBpZiAoIXRoaXMuX2FjdGl2ZSkge1xuICAgICAgICBpZiAodGhpcy5fY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IHRoaXMuX2NhbGxiYWNrO1xuICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2sgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIXRpbWVzdGFtcCkgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICBpZiAodGhpcy5fdXBkYXRlVGltZSA+PSB0aW1lc3RhbXApIHJldHVybjtcbiAgICB0aGlzLl91cGRhdGVUaW1lID0gdGltZXN0YW1wO1xuXG4gICAgdmFyIHRpbWVTaW5jZVN0YXJ0ID0gdGltZXN0YW1wIC0gdGhpcy5fc3RhcnRUaW1lO1xuICAgIGlmICh0aW1lU2luY2VTdGFydCA+PSB0aGlzLl9kdXJhdGlvbikge1xuICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5fZW5kVmFsdWU7XG4gICAgICAgIHRoaXMudmVsb2NpdHkgPSBfY2FsY3VsYXRlVmVsb2NpdHkodGhpcy5zdGF0ZSwgdGhpcy5fc3RhcnRWYWx1ZSwgdGhpcy5fY3VydmUsIHRoaXMuX2R1cmF0aW9uLCAxKTtcbiAgICAgICAgdGhpcy5fYWN0aXZlID0gZmFsc2U7XG4gICAgfVxuICAgIGVsc2UgaWYgKHRpbWVTaW5jZVN0YXJ0IDwgMCkge1xuICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5fc3RhcnRWYWx1ZTtcbiAgICAgICAgdGhpcy52ZWxvY2l0eSA9IHRoaXMuX3N0YXJ0VmVsb2NpdHk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgdCA9IHRpbWVTaW5jZVN0YXJ0IC8gdGhpcy5fZHVyYXRpb247XG4gICAgICAgIHRoaXMuc3RhdGUgPSBfY2FsY3VsYXRlU3RhdGUodGhpcy5fc3RhcnRWYWx1ZSwgdGhpcy5fZW5kVmFsdWUsIHRoaXMuX2N1cnZlKHQpKTtcbiAgICAgICAgdGhpcy52ZWxvY2l0eSA9IF9jYWxjdWxhdGVWZWxvY2l0eSh0aGlzLnN0YXRlLCB0aGlzLl9zdGFydFZhbHVlLCB0aGlzLl9jdXJ2ZSwgdGhpcy5fZHVyYXRpb24sIHQpO1xuICAgIH1cbn07XG5cbi8qKlxuICogSXMgdGhlcmUgYXQgbGVhc3Qgb25lIGFjdGlvbiBwZW5kaW5nIGNvbXBsZXRpb24/XG4gKlxuICogQG1ldGhvZCBpc0FjdGl2ZVxuICpcbiAqXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5Ud2VlblRyYW5zaXRpb24ucHJvdG90eXBlLmlzQWN0aXZlID0gZnVuY3Rpb24gaXNBY3RpdmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FjdGl2ZTtcbn07XG5cbi8qKlxuICogSGFsdCB0cmFuc2l0aW9uIGF0IGN1cnJlbnQgc3RhdGUgYW5kIGVyYXNlIGFsbCBwZW5kaW5nIGFjdGlvbnMuXG4gKlxuICogQG1ldGhvZCBoYWx0XG4gKlxuICovXG5Ud2VlblRyYW5zaXRpb24ucHJvdG90eXBlLmhhbHQgPSBmdW5jdGlvbiBoYWx0KCkge1xuICAgIHRoaXMucmVzZXQodGhpcy5nZXQoKSk7XG59O1xuXG4vLyBSZWdpc3RlciBhbGwgdGhlIGRlZmF1bHQgY3VydmVzXG5Ud2VlblRyYW5zaXRpb24ucmVnaXN0ZXJDdXJ2ZSgnbGluZWFyJywgVHdlZW5UcmFuc2l0aW9uLkN1cnZlcy5saW5lYXIpO1xuVHdlZW5UcmFuc2l0aW9uLnJlZ2lzdGVyQ3VydmUoJ2Vhc2VJbicsIFR3ZWVuVHJhbnNpdGlvbi5DdXJ2ZXMuZWFzZUluKTtcblR3ZWVuVHJhbnNpdGlvbi5yZWdpc3RlckN1cnZlKCdlYXNlT3V0JywgVHdlZW5UcmFuc2l0aW9uLkN1cnZlcy5lYXNlT3V0KTtcblR3ZWVuVHJhbnNpdGlvbi5yZWdpc3RlckN1cnZlKCdlYXNlSW5PdXQnLCBUd2VlblRyYW5zaXRpb24uQ3VydmVzLmVhc2VJbk91dCk7XG5Ud2VlblRyYW5zaXRpb24ucmVnaXN0ZXJDdXJ2ZSgnZWFzZU91dEJvdW5jZScsIFR3ZWVuVHJhbnNpdGlvbi5DdXJ2ZXMuZWFzZU91dEJvdW5jZSk7XG5Ud2VlblRyYW5zaXRpb24ucmVnaXN0ZXJDdXJ2ZSgnc3ByaW5nJywgVHdlZW5UcmFuc2l0aW9uLkN1cnZlcy5zcHJpbmcpO1xuXG5Ud2VlblRyYW5zaXRpb24uY3VzdG9tQ3VydmUgPSBmdW5jdGlvbiBjdXN0b21DdXJ2ZSh2MSwgdjIpIHtcbiAgICB2MSA9IHYxIHx8IDA7IHYyID0gdjIgfHwgMDtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgICByZXR1cm4gdjEqdCArICgtMip2MSAtIHYyICsgMykqdCp0ICsgKHYxICsgdjIgLSAyKSp0KnQqdDtcbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUd2VlblRyYW5zaXRpb247XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9mYW1vdXMvdHJhbnNpdGlvbnMvVHdlZW5UcmFuc2l0aW9uLmpzXCIsXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy90cmFuc2l0aW9uc1wiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qIFRoaXMgU291cmNlIENvZGUgRm9ybSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBvZiB0aGUgTW96aWxsYSBQdWJsaWNcbiAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAqIGZpbGUsIFlvdSBjYW4gb2J0YWluIG9uZSBhdCBodHRwOi8vbW96aWxsYS5vcmcvTVBMLzIuMC8uXG4gKlxuICogT3duZXI6IG1hcmtAZmFtby51c1xuICogQGxpY2Vuc2UgTVBMIDIuMFxuICogQGNvcHlyaWdodCBGYW1vdXMgSW5kdXN0cmllcywgSW5jLiAyMDE0XG4gKi9cblxuXG5cbi8qKlxuICogVGhpcyBuYW1lc3BhY2UgaG9sZHMgc3RhbmRhbG9uZSBmdW5jdGlvbmFsaXR5LlxuICogIEN1cnJlbnRseSBpbmNsdWRlcyBuYW1lIG1hcHBpbmcgZm9yIHRyYW5zaXRpb24gY3VydmVzLFxuICogIG5hbWUgbWFwcGluZyBmb3Igb3JpZ2luIHBhaXJzLCBhbmQgdGhlIGFmdGVyKCkgZnVuY3Rpb24uXG4gKlxuICogQGNsYXNzIFV0aWxpdHlcbiAqIEBzdGF0aWNcbiAqL1xudmFyIFV0aWxpdHkgPSB7fTtcblxuLyoqXG4gKiBUYWJsZSBvZiBkaXJlY3Rpb24gYXJyYXkgcG9zaXRpb25zXG4gKlxuICogQHByb3BlcnR5IHtvYmplY3R9IERpcmVjdGlvblxuICogQGZpbmFsXG4gKi9cblV0aWxpdHkuRGlyZWN0aW9uID0ge1xuICAgIFg6IDAsXG4gICAgWTogMSxcbiAgICBaOiAyXG59O1xuXG4vKipcbiAqIFJldHVybiB3cmFwcGVyIGFyb3VuZCBjYWxsYmFjayBmdW5jdGlvbi4gT25jZSB0aGUgd3JhcHBlciBpcyBjYWxsZWQgTlxuICogICB0aW1lcywgaW52b2tlIHRoZSBjYWxsYmFjayBmdW5jdGlvbi4gQXJndW1lbnRzIGFuZCBzY29wZSBwcmVzZXJ2ZWQuXG4gKlxuICogQG1ldGhvZCBhZnRlclxuICpcbiAqIEBwYXJhbSB7bnVtYmVyfSBjb3VudCBudW1iZXIgb2YgY2FsbHMgYmVmb3JlIGNhbGxiYWNrIGZ1bmN0aW9uIGludm9rZWRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIHdyYXBwZWQgY2FsbGJhY2sgZnVuY3Rpb25cbiAqXG4gKiBAcmV0dXJuIHtmdW5jdGlvbn0gd3JhcHBlZCBjYWxsYmFjayB3aXRoIGNvdW5kb3duIGZlYXR1cmVcbiAqL1xuVXRpbGl0eS5hZnRlciA9IGZ1bmN0aW9uIGFmdGVyKGNvdW50LCBjYWxsYmFjaykge1xuICAgIHZhciBjb3VudGVyID0gY291bnQ7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb3VudGVyLS07XG4gICAgICAgIGlmIChjb3VudGVyID09PSAwKSBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG59O1xuXG4vKipcbiAqIExvYWQgYSBVUkwgYW5kIHJldHVybiBpdHMgY29udGVudHMgaW4gYSBjYWxsYmFja1xuICpcbiAqIEBtZXRob2QgbG9hZFVSTFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVVJMIG9mIG9iamVjdFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgY2FsbGJhY2sgdG8gZGlzcGF0Y2ggd2l0aCBjb250ZW50XG4gKi9cblV0aWxpdHkubG9hZFVSTCA9IGZ1bmN0aW9uIGxvYWRVUkwodXJsLCBjYWxsYmFjaykge1xuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gb25yZWFkeXN0YXRlY2hhbmdlKCkge1xuICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKHRoaXMucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgeGhyLnNlbmQoKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgZG9jdW1lbnQgZnJhZ21lbnQgZnJvbSBhIHN0cmluZyBvZiBIVE1MXG4gKlxuICogQG1ldGhvZCBjcmVhdGVEb2N1bWVudEZyYWdtZW50RnJvbUhUTUxcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gaHRtbCBIVE1MIHRvIGNvbnZlcnQgdG8gRG9jdW1lbnRGcmFnbWVudFxuICpcbiAqIEByZXR1cm4ge0RvY3VtZW50RnJhZ21lbnR9IERvY3VtZW50RnJhZ21lbnQgcmVwcmVzZW50aW5nIGlucHV0IEhUTUxcbiAqL1xuVXRpbGl0eS5jcmVhdGVEb2N1bWVudEZyYWdtZW50RnJvbUhUTUwgPSBmdW5jdGlvbiBjcmVhdGVEb2N1bWVudEZyYWdtZW50RnJvbUhUTUwoaHRtbCkge1xuICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZWxlbWVudC5pbm5lckhUTUwgPSBodG1sO1xuICAgIHZhciByZXN1bHQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgd2hpbGUgKGVsZW1lbnQuaGFzQ2hpbGROb2RlcygpKSByZXN1bHQuYXBwZW5kQ2hpbGQoZWxlbWVudC5maXJzdENoaWxkKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsaXR5O1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi8uLi9ub2RlX21vZHVsZXMvZmFtb3VzL3V0aWxpdGllcy9VdGlsaXR5LmpzXCIsXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2ZhbW91cy91dGlsaXRpZXNcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5fdXNlVHlwZWRBcnJheXNgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAoY29tcGF0aWJsZSBkb3duIHRvIElFNilcbiAqL1xuQnVmZmVyLl91c2VUeXBlZEFycmF5cyA9IChmdW5jdGlvbiAoKSB7XG4gIC8vIERldGVjdCBpZiBicm93c2VyIHN1cHBvcnRzIFR5cGVkIEFycmF5cy4gU3VwcG9ydGVkIGJyb3dzZXJzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssXG4gIC8vIENocm9tZSA3KywgU2FmYXJpIDUuMSssIE9wZXJhIDExLjYrLCBpT1MgNC4yKy4gSWYgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBhZGRpbmdcbiAgLy8gcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLCB0aGVuIHRoYXQncyB0aGUgc2FtZSBhcyBubyBgVWludDhBcnJheWAgc3VwcG9ydFxuICAvLyBiZWNhdXNlIHdlIG5lZWQgdG8gYmUgYWJsZSB0byBhZGQgYWxsIHRoZSBub2RlIEJ1ZmZlciBBUEkgbWV0aG9kcy4gVGhpcyBpcyBhbiBpc3N1ZVxuICAvLyBpbiBGaXJlZm94IDQtMjkuIE5vdyBmaXhlZDogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gNDIgPT09IGFyci5mb28oKSAmJlxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nIC8vIENocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciB0eXBlID0gdHlwZW9mIHN1YmplY3RcblxuICAvLyBXb3JrYXJvdW5kOiBub2RlJ3MgYmFzZTY0IGltcGxlbWVudGF0aW9uIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBzdHJpbmdzXG4gIC8vIHdoaWxlIGJhc2U2NC1qcyBkb2VzIG5vdC5cbiAgaWYgKGVuY29kaW5nID09PSAnYmFzZTY0JyAmJiB0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHN1YmplY3QgPSBzdHJpbmd0cmltKHN1YmplY3QpXG4gICAgd2hpbGUgKHN1YmplY3QubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgICAgc3ViamVjdCA9IHN1YmplY3QgKyAnPSdcbiAgICB9XG4gIH1cblxuICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgdmFyIGxlbmd0aFxuICBpZiAodHlwZSA9PT0gJ251bWJlcicpXG4gICAgbGVuZ3RoID0gY29lcmNlKHN1YmplY3QpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKVxuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0JylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdC5sZW5ndGgpIC8vIGFzc3VtZSB0aGF0IG9iamVjdCBpcyBhcnJheS1saWtlXG4gIGVsc2VcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG5lZWRzIHRvIGJlIGEgbnVtYmVyLCBhcnJheSBvciBzdHJpbmcuJylcblxuICB2YXIgYnVmXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgLy8gUHJlZmVycmVkOiBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGJ1ZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgYnVmID0gdGhpc1xuICAgIGJ1Zi5sZW5ndGggPSBsZW5ndGhcbiAgICBidWYuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgJiYgdHlwZW9mIHN1YmplY3QuYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAvLyBTcGVlZCBvcHRpbWl6YXRpb24gLS0gdXNlIHNldCBpZiB3ZSdyZSBjb3B5aW5nIGZyb20gYSB0eXBlZCBhcnJheVxuICAgIGJ1Zi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSlcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdC5yZWFkVUludDgoaSlcbiAgICAgIGVsc2VcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdFtpXVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGJ1Zi53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiAhQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiAhbm9aZXJvKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBidWZbaV0gPSAwXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG4vLyBTVEFUSUMgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIChiKSB7XG4gIHJldHVybiAhIShiICE9PSBudWxsICYmIGIgIT09IHVuZGVmaW5lZCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmJ5dGVMZW5ndGggPSBmdW5jdGlvbiAoc3RyLCBlbmNvZGluZykge1xuICB2YXIgcmV0XG4gIHN0ciA9IHN0ciArICcnXG4gIHN3aXRjaCAoZW5jb2RpbmcgfHwgJ3V0ZjgnKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggLyAyXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoICogMlxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgYXNzZXJ0KGlzQXJyYXkobGlzdCksICdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0LCBbdG90YWxMZW5ndGhdKVxcbicgK1xuICAgICAgJ2xpc3Qgc2hvdWxkIGJlIGFuIEFycmF5LicpXG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMClcbiAgfSBlbHNlIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBsaXN0WzBdXG4gIH1cblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHRvdGFsTGVuZ3RoICE9PSAnbnVtYmVyJykge1xuICAgIHRvdGFsTGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbExlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHRvdGFsTGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbi8vIEJVRkZFUiBJTlNUQU5DRSBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBfaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBhc3NlcnQoc3RyTGVuICUgMiA9PT0gMCwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGFzc2VydCghaXNOYU4oYnl0ZSksICdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IGJ5dGVcbiAgfVxuICBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9IGkgKiAyXG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIF91dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gX2FzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF91dGYxNmxlV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGhcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuICBzdGFydCA9IE51bWJlcihzdGFydCkgfHwgMFxuICBlbmQgPSAoZW5kICE9PSB1bmRlZmluZWQpXG4gICAgPyBOdW1iZXIoZW5kKVxuICAgIDogZW5kID0gc2VsZi5sZW5ndGhcblxuICAvLyBGYXN0cGF0aCBlbXB0eSBzdHJpbmdzXG4gIGlmIChlbmQgPT09IHN0YXJ0KVxuICAgIHJldHVybiAnJ1xuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlU2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAodGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXNcblxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoIXRhcmdldF9zdGFydCkgdGFyZ2V0X3N0YXJ0ID0gMFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgYXNzZXJ0KGVuZCA+PSBzdGFydCwgJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0JylcbiAgYXNzZXJ0KHRhcmdldF9zdGFydCA+PSAwICYmIHRhcmdldF9zdGFydCA8IHRhcmdldC5sZW5ndGgsXG4gICAgICAndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChzdGFydCA+PSAwICYmIHN0YXJ0IDwgc291cmNlLmxlbmd0aCwgJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHNvdXJjZS5sZW5ndGgsICdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKVxuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0IDwgZW5kIC0gc3RhcnQpXG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCArIHN0YXJ0XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKGxlbiA8IDEwMCB8fCAhQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuX3NldCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksIHRhcmdldF9zdGFydClcbiAgfVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIF91dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmVzID0gJydcbiAgdmFyIHRtcCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIGlmIChidWZbaV0gPD0gMHg3Rikge1xuICAgICAgcmVzICs9IGRlY29kZVV0ZjhDaGFyKHRtcCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgICAgIHRtcCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRtcCArPSAnJScgKyBidWZbaV0udG9TdHJpbmcoMTYpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcyArIGRlY29kZVV0ZjhDaGFyKHRtcClcbn1cblxuZnVuY3Rpb24gX2FzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKVxuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBfYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICByZXR1cm4gX2FzY2lpU2xpY2UoYnVmLCBzdGFydCwgZW5kKVxufVxuXG5mdW5jdGlvbiBfaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiBfdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpKzFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IGNsYW1wKHN0YXJ0LCBsZW4sIDApXG4gIGVuZCA9IGNsYW1wKGVuZCwgbGVuLCBsZW4pXG5cbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICByZXR1cm4gQnVmZmVyLl9hdWdtZW50KHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICB2YXIgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkLCB0cnVlKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICAgIHJldHVybiBuZXdCdWZcbiAgfVxufVxuXG4vLyBgZ2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuZ2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy5yZWFkVUludDgob2Zmc2V0KVxufVxuXG4vLyBgc2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gIH0gZWxzZSB7XG4gICAgdmFsID0gYnVmW29mZnNldF0gPDwgOFxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkVUludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbFxuICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgPSBidWZbb2Zmc2V0ICsgMl0gPDwgMTZcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV0gPDwgOFxuICAgIHZhbCB8PSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAzIDwgbGVuKVxuICAgICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXQgKyAzXSA8PCAyNCA+Pj4gMClcbiAgfSBlbHNlIHtcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAxXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAyIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAyXSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDNdXG4gICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXRdIDw8IDI0ID4+PiAwKVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHZhciBuZWcgPSB0aGlzW29mZnNldF0gJiAweDgwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiBfcmVhZEludDE2IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbCA9IF9yZWFkVUludDE2KGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRJbnQzMiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWwgPSBfcmVhZFVJbnQzMihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICB2YXIgbmVnID0gdmFsICYgMHg4MDAwMDAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRGbG9hdCAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZERvdWJsZSAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmYpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKSByZXR1cm5cblxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgICAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmZmZmZilcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4obGVuIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9XG4gICAgICAgICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZiwgLTB4ODApXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIHRoaXMud3JpdGVVSW50OCh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydClcbiAgZWxzZVxuICAgIHRoaXMud3JpdGVVSW50OCgweGZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmYsIC0weDgwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICBfd3JpdGVVSW50MTYoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgX3dyaXRlVUludDE2KGJ1ZiwgMHhmZmZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgX3dyaXRlVUludDMyKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgZWxzZVxuICAgIF93cml0ZVVJbnQzMihidWYsIDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDcgPCBidWYubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLmNoYXJDb2RlQXQoMClcbiAgfVxuXG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmICFpc05hTih2YWx1ZSksICd2YWx1ZSBpcyBub3QgYSBudW1iZXInKVxuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCB0aGlzLmxlbmd0aCwgJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHRoaXMubGVuZ3RoLCAnZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgdGhpc1tpXSA9IHZhbHVlXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgb3V0ID0gW11cbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBvdXRbaV0gPSB0b0hleCh0aGlzW2ldKVxuICAgIGlmIChpID09PSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTKSB7XG4gICAgICBvdXRbaSArIDFdID0gJy4uLidcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgb3V0LmpvaW4oJyAnKSArICc+J1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSlcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBnZXQvc2V0IG1ldGhvZHMgYmVmb3JlIG92ZXJ3cml0aW5nXG4gIGFyci5fZ2V0ID0gYXJyLmdldFxuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5jb3B5ID0gQlAuY29weVxuICBhcnIuc2xpY2UgPSBCUC5zbGljZVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnQ4ID0gQlAucmVhZEludDhcbiAgYXJyLnJlYWRJbnQxNkxFID0gQlAucmVhZEludDE2TEVcbiAgYXJyLnJlYWRJbnQxNkJFID0gQlAucmVhZEludDE2QkVcbiAgYXJyLnJlYWRJbnQzMkxFID0gQlAucmVhZEludDMyTEVcbiAgYXJyLnJlYWRJbnQzMkJFID0gQlAucmVhZEludDMyQkVcbiAgYXJyLnJlYWRGbG9hdExFID0gQlAucmVhZEZsb2F0TEVcbiAgYXJyLnJlYWRGbG9hdEJFID0gQlAucmVhZEZsb2F0QkVcbiAgYXJyLnJlYWREb3VibGVMRSA9IEJQLnJlYWREb3VibGVMRVxuICBhcnIucmVhZERvdWJsZUJFID0gQlAucmVhZERvdWJsZUJFXG4gIGFyci53cml0ZVVJbnQ4ID0gQlAud3JpdGVVSW50OFxuICBhcnIud3JpdGVVSW50MTZMRSA9IEJQLndyaXRlVUludDE2TEVcbiAgYXJyLndyaXRlVUludDE2QkUgPSBCUC53cml0ZVVJbnQxNkJFXG4gIGFyci53cml0ZVVJbnQzMkxFID0gQlAud3JpdGVVSW50MzJMRVxuICBhcnIud3JpdGVVSW50MzJCRSA9IEJQLndyaXRlVUludDMyQkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG4vLyBzbGljZShzdGFydCwgZW5kKVxuZnVuY3Rpb24gY2xhbXAgKGluZGV4LCBsZW4sIGRlZmF1bHRWYWx1ZSkge1xuICBpZiAodHlwZW9mIGluZGV4ICE9PSAnbnVtYmVyJykgcmV0dXJuIGRlZmF1bHRWYWx1ZVxuICBpbmRleCA9IH5+aW5kZXg7ICAvLyBDb2VyY2UgdG8gaW50ZWdlci5cbiAgaWYgKGluZGV4ID49IGxlbikgcmV0dXJuIGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIGluZGV4ICs9IGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIHJldHVybiAwXG59XG5cbmZ1bmN0aW9uIGNvZXJjZSAobGVuZ3RoKSB7XG4gIC8vIENvZXJjZSBsZW5ndGggdG8gYSBudW1iZXIgKHBvc3NpYmx5IE5hTiksIHJvdW5kIHVwXG4gIC8vIGluIGNhc2UgaXQncyBmcmFjdGlvbmFsIChlLmcuIDEyMy40NTYpIHRoZW4gZG8gYVxuICAvLyBkb3VibGUgbmVnYXRlIHRvIGNvZXJjZSBhIE5hTiB0byAwLiBFYXN5LCByaWdodD9cbiAgbGVuZ3RoID0gfn5NYXRoLmNlaWwoK2xlbmd0aClcbiAgcmV0dXJuIGxlbmd0aCA8IDAgPyAwIDogbGVuZ3RoXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkgKHN1YmplY3QpIHtcbiAgcmV0dXJuIChBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzdWJqZWN0KSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICB9KShzdWJqZWN0KVxufVxuXG5mdW5jdGlvbiBpc0FycmF5aXNoIChzdWJqZWN0KSB7XG4gIHJldHVybiBpc0FycmF5KHN1YmplY3QpIHx8IEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSB8fFxuICAgICAgc3ViamVjdCAmJiB0eXBlb2Ygc3ViamVjdCA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHR5cGVvZiBzdWJqZWN0Lmxlbmd0aCA9PT0gJ251bWJlcidcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBpZiAoYiA8PSAweDdGKVxuICAgICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpXG4gICAgZWxzZSB7XG4gICAgICB2YXIgc3RhcnQgPSBpXG4gICAgICBpZiAoYiA+PSAweEQ4MDAgJiYgYiA8PSAweERGRkYpIGkrK1xuICAgICAgdmFyIGggPSBlbmNvZGVVUklDb21wb25lbnQoc3RyLnNsaWNlKHN0YXJ0LCBpKzEpKS5zdWJzdHIoMSkuc3BsaXQoJyUnKVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBoLmxlbmd0aDsgaisrKVxuICAgICAgICBieXRlQXJyYXkucHVzaChwYXJzZUludChoW2pdLCAxNikpXG4gICAgfVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KHN0cilcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBwb3NcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG5cbi8qXG4gKiBXZSBoYXZlIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGludGVnZXIuIFRoaXMgbWVhbnMgdGhhdCBpdFxuICogaXMgbm9uLW5lZ2F0aXZlLiBJdCBoYXMgbm8gZnJhY3Rpb25hbCBjb21wb25lbnQgYW5kIHRoYXQgaXQgZG9lcyBub3RcbiAqIGV4Y2VlZCB0aGUgbWF4aW11bSBhbGxvd2VkIHZhbHVlLlxuICovXG5mdW5jdGlvbiB2ZXJpZnVpbnQgKHZhbHVlLCBtYXgpIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlID49IDAsICdzcGVjaWZpZWQgYSBuZWdhdGl2ZSB2YWx1ZSBmb3Igd3JpdGluZyBhbiB1bnNpZ25lZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBpcyBsYXJnZXIgdGhhbiBtYXhpbXVtIHZhbHVlIGZvciB0eXBlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZzaW50ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZJRUVFNzU0ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbn1cblxuZnVuY3Rpb24gYXNzZXJ0ICh0ZXN0LCBtZXNzYWdlKSB7XG4gIGlmICghdGVzdCkgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UgfHwgJ0ZhaWxlZCBhc3NlcnRpb24nKVxufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlclwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbnZhciBsb29rdXAgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG5cbjsoZnVuY3Rpb24gKGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG4gIHZhciBBcnIgPSAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKVxuICAgID8gVWludDhBcnJheVxuICAgIDogQXJyYXlcblxuXHR2YXIgUExVUyAgID0gJysnLmNoYXJDb2RlQXQoMClcblx0dmFyIFNMQVNIICA9ICcvJy5jaGFyQ29kZUF0KDApXG5cdHZhciBOVU1CRVIgPSAnMCcuY2hhckNvZGVBdCgwKVxuXHR2YXIgTE9XRVIgID0gJ2EnLmNoYXJDb2RlQXQoMClcblx0dmFyIFVQUEVSICA9ICdBJy5jaGFyQ29kZUF0KDApXG5cblx0ZnVuY3Rpb24gZGVjb2RlIChlbHQpIHtcblx0XHR2YXIgY29kZSA9IGVsdC5jaGFyQ29kZUF0KDApXG5cdFx0aWYgKGNvZGUgPT09IFBMVVMpXG5cdFx0XHRyZXR1cm4gNjIgLy8gJysnXG5cdFx0aWYgKGNvZGUgPT09IFNMQVNIKVxuXHRcdFx0cmV0dXJuIDYzIC8vICcvJ1xuXHRcdGlmIChjb2RlIDwgTlVNQkVSKVxuXHRcdFx0cmV0dXJuIC0xIC8vbm8gbWF0Y2hcblx0XHRpZiAoY29kZSA8IE5VTUJFUiArIDEwKVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBOVU1CRVIgKyAyNiArIDI2XG5cdFx0aWYgKGNvZGUgPCBVUFBFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBVUFBFUlxuXHRcdGlmIChjb2RlIDwgTE9XRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gTE9XRVIgKyAyNlxuXHR9XG5cblx0ZnVuY3Rpb24gYjY0VG9CeXRlQXJyYXkgKGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG5cblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHR2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXHRcdHBsYWNlSG9sZGVycyA9ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAyKSA/IDIgOiAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMSkgPyAxIDogMFxuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gbmV3IEFycihiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpXG5cblx0XHQvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG5cdFx0bCA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gNCA6IGI2NC5sZW5ndGhcblxuXHRcdHZhciBMID0gMFxuXG5cdFx0ZnVuY3Rpb24gcHVzaCAodikge1xuXHRcdFx0YXJyW0wrK10gPSB2XG5cdFx0fVxuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxOCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCAxMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA8PCA2KSB8IGRlY29kZShiNjQuY2hhckF0KGkgKyAzKSlcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNilcblx0XHRcdHB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPj4gNClcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAxMCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA8PCA0KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpID4+IDIpXG5cdFx0XHRwdXNoKCh0bXAgPj4gOCkgJiAweEZGKVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdHJldHVybiBhcnJcblx0fVxuXG5cdGZ1bmN0aW9uIHVpbnQ4VG9CYXNlNjQgKHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGhcblxuXHRcdGZ1bmN0aW9uIGVuY29kZSAobnVtKSB7XG5cdFx0XHRyZXR1cm4gbG9va3VwLmNoYXJBdChudW0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBlbmNvZGUobnVtID4+IDE4ICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDEyICYgMHgzRikgKyBlbmNvZGUobnVtID4+IDYgJiAweDNGKSArIGVuY29kZShudW0gJiAweDNGKVxuXHRcdH1cblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApXG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV1cblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDIpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz09J1xuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMTApXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPj4gNCkgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDIpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9J1xuXHRcdFx0XHRicmVha1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXRcblx0fVxuXG5cdGV4cG9ydHMudG9CeXRlQXJyYXkgPSBiNjRUb0J5dGVBcnJheVxuXHRleHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJyA/ICh0aGlzLmJhc2U2NGpzID0ge30pIDogZXhwb3J0cykpXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYlwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbmV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgbkJpdHMgPSAtNyxcbiAgICAgIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0xFID8gLTEgOiAxLFxuICAgICAgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXTtcblxuICBpICs9IGQ7XG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIHMgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBlTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgZSA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IG1MZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhcztcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpO1xuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbik7XG4gICAgZSA9IGUgLSBlQmlhcztcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKTtcbn07XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgYyxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMCksXG4gICAgICBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNMRSA/IDEgOiAtMSxcbiAgICAgIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDA7XG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSk7XG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDA7XG4gICAgZSA9IGVNYXg7XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpO1xuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLTtcbiAgICAgIGMgKj0gMjtcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKys7XG4gICAgICBjIC89IDI7XG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMDtcbiAgICAgIGUgPSBlTWF4O1xuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSBlICsgZUJpYXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSAwO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpO1xuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG07XG4gIGVMZW4gKz0gbUxlbjtcbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KTtcblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjg7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NFwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3NcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vL3ZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jylcbi8vXG5cblxuLy9jb25zb2xlLmxvZygnZnV1dScpXG4vL3ZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG5cbi8qKiBAanN4IFJlYWN0LkRPTSAqLyAvKlxuUmVhY3QucmVuZGVyQ29tcG9uZW50KFxuICBSZWFjdC5ET00uaDEobnVsbCwgJ0hlbGxvLCB3b3JsZCEgSSBhbSBHb2QnKSxcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2V4YW1wbGUnKVxuKTtcblxuKi9cblxuLypcbnZhciBFbmdpbmUgPSByZXF1aXJlKCdmYW1vdXMvY29yZS9FbmdpbmUnKTtcbnZhciBTdXJmYWNlID0gcmVxdWlyZSgnZmFtb3VzL2NvcmUvU3VyZmFjZScpO1xuXG52YXIgbWFpbkNvbnRleHQgPSBFbmdpbmUuY3JlYXRlQ29udGV4dCgpO1xuXG52YXIgZmlyc3RTdXJmYWNlID0gbmV3IFN1cmZhY2Uoe1xuICBjb250ZW50OiAnaGVsbG8gd29ybGQnLFxuICBzaXplOiBbMjAwLCA0MDBdLFxuICBwcm9wZXJ0aWVzOiB7XG4gICAgY29sb3I6ICdibHVlJyxcbiAgICB0ZXh0QWxpZ246ICdjZW50ZXInLFxuICAgIGJhY2tncm91bmRDb2xvcjogJyNGQTVDNEYnXG4gIH1cbn0pO1xuXG5maXJzdFN1cmZhY2Uuc2V0Q29udGVudCgnPGgxPkhFTExPIFdPUkxELCBJIGFtIHRoaW5lIGdvZCBvbiBlYXJ0aDwvaDE+Jyk7XG5cbm1haW5Db250ZXh0LmFkZChmaXJzdFN1cmZhY2UpO1xuKi9cbnZhciBFbmdpbmUgPSByZXF1aXJlKCdmYW1vdXMvY29yZS9FbmdpbmUnKTtcbnZhciBTdXJmYWNlID0gcmVxdWlyZSgnZmFtb3VzL2NvcmUvU3VyZmFjZScpO1xudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJ2ZhbW91cy9jb3JlL1RyYW5zZm9ybScpO1xudmFyIFN0YXRlTW9kaWZpZXIgPSByZXF1aXJlKCdmYW1vdXMvbW9kaWZpZXJzL1N0YXRlTW9kaWZpZXInKTtcbnZhciBUcmFuc2l0aW9uYWJsZSA9IHJlcXVpcmUoJ2ZhbW91cy90cmFuc2l0aW9ucy9UcmFuc2l0aW9uYWJsZScpO1xudmFyIFNwcmluZ1RyYW5zaXRpb24gPSByZXF1aXJlKCdmYW1vdXMvdHJhbnNpdGlvbnMvU3ByaW5nVHJhbnNpdGlvbicpO1xuVHJhbnNpdGlvbmFibGUucmVnaXN0ZXJNZXRob2QoJ3NwcmluZycsIFNwcmluZ1RyYW5zaXRpb24pO1xuXG52YXIgbWFpbkNvbnRleHQgPSBFbmdpbmUuY3JlYXRlQ29udGV4dCgpO1xuXG52YXIgc3VyZmFjZSA9IG5ldyBTdXJmYWNlKHtcbiAgc2l6ZTogWzEwMCwgMTAwXSxcbiAgcHJvcGVydGllczoge1xuICAgIGNvbG9yOiAnd2hpdGUnLFxuICAgIHRleHRBbGlnbjogJ2NlbnRlcicsXG4gICAgYmFja2dyb3VuZENvbG9yOiAnI0ZBNUM0RidcbiAgfVxufSk7XG5cbnZhciBzdGF0ZU1vZGlmaWVyID0gbmV3IFN0YXRlTW9kaWZpZXIoe1xuICBvcmlnaW46IFswLjUsIDBdXG59KTtcblxubWFpbkNvbnRleHQuYWRkKHN0YXRlTW9kaWZpZXIpLmFkZChzdXJmYWNlKTtcblxudmFyIHNwcmluZyA9IHtcbiAgbWV0aG9kOiAnc3ByaW5nJyxcbiAgcGVyaW9kOiAxMDAwLFxuICBkYW1waW5nUmF0aW86IDAuM1xufTtcblxuc3RhdGVNb2RpZmllci5zZXRUcmFuc2Zvcm0oXG4gIFRyYW5zZm9ybS50cmFuc2xhdGUoMCwgMzAwLCAwKSwgc3ByaW5nXG4pO1xuXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvZmFrZV85N2QwZGQzZC5qc1wiLFwiL1wiKSJdfQ==
