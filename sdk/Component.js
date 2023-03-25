function GratifyComponent(properties) {
	var _this = this;

	assert(properties, 'object');

	// Validate and properties
	for (var i in properties) {
		var property = properties[i];

		switch (i) {
			case '$create':
			case '$destroy':
			case '$draw':
			case '$update':
				assert(property, 'function');
				break;
			case '$spawn':
			case '$ready':
			case '$rendered':
			case '$options':
			case '$reload':
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
		assert(template, 'object');
		options = typeof options === 'object' ? options : {};
		return gratify.spawn(template, Object.assign(options, { parent: this }));
	};
	this.$ready = function(callback) {
		assert(callback, 'function');
		gratify.waitFor('#' + this.$id, callback);
	};
	this.$rendered = function() {
		return Boolean($('#' + this.$id).length);
	};
	this.$reload = function() {
		gratify.plugin(this.$container.parent(), this.$pluginstr, this.$options, 'reload');
	};

	// The component manager will run $create()
	// at this point.
}

