function GratifyComponent(properties) {
	var _this = this;

	asert(properties, 'object');

	// Validate and properties
	for (var i in properties) {
		var property = properties[i];

		switch (i) {
			case '$create':
			case '$destroy':
			case '$draw':
			case '$update':
				asert(property, 'function');
				break;
			case '$spawn':
			case '$ready':
			case '$rendered':
			case '$options':
				throw 'user cannot define ' + i;
		}

		_this[i] = property;
	}

	// Default required properties
	if (!this.hasOwnProperty('$create')) {
		this.$create = function() {};
	}
	if (!this.hasOwnProperty('$destroy')) {
		this.$destroy = function() {};
	}
	this.$spawn = function(template, options) {
		asert(template, 'object');
		options = typeof options === 'object' ? options : {};
		return gratify.spawn(template, Object.assign(options, { parent: this }));
	};
	this.$ready = function(callback) {
		asert(callback, 'function');
		gratify.waitFor('#' + this.$id, callback);
	};
	this.$rendered = function() {
		return Boolean($('#' + this.$id).length);
	};

	// The component manager will run $create()
	// at this point.
}

