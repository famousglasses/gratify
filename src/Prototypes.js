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


