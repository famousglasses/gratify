/* jshint laxbreak: true */
/* jshint multistr: true */

/**
 * Gratify main object template.
 */
function GratifyMain() {
	var _this = this;
	this.ready = false;
	this.config = {};
	this.error_callback = null;
	this.version = 0; // actual value set in init.js
	this.error_exists = false;
	this.last_error = '';
	this.endpoint = '';
	this.system_endpoint = '';
	this.api_endpoint = '';
	this.auth_endpoint = '';
	this.img_path = '';
	this.user_info = {};
	this.components = {};
	this.debug_css = false;
	this.debug_active = false;

	/**
	 * Init routine.
	 */
	this.init = function(config) {
		if (_this.ready) {
			return true;
		}

		try {
			assert(config, ['object', 'undefined']);
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

		_this.app = new GratifyApp();
		var uri = $gs.attr('src');
		var src_matches = uri.match(/^(https?:\/\/[^\/]+\/)([a-z\d\-]*\/)?/i);

		if (src_matches) {
			_this.endpoint = src_matches[1] + src_matches[2];
		} else {
			_this.endpoint = String(_this.app.base ? _this.app.base : '');
		}

		_this.endpoint = _this.endpoint.replace(/\/$/, '');
		_this.img_path = _this.endpoint + '/public/img';
		_this.system_endpoint = _this.endpoint + '/sys';
		_this.api_endpoint = _this.endpoint + '/api';
		_this.auth_endpoint = _this.api_endpoint + '/auth/oauth';
		var arg_matches = uri.match(/\?[^\?]+$/i);

		if (arg_matches) {
			try {
				var argstr = arg_matches[0].substring(1);
				var args_raw = argstr.split('&');
				var args = {};

				if (args_raw.length) {
					for (var a in args_raw) {
						var kv = args_raw[a];
						var kv_parts = kv.split('=');

						if (kv_parts.length != 2) {
							throw { message: "no value for key '" + kv[0] + "'" };
						}

						var key = kv_parts[0];
						var val = kv_parts[1];
						args[key] = val;
					}

					Object.assign(_this.config, args);
				}
			} catch (ex) {
				gratify.error("found invalid inclusion arguments: " + ex.message, "Main::init");
			}
		}

		var auth_protos = ['cookie', 'header'];

		if ($.inArray(_this.config.auth_proto, auth_protos) === -1) {
			return _this.error("bad config: unknown auth_proto '" + _this.config.auth_proto + "'; valid types are " + auth_protos.join(', '), 'Main::init');
		}

		_this.dictionary = new GratifyDictionary();
		_this.thread = new GratifyThread();
		_this.app.setVersionTag(btoa(_this.version).replace(/[^a-z\d]/i, ''));
		_this.app.sense();
		_this.web = new GratifyWeb();
		_this.auth = new GratifyAuth();
		_this.datasource = new GratifyDatasource();
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
		console.log('subscriber count: ' + Object.keys(_this.datasource.subscribers).length);
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
			assert(callback, 'function');
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
		if (Number(_this.config.loud)) {
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
	 * Inject a plugin into the DOM.
	 */
	this.plugin = function(target, plugin, params, orientation) {
		try {
			assert(target, ['string', 'object']);
			assert(plugin, 'string');
			assert(params, ['undefined', 'object']);
			assert(orientation, ['undefined', 'string']);
		} catch (ex) {
			return _this.error(ex.message, 'Main::plugin');
		}

		orientation = String(orientation);
		//params._rand = Math.floor(Math.random() * 9999) + 1;
		params = JSON.stringify(params || {}).replaceAll('"', '&quot;');
		var $target = typeof target === 'string' ? $(target) : target;

		var div = '<div gratify-plugin="' + plugin + '(' + params + ')"></div>';

		if ($target === null) {
			return div;
		} else if (!$target.length) {
			return _this.error("plugin target '" + target + "' does not exist");
		}

		switch (orientation.toLowerCase()) {
			case 'append':
				$target.append(div);
				break;
			case 'reload':
				var classes = $target.attr('class');
				$div = $(div);
				$div.addClass(classes);
				$target.replaceWith($div);
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
			assert(arg1, 'object');
			assert(arg2, ['undefined', 'object']);
			assert(arg3, ['undefined', 'boolean']);
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
			assert(selector, 'string');
			assert(callback, 'function');
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

	/**
	 * Enable/disable debug mode.
	 */
	this.debug = function() {
		if (!this.debug_css) {
			$('head').append('\
				<style>\
					.gratify-debug {\
						border: 2px solid red;\
					}\
				</style>\
			');
			this.debug_css = true;
		}

		var $plugins = $('[gratify-plugin]');

		if (this.debug_active) {
			$plugins.removeClass('gratify-debug');
		} else {
			$plugins.addClass('gratify-debug');
		}

		this.debug_active = !this.debug_active;
	};
}
