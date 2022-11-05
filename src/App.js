/**
 * 
 */
function GratifyApp() {
	var _this = this;
	this.params = {}; // parsed query params
	this.path = document.location.pathname;
	this.query = document.location.search;
	this.zoomlvl = 100;
	this.cursor_x = 0;
	this.cursor_y = 0;
	this.version_tag = ''; // used as a tag when retreiving web resources
	this.site_name = ''; // used in title generation
	this.namespace = document; // app namespace container

	/**
	 * Set the application's version tag.
	 */
	this.setVersionTag = function(tag) {
		tag = String(tag);
		if (!tag.match(/^[a-z\d]+$/)) {
			return gratify.error('invalid tag value', 'App::setHash');
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
	this.include = function(type, url, id) {
		try {
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
				resource.id = typeof id === 'string' ? id : undefined;
				resource.src = url.appendAppHash();
				break;
			case 'css':
				resource = document.createElement('link');
				resource.type = 'text/css';
				resource.rel = 'stylesheet';
				resource.id = typeof id === 'string' ? id : undefined;
				resource.href = url.appendAppHash();
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

	(function() {
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
				var bp = 'xs';
				if (width >= 1400) {
					bp = 'xxl';
				} else if (width >= 1200) {
					bp = 'xl';
				} else if (width >= 992) {
					bp = 'lg';
				} else if (width >= 768) {
					bp = 'md';
				} else if (width >= 576) {
					bp = 'sm';
				}
				_this.breakpoint = bp;
			} catch (ex) {
				_this.breakpoint = 'xs';
			}
		});

		_this.sense(true);
	})();
}
