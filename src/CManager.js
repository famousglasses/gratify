function GratifyCManager() {
	var _this = this;
	this.components = {};
	this.updateQueue = [];

	/**
	 * Spawn a new component.
	 */
	this.spawn = function(template, options) {
		var id, htdoc, htargs, target, parent;
		try {
			asert(template, 'object');
			asert(template.$id, 'string');
			options = typeof options === 'object' ? options : {};
			id = typeof options.id === 'string' ? options.id : template.$id;
			htdoc = typeof template.$htdoc === 'string' ? template.$htdoc : null;
			htargs = typeof template.$htargs === 'object' ? template.$htargs : {};
			target = typeof template.$target === 'string' ? template.$target : null;
			parent = typeof options.parent === 'object' ? options.parent : null;
			asert(options.target, ['undefined', 'object', 'string']);
			target = options.target || target;
		} catch (ex) {
			return gratify.error(ex.message, 'CManager::spawn');
		}

		if (typeof _this.components[id] !== 'undefined') {
			var x = id.match(/-\d+$/) ? parseInt(id.match(/\d+$/)[0]) : 0;
			var new_id;

			do {
				x++;
				new_id = id.replace(/-\d+$/, '') + '-' + x;
			} while (typeof _this.components[new_id] !== 'undefined');

			id = new_id;
		}

		try {
			gratify.say('spawning new component <' + id + '>');
			var component = new GratifyComponent(template);
			component.$id = id;
			_this.components[id] = component;

			if (htdoc) {
				var before = Boolean(htdoc.indexOf('--before') !== -1);

				gratify.request('get ' + htdoc, htargs, function(r) {
					component.$container = $(r);
					component.$container.attr('id', id);
					component.$stems = [];

					var stems = component.$container.find('.-dev-stem').toArray();
					if (stems.length) {
						stems.reverse();
						for (var s = 0; s < stems.length; s++) {
							stems[s].classList.remove('-dev-stem');
							component.$stems.push(stems[s]);
							if (stems[s].parentNode) {
								stems[s].parentNode.removeChild(stems[s]);
							}
						}
					}

					if (component.$container.is('.-dev-stem')) {
						component.$container.removeAttr('id');
						component.$container.removeClass('-dev-stem');
						component.$stems.push(component.$container[0]);
						component.$container = null;
					}

					component.$stems.reverse();

					if (parent) {
						component.$parent = parent;
					}

					if (target) {
						if (!component.$target) {
							component.$target = target;
						}

						if (component.$container) {
							component.$container.find('.-dev-stem').remove();
							if (before) {
								component.$container.prependTo(target);
							} else {
								component.$container.appendTo(target);
							}
						}
					}

					component.$create(options);
				});
			} else {
				component.$create(options);
			}
		} catch (ex) {
			return gratify.error(ex.message, 'CManager::spawn');
		}

		gratify.say('new component ready <' + id + '>');

		return _this.components[id];
	};

	/**
	 * Drop a component.
	 */
	this.drop = function(id) {
		if (typeof id === 'object') {
			if (typeof id.$id === 'string') {
				id = id.$id;
			}
		}

		if (typeof _this.components[id] === 'object') {
			_this.components[id].$destroy();
			delete _this.components[id];

			gratify.say('dropped component <' + id + '>');

			return true;
		}

		return false;
	};

	/**
	 * Get a component object by id.
	 */
	this.get = function(id) {
		return _this.components[id];
	};

	/**
	 * Queue a component for updates.
	 */
	this.queue = function(id) {
		if ($.inArray(id, _this.updateQueue) === -1) {
			_this.updateQueue.push(id);
			gratify.say('component ' + id + ' queued for update');
		}
	};

	(function() {
		gratify.thread.start(function() {
			for (var i in _this.updateQueue) {
				var cid = _this.updateQueue[i];
				var component = gratify.get(cid);

				
				if (component) {
					component.$update();
					gratify.say('component ' + component.$id + ' updated');
				}

				delete _this.updateQueue[i];
			}
		}, 'cmanager.queue', 0.2);
	})();
}
