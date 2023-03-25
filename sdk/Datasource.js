function GratifyDatasource() {
	var _this = this;
	this.subscribers = {};
	this.threads = {};

	this.subscribe = function(meta) {
		try {
			assert(meta, ['object']);
			assert(meta.id, ['string']);
			assert(meta.bind, ['string']);
			assert(meta.interval, ['undefined', 'string']);
			assert(meta.url, ['string']);
			assert(meta.component_id, ['string', 'undefined']);
		} catch (ex) {
			return gratify.error(ex.message, 'Datasource::subscribe');
		}

		var id = meta.id;
		var bind = meta.bind;
		var interval = meta.interval || '';
		var url = meta.url;
		var component_id = meta.component_id || '';

		if (!component_id) {
			gratify.say('warning: headless datasource subscriber: ' + JSON.stringify(meta));
			component_id = 'GLOBAL';
		}

		var dss = function() {
			gratify.request('get ' + url, {}, function(r) {
				if (r.errno) {
					return gratify.error('datasource subscriber response error: ' + r.error);
				}

				_this.loadDss(id, r.payload);
			});
		};

		if (interval) {
			var int_matches = interval.match(/^([0-9]+)([sm])$/);

			if (!int_matches) {
				return gratify.error('invalid interval value', 'Datasource::subscribe');
			}

			var seconds = Number(int_matches[1]);

			if (int_matches[2] == 'm') {
				seconds = seconds * 60;
			}

			var start_thread = false;

			if (typeof _this.subscribers[id] !== 'object') {
				start_thread = true;
				_this.subscribers[id] = {
					thread_id: 0,
					components: []
				};
			}

			this.subscribers[id].components.push({
				id: component_id,
				bind: bind
			});

			if (start_thread) {
				var thread_id = gratify.thread.start(dss, null, seconds);
				_this.subscribers[id].thread_id = thread_id;
			}
		} else {
			dss();
		}
	};

	this.unsubscribe = function(mixed_id) {
		if (!mixed_id) {
			return gratify.error('invalid subscription id', 'Datasource::unsubscribe');
		}

		gratify.say("unsubscribing '" + mixed_id + "'");

		// Stop all threads
		for (var ds_id in _this.subscribers) {
			var subscriber = _this.subscribers[ds_id];
			var components = subscriber.components;
			var thread_id = subscriber.thread_id;
			var ds_match = false;

			if (ds_id === mixed_id) {
				ds_match = true;
			}

			var component_count = components.length;

			for (var c in components) {
				var component = components[c];
				var component_id = component.id;
				var sub_match = ds_match || (component_id === mixed_id);

				if (sub_match) {
					if (ds_match || component_count <= 1) {
						gratify.thread.stop(thread_id);
					}

					delete _this.subscribers[ds_id].components[c];
				}
			}

			_this.subscribers[ds_id].components = _this.subscribers[ds_id].components.filter(Boolean);
			component_count = _this.subscribers[ds_id].components.length;

			if (ds_match || component_count <= 0) {
				delete _this.subscribers[ds_id];
			}
		}
	};

	this.loadDss = function(id, payload) {
		for (var ds_id in this.subscribers) {
			if (id === ds_id) {
				var components = this.subscribers[ds_id].components;

				for (var c in components) {
					var component = components[c];
					var bind = component.bind;
					gratify.def(bind, payload);
				}
			}
		}
	};
}
