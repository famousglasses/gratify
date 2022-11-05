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
