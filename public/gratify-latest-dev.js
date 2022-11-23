/*! gratify 1.0.0 2022-11-23 6:11 AM */ var __gfy_version__ = "1.0.0";
function asert(x, type) {
	if (typeof type === 'object' && type.indexOf) {
		if (type.indexOf(typeof x) === -1) {
			throw new TypeError("Bad parameter of type " + (typeof x) + ", expecting " + type.join(', '));
		}
	} else {
		if (typeof x !== String(type)) {
			throw new TypeError("Bad parameter of type " + (typeof x) + ", expecting " + type);
		}
	}
}



if (typeof Object.assign !== 'function') {
	Object.assign = function(obj, array) {
		// Defaults
		if (typeof obj !== 'object') {
			obj = {};
		}
		if (typeof array !== 'object') {
			array = [];
		}

		// Clone object as temp
		var temp = JSON.parse(JSON.stringify(obj));

		// Fill object with array vals
		for (var i in array) {
			temp[i] = array[i];
		}

		return temp;
	};
}

if (typeof Math.randint !== 'function') {
	Math.randint = function(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
	};
}

if (!String.prototype.padStart) {
	String.prototype.padStart = function(targetLength, padString) {
		targetLength = targetLength >> 0; //truncate if number, or convert non-number to 0;
		padString = String(typeof padString !== 'undefined' ? padString : ' ');
		if (this.length >= targetLength) {
			return String(this);
		} else {
			targetLength = targetLength - this.length;
			if (targetLength > padString.length) {
				padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
			}
			return padString.slice(0, targetLength) + String(this);
		}
	};
}

/**
 * Does the array include the passed value?
 */
if (!Array.prototype.includes) {
	Object.defineProperty(Array.prototype, 'includes', {
		value: function(searchString, position) {
			return Boolean(Array(this).indexOf(searchString, position) > -1);
		}
	});
}

/**
 * Returns the value of the string after rot13 encoding.
 */
if (!String.prototype.rot13) {
	String.prototype.rot13 = function() {
		return String(this).replace(/[a-zA-Z]/g, function(c) {
			return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
		});
	};
}

/**
 * Appends the version tag as a uri parameter.
 */
if (!String.prototype.appendVersionTag) {
	String.prototype.appendVersionTag = function() {
		var str = String(this);

		if (gratify.app.version_tag != '') {
			if (str.indexOf('?') === -1) {
				str += '?';
			} else {
				str += '&';
			}

			str += '_=' + encodeURIComponent(gratify.app.version_tag);
		}

		return str;
	};
}

if (!String.prototype.isValidUrl) {
	String.prototype.isValidUrl = function(proto) {
		proto = proto || 'https';
		proto = proto + ":";

		try {
			url = new URL(String(this));
		} catch (e) {
			return false;
		}

		return url.protocol == proto;
	};
}

/**
 * Converts a number into human readable byte-size string.
 */
if (!Number.prototype.byteshr) {
	Number.prototype.byteshr = function() {
		var size = this.valueOf();
		var sizes = [' Bytes', ' KB', ' MB', ' GB'];
		for (var i = 1; i < sizes.length; i++) {
			if (size < Math.pow(1024, i)) {
				return (Math.round((size / Math.pow(1024, i - 1)) * 100) / 100) + sizes[i - 1];
			}
		}

		return size;
	};
}

if (!String.prototype.clipboard) {
	String.prototype.clipboard = function() {
		var text = String(this);
		var $temp = $('<input>');
		$('body').append($temp);
		$temp.val(text).select();
		document.execCommand('copy');
		$temp.remove();
		var $pop = $('<div class="gfy-text-copied">Text copied!</div>');
		$pop.css({
			position: 'fixed',
			left: gratify.app.cursor_x + 3 + 'px',
			top: gratify.app.cursor_y - 28 + 'px',
			zIndex: 101,
			fontSize: '12px',
			opacity: 0.7
		});
		$('body').append($pop);
		setTimeout(function() {
			var ftime = 200;
			setTimeout(function() {
				$pop.fadeOut(ftime);
				setTimeout(function() {
					$pop.remove();
				}, ftime);
			}, ftime);
		}, 300);
	};
}

// jQuery extensions
jQuery.fn.extend({
	/**
	 * Highlight all text within the node.
	 */
	selectMe: function() {
		var e = $(this)[0];
		var range = document.createRange();
		range.setStartBefore(e.firstChild);
		range.setEndAfter(e.lastChild);
		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
	}
});



/* jshint laxbreak: true */

/**
 * Gratify main object template.
 */
function GratifyMain() {
	var _this = this;
	this.default_system_service = 'sys';
	this.ready = false;
	this.config = {};
	this.error_callback = null;
	this.version = 0; // actual value set in init.js
	this.error_exists = false;
	this.last_error = '';
	this.endpoint = '';
	this.authbound = false;
	this.components = {};

	/**
	 * Init routine.
	 */
	this.init = function(config) {
		if (_this.ready) {
			return true;
		}

		try {
			asert(config, ['object', 'undefined']);
		} catch (ex) {
			return _this.error(ex.message, 'Main::init');
		}

		if (config) {
			_this.config = config;
		}

		var $gs = $('script[src*="gratify-"]');

		if ($gs.length == 0) {
			return _this.error("could not locate gratify script tag", "Main::init");
		}

		_this.dictionary = new GratifyDictionary();
		_this.thread = new GratifyThread();
		_this.web = new GratifyWeb();
		_this.app = new GratifyApp();
		_this.app.setVersionTag(btoa(_this.version).replace(/[^a-z\d]/i, ''));
		_this.app.sense();
		var uri = $gs.attr('src');
		var system_service = $gs.attr('system-service') ? $gs.attr('system-service') : _this.default_system_service;
		var matches = uri.match(/^(https?:\/\/[^\/]+\/)([a-z\d\-]*\/)?/i);
		_this.endpoint = String(matches ? matches[1] + matches[2] : (_this.app.base ? _this.app.base : '')).replace(/\/$/, '') + '/' + system_service;
		_this.client = new GratifyClient();
		_this.cmanager = new GratifyCManager();
		_this.scanner = new GratifyScanner();
		_this.router = new GratifyRouter();
		_this.ready = true;
	};

	/**
	 * jQuery wrapper.
	 */
	this.q = function(subject) {
		if (!$) {
			return _this.error('bad dom framework (missing jquery)', 'Main::q');
		}

		return subject ? $(subject) : $;
	};

	/**
	 * Get info about Gratify.
	 */
	this.info = function() {
		console.log('version: ' + _this.version);
		console.log('jquery version: ' + jQuery().jquery);
		console.log('dictionary size: ' + JSON.stringify(_this.dictionary.definitions).length);
		console.log('component count: ' + Object.keys(_this.cmanager.components).length);
		console.log('thread count: ' + Object.keys(_this.thread.intervals).length);
		console.log('thread density: ' + (function() {
			var x = 0;
			for (var i in _this.thread.intervals) {
				x += 1 / _this.thread.intervals[i].frequency;
			}
			return x;
		})().toFixed(3) + ' / sec');
	};

	/**
	 * Set a custom error method.
	 */
	this.setErrorCallback = function(callback) {
		try {
			asert(callback, 'function');
		} catch (ex) {
			return _this.error(ex.message, 'Main::setErrorCallback');
		}

		_this.error_callback = callback;
	};

	/**
	 * Log an error message and run the standard error callback.
	 *
	 * @return boolean Always returns FALSE.
	 */
	this.error = function(message, tag) {
		tag = typeof tag !== 'string' ? '' : tag;
		message = typeof message === 'object' ? JSON.stringify(message) : String(message);

		_this.last_error = message;
		_this.error_exists = true;

		console.error('Gratify Error' + (tag ? ' (' + tag + ')' : '') + ': ' + message);

		// Exec custom callback
		if (_this.error_callback) {
			_this.error_callback(message, tag);
		}

		return false;
	};

	/**
	 * Say something to the console.
	 */
	this.say = function(message) {
		if (_this.config.loud) {
			console.log('Gratify says, "' + (
				typeof message === 'object'
				? JSON.stringify(message)
				: String(message)
			) + '"');
		}
	};

	/**
	 * Request shortcut.
	 */
	this.request = function(rqstring, params, callback, lastly) {
		return _this.web.request(rqstring, params, callback, lastly);
	};

	/**
	 * Dictionary shortcut.
	 */
	this.def = function(name, value) {
		if (value === undefined) {
			return _this.dictionary.lookup(name);
		}

		return _this.dictionary.define(name, value);
	};

	/**
	 * Execute an application route.
	 *
	 * @arg {string} route
	 * @arg {string} push
	 * @arg {boolean} reload
	 */
	this.goto = function(route, push, reload) {
		_this.router.goto(route, push, reload);
	};

	/**
	 * Bind existing session auth to gratify.
	 */
	this.bindauth = function(sid, after) {
		try {
			asert(sid, 'string');
			asert(after, ['undefined', 'function']);
		} catch (ex) {
			return _this.error(ex.message, 'Main::bindauth');
		}

		_this.request('post ' + _this.endpoint + '/bindauth', { sid: sid }, function(r) {
			if (r.errno) {
				return _this.error(r.error);
			}

			if (r.payload == true) {
				_this.authbound = true;
				_this.say('authorization success: ' + sid);
			}
		}, after);
	};

	this.plugin = function(target, plugin, params, orientation) {
		try {
			asert(target, ['string', 'object']);
			asert(plugin, 'string');
			asert(params, ['undefined', 'object']);
			asert(orientation, ['undefined', 'string']);
		} catch (ex) {
			return _this.error(ex.message, 'Main::plugin');
		}

		orientation = String(orientation);
		params = JSON.stringify(params || {}).replaceAll('"', '&quot;');
		var $target = typeof target === 'string' ? $(target) : target;

		var div = '<div gfy-plugin="' + plugin + '(' + params + ')"></div>';

		if ($target === null) {
			return div;
		} else if (!$target.length) {
			return _this.error("plugin target '" + target + "' does not exist");
		}

		switch (orientation.toLowerCase()) {
			case 'append':
				$target.append(div);
				break;
			default:
			case 'replace':
				$target.html(div);
				break;
		}

		return true;
	};

	/**
	 * Spawn a new component.
	 */
	this.spawn = function(arg1, arg2, arg3) {
		try {
			asert(arg1, 'object');
			asert(arg2, ['undefined', 'object']);
			asert(arg3, ['undefined', 'boolean']);
		} catch (ex) {
			return _this.error(ex.message, 'Main::spawn');
		}

		return _this.cmanager.spawn(arg1, arg2, arg3);
	};

	/**
	 * Drop a spawned component.
	 *
	 * @return boolean
	 */
	this.drop = function(id) {
		return _this.cmanager.drop(id);
	};

	/**
	 * Get a spawned component.
	 *
	 * @return component
	 */
	this.get = function(id) {
		return _this.cmanager.get(id);
	};

	/**
	 * Find one or more elements.
	 */
	this.find = function(selector) {
		return(this.q(selector));
	};

	/**
	 * Wait for an element to become avilable; execute a callback function when it is.
	 */
	this.waitFor = function(selector, callback) {
		try {
			asert(selector, 'string');
			asert(callback, 'function');
		} catch (ex) {
			return _this.error(ex.message, 'Main::waitFor');
		}

		// Setup some vars for the thread
		var temp = Math.floor(Math.random() * Math.floor(5000));
		var thread_name = 'wait-for-' + temp;
		var i_max = 500;
		var i = 0;

		// Start the thread; this will self-close
		_this.thread.start(function() {
			var my_elem = _this.q(selector);
			if (my_elem.length) {
				callback(my_elem);
				i = i_max;
			}

			if (i >= i_max) {
				_this.thread.stop(thread_name);
			}

			i++;
		}, thread_name, 0.2);
	};
}

function GratifyDictionary() {
	var _this = this;
	this.definitions = {};

	/**
	 * Lookup a definition.
	 */
	this.lookup = function(name) {
		var parts;
		try {
			asert(name, 'string');
			parts = _this.explode(name);
		} catch (ex) {
			return gratify.error(ex.message, 'Dictionary::lookup');
		}

		// Search for value
		var val = null;
		for (var i in parts) {
			var part = parts[i];

			if (val === null) {
				// No definition, return empty string
				if (typeof _this.definitions[part] === 'undefined') {
					return '';
				}

				// Assign value as clone
				val = JSON.parse(JSON.stringify(_this.definitions[part]));
			}
			else {
				val = val[part];
			}

			// Found scalar value, stop recursing
			if (typeof val !== 'object') {
				break;
			}

			// Found undefined value, stop recursing
			// Return empty string
			if (typeof val === 'undefined') {
				return '';
			}
		}

		return val;
	};

	/**
	 * Update definition.
	 */
	this.define = function(name, value) {
		var parts;
		try {
			asert(name, 'string');
			asert(value, ['string', 'object', 'number']);
			parts = _this.explode(name);
		} catch (ex) {
			return gratify.error(ex.message, 'Dictionary::define');
		}

		// Search for value
		var pnt = _this.definitions;
		var changed = true;
		for (var i in parts) {
			var part = parts[i];

			// This is the last part, lets set it and get out
			if (i == parts.length - 1) {
				// Convert arrays to objects
				if (Array.isArray(value)) {
					value = Object.assign({}, value);
				}

				// Is value already the same?
				if (JSON.stringify(pnt[part]) === JSON.stringify(value)) {
					changed = false;
					break;
				}

				pnt[part] = value;
				break;
			}
			
			// Found nested object, reassign pointer
			if (typeof pnt[part] === 'object') {
				pnt = pnt[part];
				continue;
			}

			// Found scalar or unassigned value in def tree
			// Build new object
			else {
				pnt[part] = {};
				pnt = pnt[part];
				continue;
			}
		}

		// Queue component updates
		if (changed) {
			gratify.say('definition of ' + name + ' updated');

			for (var x = parts.length - 1; x >= 0; x--) {
				for (var c in gratify.cmanager.components) {
					var component = gratify.cmanager.components[c];
					if ($.inArray(name, component.$udefs) !== -1) {
						gratify.cmanager.queue(component.$id);
					}
				}

				name = name.replace(new RegExp('\\.' + parts[x] + '$'), '');
			}
		}
	};

	/**
	 * Explode a definition name into parts.
	 */
	this.explode = function(name) {
		name = String(name);

		if (!name.match(/^[a-z\d_\-\.]+$/i) || name.indexOf('..') !== -1) {
			throw new TypeError("invalid definition name; only letters, numbers, dashes, and underscores are allowed");
		}

		return name.split('.');
	};
}

function GratifyCManager() {
	var _this = this;
	this.components = {};
	this.updateQueue = [];

	/**
	 * Spawn a new component.
	 */
	this.spawn = function(template, options, defer_create) {
		var id, htdoc, htargs, target, parent;
		try {
			asert(template, 'object');
			asert(template.$id, 'string');
			options = typeof options === 'object' ? options : {};
			id = typeof options.id === 'string' ? options.id : template.$id;
			htdoc = typeof template.$htdoc === 'string' ? template.$htdoc : null;
			htargs = typeof template.$htargs === 'object' ? template.$htargs : {};
			target = typeof template.$target === 'string' ? template.$target : null;
			parent = typeof options.parent === 'object' ? options.parent : null;
			asert(options.target, ['undefined', 'object', 'string']);
			target = options.target || target;
			defer_create = Boolean(defer_create);
		} catch (ex) {
			return gratify.error(ex.message, 'CManager::spawn');
		}

		if (typeof _this.components[id] !== 'undefined') {
			var x = id.match(/-\d+$/) ? parseInt(id.match(/\d+$/)[0]) : 0;
			var new_id;

			do {
				x++;
				new_id = id.replace(/-\d+$/, '') + '-' + x;
			} while (typeof _this.components[new_id] !== 'undefined');

			id = new_id;
		}

		try {
			gratify.say('spawning new component <' + id + '>');
			var component = new GratifyComponent(template);
			component.$id = id;
			component.$options = options;
			_this.components[id] = component;
			if (!defer_create) {
				component.$create(options);
			}
		} catch (ex) {
			return gratify.error(ex.message, 'CManager::spawn');
		}

		gratify.say('new component ready <' + id + '>');

		return _this.components[id];
	};

	/**
	 * Drop a component.
	 */
	this.drop = function(id) {
		if (typeof id === 'object') {
			if (typeof id.$id === 'string') {
				id = id.$id;
			}
		}

		if (typeof _this.components[id] === 'object') {
			_this.components[id].$destroy();
			delete _this.components[id];

			gratify.say('dropped component <' + id + '>');

			return true;
		}

		return false;
	};

	/**
	 * Get a component object by id.
	 */
	this.get = function(id) {
		return _this.components[id];
	};

	/**
	 * Queue a component for updates.
	 */
	this.queue = function(id) {
		if ($.inArray(id, _this.updateQueue) === -1) {
			_this.updateQueue.push(id);
			gratify.say('component ' + id + ' queued for update');
		}
	};

	(function() {
		gratify.thread.start(function() {
			for (var i in _this.updateQueue) {
				var cid = _this.updateQueue[i];
				var component = gratify.get(cid);

				
				if (component) {
					component.$update();
					gratify.say('component ' + component.$id + ' updated');
				}

				delete _this.updateQueue[i];
			}
		}, 'cmanager.queue', 0.2);
	})();
}

function GratifyComponent(properties) {
	var _this = this;

	asert(properties, 'object');

	// Validate and properties
	for (var i in properties) {
		var property = properties[i];

		switch (i) {
			case '$create':
			case '$destroy':
			case '$draw':
			case '$update':
				asert(property, 'function');
				break;
			case '$spawn':
			case '$ready':
			case '$rendered':
			case '$options':
				throw 'user cannot define ' + i;
		}

		_this[i] = property;
	}

	// Default required properties
	if (!this.hasOwnProperty('$create')) {
		this.$create = function() {};
	}
	if (!this.hasOwnProperty('$destroy')) {
		this.$destroy = function() {};
	}
	this.$spawn = function(template, options) {
		asert(template, 'object');
		options = typeof options === 'object' ? options : {};
		return gratify.spawn(template, Object.assign(options, { parent: this }));
	};
	this.$ready = function(callback) {
		asert(callback, 'function');
		gratify.waitFor('#' + this.$id, callback);
	};
	this.$rendered = function() {
		return Boolean($('#' + this.$id).length);
	};

	// The component manager will run $create()
	// at this point.
}


/**
 * 
 */
function GratifyApp() {
	var _this = this;
	this.params = {}; // parsed query params
	this.path = document.location.pathname;
	this.query = document.location.search;
	this.base = ''; // document base path
	this.zoomlvl = 100;
	this.cursor_x = 0;
	this.cursor_y = 0;
	this.breakpoint = 'tiny';
	this.version_tag = ''; // used as a tag when retreiving web resources
	this.site_name = ''; // used in title generation
	this.root = document.body; // app root container

	/**
	 * Set the application's version tag.
	 */
	this.setVersionTag = function(tag) {
		tag = String(tag);
		if (!tag.match(/^[a-z\d]+$/i)) {
			return gratify.error('invalid tag value', 'App::setVersionTag');
		}

		_this.version_tag = tag;
	};

	/**
	 * Set the application's site name.
	 */
	this.setSiteName = function(site_name) {
		_this.site_name = String(site_name);
	};

	/**
	 * Add a new resource to the current document.
	 */
	this.include = function(type, url, id, extras) {
		try {
			extras = typeof extras === 'object' ? extras : {};
			asert(type, 'string');
			asert(url, 'string');
		} catch (ex) {
			return gratify.error(ex.message, 'App::include');
		}

		// Append resource to document
		var resource;
		switch (type) {
			case 'script':
				resource = document.createElement('script');
				resource.async = true;
				if (extras.crossorigin) {
					resource.crossorigin = String(extras.crossorigin);
				}
				if (typeof id === 'string') {
					resource.id = id;
				}
				resource.src = url.appendVersionTag();
				break;
			case 'css':
				resource = document.createElement('link');
				resource.type = 'text/css';
				resource.rel = 'stylesheet';
				if (typeof id === 'string') {
					resource.id = id;
				}
				resource.href = url.appendVersionTag();
				break;
			default:
				return gratify.error('bad resource type', 'App::include');
		}

		$(document).find('head').append(resource);
	};

	/**
	 * Drop an included resource.
	 */
	this.exclude = function(id) {
		$('script#' + id + ', link#' + id).remove();
	};

	/**
	 * Automatically detect changes to the application environment.
	 */
	this.sense = function(force) {
		if (force || document.location.search != _this.query) {
			// Get url params
			var urlParts = location.search.split('?');
			if (urlParts.length > 1) {
				params = urlParts[1].split('&');

				for (var key in params) {
					paramParts = params[key].split('=');
					if (paramParts[1]) {
						_this.params[paramParts[0]] = decodeURIComponent(paramParts[1].replace(/\+/g, '%20'));
					}
				}
			}
		}

		try {
			$(window).trigger('resize');
			_this.zoomlvl = Math.round(window.devicePixelRatio * 100);
		} catch (ex) {
			_this.zoomlvl = 100;
		}
	};

	this.gotoBase = function(reload) {
		var dest = this.base ? this.base : '/';
		gratify.goto(dest, false, reload);
	};

	(function() {
		$(_this.root).addClass('tiny');
		var $head = $('html > head');

		if ($head.length) {
			var $base = $head.find('base');
			if ($base.length) {
				_this.base = $base.attr('href').replace(/\/+$/, '');
			}
		}

		$(document).on('mousemove', function(e) {
			_this.cursor_x = e.pageX;
			_this.cursor_y = e.pageY;
		});

		$(window).on('resize', function(e) {
			try {
				var width = parseInt(window.innerWidth);
				width = isNaN(width) || width < 0 ? 0 : width;
				var bp = 'tiny';

				if (width >= 400) {
					bp = 'small';
				}

				if (width >= 1024) {
					$(_this.root).addClass('standard');
					bp = 'standard';
				}

				if (width >= 1920) {
					bp = 'large';
					$(_this.root).addClass('large');
				}

				if (bp != _this.breakpoint) {
					$(_this.root).removeClass('standard');
					$(_this.root).removeClass('large');
					$(_this.root).removeClass('small');

					if (bp == 'small') {
						$(_this.root).addClass('small');
					} else if (bp == 'standard') {
						$(_this.root).addClass('small');
						$(_this.root).addClass('standard');
					} else if (bp == 'large') {
						$(_this.root).addClass('small');
						$(_this.root).addClass('standard');
						$(_this.root).addClass('large');
					}
				}

				_this.breakpoint = bp;
			} catch (ex) {
				_this.breakpoint = 'tiny';
			}
		}).trigger('resize');

		_this.sense(true);
	})();
}

/* jshint esversion: 6 */

function GratifyWeb() {
	var _this = this;
	this.max_tries = 5;
	this.wait = 1; // wait time before retry (in seconds)
	this.seeds = {};

	/**
	 * Set the wait time for requests.
	 */
	this.setWait = function(new_wait) {
		try {
			asert(new_wait, 'number');
		} catch (ex) {
			gratify.error(ex.message, 'Web::setWait');
		}

		_this.wait = new_wait;
	};

	/**
	 * Perform an HTTP request.
	 */
	this.request = function(rqstring, params, callback, lastly) {
		try {
			params = typeof params === 'undefined' ? {} : params;
			callback = typeof callback === 'undefined' ? function(){} : callback;
			lastly = typeof lastly === 'undefined' ? function(){} : lastly;
			asert(rqstring, 'string');
			asert(params, 'object');
			asert(callback, 'function');
			asert(lastly, 'function');
		} catch (ex) {
			return gratify.error(ex.message, 'Web::request');
		}

		// Explode request string
		var matches = rqstring.match(/^(get|post|put|delete|file) (\S*)(( --?[a-z-]+)*)$/i);
		if (!matches) {
			return gratify.error('bad request string: ' + rqstring, 'Web::request');
		}

		// Setup request options
		var method = matches[1].toLowerCase();
		var url = matches[2];
		if (url.match(/^\//) && gratify.app.base) {
			url = gratify.app.base + url;
		}
		var options = matches[3].trim().split(' ');
		switch (method) {
			case 'get':
				if (params && Object.keys(params).length) {
					if (url.indexOf('?') === -1)  {
						url += '?';
					}

					url += $.param(params);
				}
				break;
		}

		var cache = Boolean(options.indexOf('--cache') !== -1);
		var version = Boolean(options.indexOf('--version') !== -1 || options.indexOf('-v') !== -1);
		var async = Boolean(options.indexOf('--block') === -1);

		var seed = _this.genseed();
		gratify.say('starting ' + method.toUpperCase() + ' request #' + seed + ' to ' + url);

		var data = null;
		if (method == 'file') {
			data = params;
		} else if (method == 'post') {
			if (params.toString().indexOf('FormData') !== -1) {
				data = {};
				params.forEach(function(value, key){
					data[key] = value;
				});
			} else {
				data = params;
			}
		}

		// Send request
		$.ajax({
			url: version ? url.appendVersionTag() : url,
			data: data,
			method: method == 'get' ? 'get' : 'post',
			async: async,
			cache: cache,
			contentType: method == 'file' ? false : 'application/x-www-form-urlencoded; charset=UTF-8',
			processData: method == 'file' ? false : true,
			dataType: 'text',
			xhrFields: { withCredentials: true },
			success: function (response, status, xhr) {
				gratify.say('#' + seed + ' responded ' + xhr.status + ' ' + xhr.statusText);

				try {
					response = JSON.parse(response);
				} catch (e) {
					gratify.say('warning: failed to parse response as json');
				} finally {
					callback(response, seed);
				}

				delete(_this.seeds[seed]);
			},
			error: function(xhr, textStatus) {
				delete(_this.seeds[seed]);
				return gratify.error('http request error [status:' + xhr.status + '; response:' + xhr.responseText + ']', 'Web::request');
			},
			complete: lastly
		});

		return seed;
	};

	this.genseed = function() {
		var seed = 0;

		for (i = 0; i < 100; i++) {
			seed = Math.randint(100000, 999999);
			if (!Boolean(_this.seeds[seed])) {
				break;
			}
		}

		_this.seeds[seed] = Math.floor(Date.now() / 1000);

		return seed;
	};
}


/**
 * Start and stop threaded routines.
 */
function GratifyThread() {
	var _this = this;
	this.intervals = {};

	/**
	 * Start a new thread.
	 */
	this.start = function(func, id, frequency) {
		try {
			asert(func, 'function');
		} catch (ex) {
			return gratify.error(ex.message, 'Thread::start');
		}

		if (typeof id !== 'string') {
			id = (new Date()).getTime();
		}

		if (typeof frequency !== 'number') {
			frequency = 1;
		}

		// Start the thread
		if (typeof _this.intervals[id] === 'undefined') {
			_this.intervals[id] = {
				id: setInterval(func, frequency * 1000),
				frequency: frequency
			};

			func();
		}

		return id;
	};

	/**
	 * Stop an existing thread.
	 */
	this.stop = function(id) {
		if (typeof _this.intervals[id] !== 'undefined') {
			clearInterval(_this.intervals[id].id);
			delete _this.intervals[id];
		}
	};
}

/**
 * Scans the DOM for special tags. Discovered elements
 * will be subject to scripted events.
 */
function GratifyScanner() {
	var _this = this;
	this.absorb_rate = 0.2;
	this.tick_rate = 0.25;
	this.elements = [];
	this.index_registry = {};
	this.tags = [
		'gfy-var',
		'gfy-goto',
		'gfy-plugin'
	];

	gratify.thread.start(function() {
		// Look for and add new elements
		for (var i in _this.tags) {
			var tag = _this.tags[i];
			var $elems = $(gratify.app.root).find('[' + tag + ']');

			/* jshint ignore:start */
			$elems.each(function(x, e) {
				if ($.inArray(e, _this.elements) === -1) {
					_this.elements.push(e);
				}
			});
			/* jshint ignore:end */
		}

		// Drop deleted elements
		for (var x in _this.elements) {
			var checkme = gratify.app.root;
			if (gratify.client.browser == 'ie' && checkme == document) {
				checkme = document.body;
			}

			if (!checkme.contains(_this.elements[x])) {
				_this.elements.splice(x, 1);
			}
		}
	}, 'gratify-scanner-absorb-dom', this.absorb_rate);

	gratify.thread.start(function() {
		for (var i in _this.elements) {
			var $e = $(_this.elements[i]);

			// Dictionary event
			var term = $e.attr('gfy-var');
			if (term) {
				var data = gratify.def(term);
				if ($e.html() != data) {
					$e.html(data);
				}
			}

			// Navigation events
			var nav = $e.attr('gfy-goto');
			if (nav) {
				if (!$e.prop('gfy-goto-active')) {
					/* jshint ignore:start */
					$e.prop('gfy-goto-active', true).on('click', function() {
						gratify.goto($(this).attr('gfy-goto'));
					});
					/* jshint ignore:end */
				}
			}

			var plugin = $e.attr('gfy-plugin');
			if (plugin) {
				if (!$e.prop('gfy-plugin-loaded')) {
					var matches = plugin.match(/^([a-z\d-]+)\.([a-z\d-]+)(\((.*)\))?$/);

					if (!matches) {
						$e.prop('gfy-plugin-loaded', true);
						return gratify.error('invalid gratify plugin: ' + plugin);
					}

					if (String($e.attr('gfy-wait-for-auth')) === 'true') {
						if (!gratify.authbound) {
							return; // try again next time
						}
					}

					var seed = 0;
					var namespace = matches[1];
					var plgName = matches[2];
					var params = matches[4];

					if (params) {
						try {
							params = JSON.parse(params);
						} catch (ex) {
							gratify.error("could not parse plugin parameters: " + ex.message);
						}
					}

					if (typeof params !== 'object') {
						params = {};
					}

					params.namespace = namespace;
					params.plugin = plgName;
					params.json = 1;

					/* jshint ignore:start */
					seed = gratify.request('get ' + gratify.endpoint + '/plugin --cache --version', params, function(r, s) {
						var $dest = $(_this.elements[_this.index_registry[s]]);

						if ($dest.length == 0) {
							return gratify.error('destination element has gone away (seed#' + s + ')');
						}

						delete(_this.index_registry[s]);

						if (typeof r !== 'object') {
							return gratify.error('invalid response from plugin endpoint: ' + String(r));
						}

						if (r.errno) {
							return gratify.error(r.error);
						}

						if (!r.payload) {
							return gratify.error('empty or invalid payload received: ' + String(r.payload));
						}

						try {
							var doc = document;
							var head = doc.head || null;

							if (!head) {
								gratify.say('warning: no document head; plugin js/css will be skipped');
							}

							var meta = r.payload.meta;
							var html = r.payload.html;
							var css = r.payload.css;
							var js = r.payload.js;

							if (!meta) {
								throw { message: 'no meta data received', code: 1 };
							}

							var namespace = meta.namespace;
							var component_name = meta.component_name;
							var plugin_class = namespace + '-' + meta.plugin_name;

							if (html) {
								$dest.html(html);
							}

							if (head) {
								if (css) {
									$(document).find('head').append('<style>' + css + '</style>');
								}

								if (js) {
									if (typeof gratify.components[namespace] !== 'object') {
										gratify.components[namespace] = {};
									}

									$(head).append('<script>' + js + '</script>');

									var component = gratify.components[namespace][component_name];

									if (typeof component !== 'object') {
										throw { message: "component js missing object definition '" + namespace + '.' + component_name + "'" };
									}

									component.$id = component_name;
									var obj = gratify.spawn(component, {}, true);

									if (obj) {
										obj.$container = $dest.find('.' + plugin_class);
									}

									obj.$create();
								}
							}
						} catch (ex) {
							gratify.error('error loading plugin: ' + ex.message, ex);
						}
					});

					_this.index_registry[seed] = i;
					$e.prop('gfy-plugin-loaded', true);
					/* jshint ignore:end */
				}
			}
		}
	}, 'gratify-scanner-event-handler', this.tick_rate);
}


function GratifyClient() {
	var _this = this;
	this.browser = 'unknown';
	this.device = 'unknown';
	this.platform = 'unknown';
	this.platver = 'unknown';

	this.isMobile = function() {
		return (_this.device == 'phone' || _this.device == 'tablet');
	};

	(function() {
		var a = navigator.userAgent;

		// Detect browser
		if (a.match(/^Mozilla\/.+Edge\/.+$/)) {
			_this.browser = 'edge';
		} else if (a.match(/^Mozilla\/.+(Chrome\/|CriOS\/).+$/)) {
			_this.browser = 'chrome';
		} else if (a.match(/^Mozilla\/.+Trident\/.+$/)) {
			_this.browser = 'ie';
		} else if (a.match(/^Mozilla\/.+Gecko\/.+Firefox\/.+$/)) {
			_this.browser = 'firefox';
		} else if (a.match(/^Mozilla\/.+AppleWebKit\/.+Safari\/.+$/)) {
			_this.browser = 'safari';
		}

		// Detect platform
		if (a.match(/Windows NT/)) {
			_this.platform = 'win';
		} else if (a.match(/Android/)) {
			_this.platform = 'android';
		} else if (a.match(/(iOS|iPhone|iPad)/)) {
			_this.platform = 'ios';
		} else if (a.match(/Mac OS/)) {
			_this.platform = 'mac';
		} else if (a.match(/Linux/)) {
			_this.platform = 'linux';
		}

		// Detect plat version
		if (_this.platform == 'win') {
			matches = a.match(/Windows NT ([\d\.]+)/);
			if (matches) {
				_this.platver = matches[1];
			}
		}

		// Detect device
		if ((a.match(/Tablet|iPad/) && _this.platform != 'win') ||
			(_this.platform == 'android' && !a.match(/Mobile/))) {
			_this.device = 'tablet';
		} else if (a.match(/Mobile|iPhone/)) {
			_this.device = 'phone';
		} else if (_this.platform == 'win' || _this.platform == 'mac') {
			_this.device = 'desktop';
		}
	})();
}

/**
 * Provides component/url routing structure with 'goto'
 */
function GratifyRouter() {
	var _this = this;
	this.started = false;
	this.myRoute = ''; // The current route -- managed by goto()
	this.routes = {};
	this.strict = false;

	/**
	 * Start the router.
	 */
	this.start = function(routes, options) {
		options = typeof options === 'object' ? options : {};
		strict = Boolean(options.strict);
		auto = Boolean(options.auto);

		if (_this.started) {
			return false;
		}

		try {
			asert(routes, 'object');
		} catch (ex) {
			return gratify.error(ex.message, 'Router::start');
		}

		_this.routes = routes;

		// History listener
		window.addEventListener('popstate', function(e) {
			var l = e.target.location;
			_this.goto(l.pathname + (l.hash || ''), false);
		});

		if (strict) {
			_this.strict = true;
		}

		_this.started = true;
		gratify.say('router started with ' + Object.keys(routes).length + ' nodes');

		if (auto) {
			_this.resolve(options);
		}

		return true;
	};

	/**
	 * Resolve the current URL.
	 */
	this.resolve = function(options) {
		options = typeof options === 'object' ? options : {};
		var route = location.pathname + (location.search || '') + (location.hash || '');
		gratify.say("resolving " + route);
		_this.goto(route, false);
	};

	/**
	 * Navigate backward.
	 */
	this.back = function() {
		_this.goto(_this.lastRoute);
	};

	/**
	 * "Go to" somewhere in your app. This will trigger
	 * a component action. This is the main application
	 * routing mechanism.
	 *
	 * @arg {string} route a local url string (ex. /home)
	 * @arg {string} push relating to the history state; as opposed to replace
	 */
	this.goto = function(route, push, reload) {
		var _this = this;

		try {
			push = typeof push === 'undefined' ? false : push;
			reload = Boolean(reload);
			asert(route, 'string');
		} catch (ex) {
			return gratify.error(ex.message, 'Router::goto');
		}

		// Cleanup route
		var base = gratify.app.base ? gratify.app.base : '';
		route = route.replace(base, '').replace(/\/+$/, '') || '/';

		if (reload) {
			gratify.say('relocating to ' + route);
			document.location.href = route;
			return;
		}

		if (route.indexOf('#') !== -1) {
			route = route.split('#')[0];
		}

		gratify.say('routing to ' + route);

		var returnVal = '';
		var real_route = '';
		var arg1 = null;
		var arg2 = null;
		var argx = {};
		var parts = [];
		var cpt_parts = [];
		var num_navs = 0;
		var part = '';
		var hist_name = '';

		// Translate custom routes
		real_route = route.split('?')[0];
		for (var r in _this.routes) {
			if (r.match(/\*$/)) {
				if (r.split('*').length - 1 > 1) {
					return gratify.error('too many route wildcards; only 1 allowed');
				}

				var matches = real_route.match(new RegExp('^' + r.replace('*', '(.*)'), 'i'));
				if (matches && matches.length) {
					real_route = _this.routes[r];
					var a = matches[1].split('/');
					for (var n in a) {
						if (a[n]) {
							argx[n] = a[n];
						}
					}
				}
			} else {
				if (real_route.toLowerCase() == r.toLowerCase()) {
					real_route = _this.routes[r];
				}
			}
		}

		// Get main route pieces
		parts = real_route.split('?');
		cpt_parts = parts[0].split('/');
		arg1 = cpt_parts.length > 1 ? cpt_parts[1].toLowerCase() : (_this.strict ? null : 'main');
		arg2 = cpt_parts.length > 2 ? cpt_parts[2].toLowerCase() : (_this.strict ? null : 'index');

		if (arg2) {
			// Build action name (translates into camelCase)
			// ex. do-this => doThis
			// ex. find-something-else => findSomethingElse
			var aname = '';
			var aparts = arg2.split('-');
			for (var i in aparts) {
				part = aparts[i];
				if (i > 0) {
					aname += part.charAt(0).toUpperCase() + part.slice(1);
				} else {
					aname += part.charAt(0) + part.slice(1);
				}
			}

			arg2 = aname;

			if (hist_name) {
				hist_name += '-';
			}

			hist_name += arg2;
		}

		// Build action arguments
		if (parts.length > 1) {
			var query_parts = parts[1].split('&');
			for (var x = 0; x < query_parts.length; x++) {
				var k = query_parts[x].split('=')[0];
				var v = query_parts[x].split('=')[1] || true;
				argx[k] = v === '0' ? 0 : v;
			}
		}

		if (typeof argx.page_title === 'string') {
			var page_title = argx.page_title.trim();

			if (gratify.app.site_name) {
				page_title = page_title + ' | ' + gratify.app.site_name.trim();
			}

			document.title = page_title;
		}

		// Build component name (translates into PascalCase)
		// ex. app-new-comp => AppMyNewComp
		// ex. app-course => AppGolfCourse
		//
		// This WILL NOT WORK if your site is in a subdir
		// and does not contain a <base> tag. If you are
		// experiencing issues, check this first.
		var cname = '';
		var cparts = arg1.split('-');
		for (var j in cparts) {
			part = cparts[j];
			cname += part.charAt(0).toUpperCase() + part.slice(1);
		}

		// Get component
		var c = gratify.get(cname);
		if (!c) {
			var desc = 'component ' + cname + ' does not exist';
			if (cname == 'Default') {
				desc += '; please check your routes';
			}
			return gratify.error(desc, 'Router::goto');
		} else if (typeof c[arg2] !== 'function') {
			return gratify.error('action "' + arg2 + '" does not exist for ' + cname, 'Router::goto');
		}

		// Update window history
		if (route != _this.myRoute) {
			if (push) {
				window.history.pushState(argx, hist_name, base + route);
			} else {
				window.history.replaceState(argx, hist_name, base + route);
			}

			_this.lastRoute = _this.myRoute;
			_this.myRoute = route;
		}

		try {
			returnVal = c[arg2](argx);
		} catch (ex) {
			returnVal = false;
			gratify.error('exception: ' + ex.message, 'Router::goto');
		}

		gratify.app.sense();

		return returnVal;
	};
}

var min_jq_ver = 3.1;
var gratify;
var config = {
	loud: true
};

if (typeof jQuery === 'undefined') {
	console.error('could not load gratify; missing jQuery');
} else if (parseFloat(jQuery().jquery.substr(0, 3)) < min_jq_ver) {
	console.error('could not load gratify; jQuery version too old -- requires at least ' + min_jq_ver + '.x');
} else {
	if ($ !== jQuery) {
		$ = jQuery;
	}

	document.addEventListener('DOMContentLoaded', function() {
		gratify = new GratifyMain();
		gratify.version = __gfy_version__;
		gratify.init(config);
	});
}

