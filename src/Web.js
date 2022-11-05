/* jshint esversion: 6 */

function GratifyWeb() {
	var _this = this;
	this.max_tries = 5;
	this.wait = 1; // wait time before retry (in seconds)
	this.call_stack = {};

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

		// Append to call stack
		var sig = btoa(rqstring + btoa(JSON.stringify(params)));
		if (typeof _this.call_stack[sig] === 'undefined') {
			_this.call_stack[sig] = {
				tries: 0
			};
		}

		_this.call_stack[sig].tries++;

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

		var seed = Math.randint(100, 999);
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
					// do nothing
				} finally {
					callback(response);
				}
			},
			error: function(xhr, textStatus) {
				return gratify.error('http request error [status:' + xhr.status + '; response:' + xhr.responseText + ']', 'Web::request');
			},
			complete: lastly
		});
	};
}

