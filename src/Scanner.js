/**
 * Scans the DOM for special tags. Discovered elements
 * will be subject to scripted events.
 */
function GratifyScanner() {
	var _this = this;
	this.absorb_rate = 0.2;
	this.tick_rate = 0.25;
	this.elements = [];
	this.index_registry = {};
	this.tags = [
		'gfy-var',
		'gfy-goto',
		'gfy-plugin'
	];

	gratify.thread.start(function() {
		// Look for and add new elements
		for (var i in _this.tags) {
			var tag = _this.tags[i];
			var $elems = $(gratify.app.root).find('[' + tag + ']');

			/* jshint ignore:start */
			$elems.each(function(x, e) {
				if ($.inArray(e, _this.elements) === -1) {
					_this.elements.push(e);
				}
			});
			/* jshint ignore:end */
		}

		// Drop deleted elements
		for (var x in _this.elements) {
			var checkme = gratify.app.root;
			if (gratify.client.browser == 'ie' && checkme == document) {
				checkme = document.body;
			}

			if (!checkme.contains(_this.elements[x])) {
				_this.elements.splice(x, 1);
			}
		}
	}, 'gratify-scanner-absorb-dom', this.absorb_rate);

	gratify.thread.start(function() {
		for (var i in _this.elements) {
			var $e = $(_this.elements[i]);

			// Dictionary event
			var term = $e.attr('gfy-var');
			if (term) {
				var data = gratify.def(term);
				if ($e.html() != data) {
					$e.html(data);
				}
			}

			// Navigation events
			var nav = $e.attr('gfy-goto');
			if (nav) {
				if (!$e.prop('gfy-goto-active')) {
					/* jshint ignore:start */
					$e.prop('gfy-goto-active', true).on('click', function() {
						gratify.goto($(this).attr('gfy-goto'));
					});
					/* jshint ignore:end */
				}
			}

			var plugin = $e.attr('gfy-plugin');
			if (plugin) {
				if (!$e.prop('gfy-plugin-loaded')) {
					var matches = plugin.match(/^([a-z\d-]+)\.([a-z\d-]+)(\((.*)\))?$/);

					if (!matches) {
						$e.prop('gfy-plugin-loaded', true);
						return gratify.error('invalid gratify plugin: ' + plugin);
					}

					if (String($e.attr('gfy-wait-for-auth')) === 'true') {
						if (!gratify.authbound) {
							return; // try again next time
						}
					}

					var seed = 0;
					var namespace = matches[1];
					var plgName = matches[2];
					var params = matches[4];

					if (params) {
						try {
							params = JSON.parse(params);
						} catch (ex) {
							gratify.error("could not parse plugin parameters: " + ex.message);
						}
					}

					if (typeof params !== 'object') {
						params = {};
					}

					params.namespace = namespace;
					params.plugin = plgName;
					params.json = 1;

					/* jshint ignore:start */
					seed = gratify.request('get ' + gratify.endpoint + '/plugin --cache --version', params, function(r, s) {
						var $dest = $(_this.elements[_this.index_registry[s]]);

						if ($dest.length == 0) {
							return gratify.error('destination element has gone away (seed#' + s + ')');
						}

						delete(_this.index_registry[s]);

						if (typeof r !== 'object') {
							return gratify.error('invalid response from plugin endpoint: ' + String(r));
						}

						if (r.errno) {
							return gratify.error(r.error);
						}

						if (!r.payload) {
							return gratify.error('empty or invalid payload received: ' + String(r.payload));
						}

						try {
							var doc = document;
							var head = doc.head || null;

							if (!head) {
								gratify.say('warning: no document head; plugin js/css will be skipped');
							}

							var meta = r.payload.meta;
							var html = r.payload.html;
							var css = r.payload.css;
							var js = r.payload.js;

							if (!meta) {
								throw { message: 'no meta data received', code: 1 };
							}

							var namespace = meta.namespace;
							var component_name = meta.component_name;
							var plugin_class = namespace + '-' + meta.plugin_name;

							if (html) {
								$dest.html(html);
							}

							if (head) {
								if (css) {
									$(document).find('head').append('<style>' + css + '</style>');
								}

								if (js) {
									if (typeof gratify.components[namespace] !== 'object') {
										gratify.components[namespace] = {};
									}

									$(head).append('<script>' + js + '</script>');

									var component = gratify.components[namespace][component_name];

									if (typeof component !== 'object') {
										throw { message: "component js missing object definition '" + namespace + '.' + component_name + "'" };
									}

									component.$id = component_name;
									var obj = gratify.spawn(component, {}, true);

									if (obj) {
										obj.$container = $dest.find('.' + plugin_class);
									}

									obj.$create();
								}
							}
						} catch (ex) {
							gratify.error('error loading plugin: ' + ex.message, ex);
						}
					});

					_this.index_registry[seed] = i;
					$e.prop('gfy-plugin-loaded', true);
					/* jshint ignore:end */
				}
			}
		}
	}, 'gratify-scanner-event-handler', this.tick_rate);
}

