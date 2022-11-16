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
	 */
	this.goto = function(route, push) {
		_this.router.goto(route, push);
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

		if (!$target.length) {
			return _this.error("plugin target '" + target + "' does not exist");
		}

		var div = '<div gfy-plugin="' + plugin + '(' + params + ')"></div>';

		switch (orientation.toLowerCase()) {
			case 'append':
				$target.append(div);
				break;
			default:
			case 'replace':
				$target.html(div);
				break;
		}
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
