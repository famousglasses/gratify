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
			assert(new_wait, 'number');
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
			assert(rqstring, 'string');
			assert(params, 'object');
			assert(callback, 'function');
			assert(lastly, 'function');
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
		// todo do we need this?
		//if (url.match(/^\//) && gratify.app.base) {
		//	url = gratify.app.base + url;
		//}
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
		var block = Boolean(options.indexOf('--block') === -1);
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

		var headers = {};
		var xhrFields = { withCredentials: true };

		if (gratify.config.auth_proto == 'header') {
			if (gratify.auth.token) {
				headers.Authorization = 'Bearer ' + btoa(auth.token);
			} else if (url.match(/session/)) {
				headers.Authorization = 'Ask';
			} else {
				headers.Authorization = 'Guest';
			}
		}

		// todo add auth_active flag to requests??

		if (gratify.config.origin_delegate) {
			headers['Origin-Delegate'] = gratify.config.origin_delegate;
		}

		// Send request
		$.ajax({
			url: version ? url.appendVersionTag() : url,
			data: data,
			method: method == 'get' ? 'get' : 'post',
			async: block,
			cache: cache,
			headers: headers,
			contentType: method == 'file' ? false : 'application/x-www-form-urlencoded; charset=UTF-8',
			processData: method == 'file' ? false : true,
			dataType: 'text',
			xhrFields: xhrFields,
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

