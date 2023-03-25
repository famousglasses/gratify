function GratifyDictionary() {
	var _this = this;
	this.definitions = {};

	/**
	 * Lookup a definition.
	 */
	this.lookup = function(name) {
		var parts;
		try {
			assert(name, 'string');
			parts = _this.explode(name);
		} catch (ex) {
			return gratify.error(ex.message, 'Dictionary::lookup');
		}

		// Search for value
		var val = null;
		for (var i in parts) {
			var part = parts[i];

			if (val === null) {
				// No definition, return empty string
				if (typeof _this.definitions[part] === 'undefined') {
					return '';
				}

				// Assign value as clone
				val = JSON.parse(JSON.stringify(_this.definitions[part]));
			}
			else {
				val = val[part];
			}

			// Found scalar value, stop recursing
			if (typeof val !== 'object') {
				break;
			}

			// Found undefined value, stop recursing
			// Return empty string
			if (typeof val === 'undefined') {
				return '';
			}
		}

		return val;
	};

	/**
	 * Update definition.
	 */
	this.define = function(name, value) {
		var parts;
		try {
			assert(name, 'string');
			assert(value, ['string', 'object', 'number']);
			parts = _this.explode(name);
		} catch (ex) {
			return gratify.error(ex.message, 'Dictionary::define');
		}

		// Search for value
		var pnt = _this.definitions;
		var changed = true;
		for (var i in parts) {
			var part = parts[i];

			// This is the last part, lets set it and get out
			if (i == parts.length - 1) {
				// Convert arrays to objects
				if (Array.isArray(value)) {
					value = Object.assign({}, value);
				}

				// Is value already the same?
				if (JSON.stringify(pnt[part]) === JSON.stringify(value)) {
					changed = false;
					break;
				}

				pnt[part] = value;
				break;
			}
			
			// Found nested object, reassign pointer
			if (typeof pnt[part] === 'object') {
				pnt = pnt[part];
				continue;
			}

			// Found scalar or unassigned value in def tree
			// Build new object
			else {
				pnt[part] = {};
				pnt = pnt[part];
				continue;
			}
		}

		// Queue component updates
		if (changed) {
			gratify.say('definition of ' + name + ' updated');

			for (var x = parts.length - 1; x >= 0; x--) {
				for (var c in gratify.cmanager.components) {
					var component = gratify.cmanager.components[c];
					if ($.inArray(name, component.$udefs) !== -1) {
						gratify.cmanager.queue(component.$id, name, gratify.def(name));
					}
				}

				name = name.replace(new RegExp('\\.' + parts[x] + '$'), '');
			}
		}
	};

	/**
	 * Explode a definition name into parts.
	 */
	this.explode = function(name) {
		name = String(name);

		if (!name.match(/^[a-z\d_\-\.]+$/i) || name.indexOf('..') !== -1) {
			throw new TypeError("invalid definition name; only letters, numbers, dashes, and underscores are allowed");
		}

		return name.split('.');
	};
}
