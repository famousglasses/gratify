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
			assert(routes, 'object');
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
			assert(route, 'string');
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
