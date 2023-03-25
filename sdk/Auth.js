/* jshint laxbreak: true */
/* jshint multistr: true */

/**
 * Gratify main object template.
 */
function GratifyAuth() {
	var _this = this;
	this.active = Boolean(GRATIFY_AUTH_ACTIVE) || false;
	this.token = '';
	this.user_info = {};

	/**
	 * Authorize client with gratify system.
	 */
	this.authorize = function(params, after) {
		try {
			assert(params, ['object']);
			assert(after, ['undefined', 'function']);
		} catch (ex) {
			return gratify.error(ex.message, 'Main::authorize');
		}

		var grant_type = params.grant_type || '';
		var token = params.token || '';
		params.scope = params.scope || 'id';
		params.no_redirect = true;

		// Re-authorization bool
		// When no args are passed, we consider this a re-auth
		var reauth = (token === undefined);

		if (reauth) {
			if (!_this.active) {
				return gratify.error('client was never authorized; must call authorize() with arguments on first time', 'Main::authorize');
			}

			token = _this.token;

			// Fetch new session id from endpoint
			if (gratify.config.auth_proto != 'cookie') {
				_this.registerEpSession(true);
			}
		}

		// Pre-flight validation
		if (!token) {
			return gratify.error('token cannot be empty', 'Main::authorize');
		}

		gratify.request('post ' + gratify.auth_endpoint + '/get-token', params, function(r) {
			if (r.errno) {
				// Could not re-auth, clean up bindings
				if (reauth) {
					_this.active = false;
					_this.token = '';
				}

				return gratify.error(r.error, 'Main::authorize');
			}

			// Auth success
			_this.token = r.payload.access_token;
			_this.active = true;
			_this.user_info = JSON.parse(atob(r.payload.id_token));
			_this.say('authorization success: ' + _this.token);
		}, after);
	};

	/**
	 * Get and register session id from auth server.
	 * Mostly helpful for non-cookie auth types.
	 */
	this.registerId = function(block) {
		var rqstring = 'get ' + gratify.auth_endpoint + '/my-id';

		if (Boolean(block)) {
			rqstring += ' --block';
		}

		gratify.web.request(rqstring, {}, function(r) {
			if (r.errno) {
				return gratify.error("could not register session id: " + r.error, "Main::registerId");
			}

			if (typeof r.payload.id !== 'string') {
				return gratify.error("could not register session id: bad id returned", "Main::registerId");
			}

			_this.token = r.payload.id;
			sessionStorage.gratify_token = _this.token;
			gratify.say("session id registered: " + _this.token);
		});
	};

	(function() {
		// Register endpoint session
		if (gratify.config.auth_proto != 'cookie') {
			if (typeof sessionStorage.gratify_token === 'string') {
				_this.token = sessionStorage.gratify_token;
			}

			_this.registerId(true);
		}
	})();
}
