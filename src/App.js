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
