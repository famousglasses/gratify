/**
 * Scans the DOM for special tags. Discovered elements
 * will be subject to scripted events.
 */
function GratifyScanner() {
	var _this = this;

	this.elements = [];
	this.tags = [
		'gfy-var',
		'gfy-goto',
		'gfy-plugin'
	];

	gratify.thread.start(function() {
		// Look for and add new elements
		for (var i in _this.tags) {
			var tag = _this.tags[i];
			var $elems = $('[' + tag + ']');

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
			var checkme = gratify.app.namespace;
			if (gratify.client.browser == 'ie' && checkme == document) {
				checkme = document.body;
			}

			if (!checkme.contains(_this.elements[x])) {
				_this.elements.splice(x, 1);
			}
		}
	}, 'gratify-scanner-absorb-dom', 0.2);

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
						return console.error('invalid gratify plugin: ' + plugin);
					}

					if (String($e.attr('gfy-wait-for-auth')) === 'true') {
						if (!gratify.authbound) {
							return; // try again next time
						}
					}

					var namespace = matches[1];
					var plgName = matches[2];
					var params = matches[4];

					if (params) {
						try {
							params = JSON.parse(params);
						} catch (ex) {
							console.error("could not parse plugin parameters: " + ex.message);
						}
					}

					if (typeof params !== 'object') {
						params = {};
					}

					params.namespace = namespace;
					params.plugin = plgName;
					params.json = 1;

					/* jshint ignore:start */
					gratify.request('get ' + gratify.endpoint + '/plugin', params, function(r) {
						if (r.errno) {
							return console.error(r.error);
						}

						try {
							var appspace = gratify.app.namespace;
							var html = r.payload.html;
							var css = r.payload.css;
							var meta = r.payload.meta;
							var namespace = meta.namespace;
							var component_name = meta.component_name;
							var plugin_class = meta.plugin_name;
							var js = r.payload.js;

							if (html) {
								$e.html(html);
							}

							if (css) {
								$(appspace).find('head').append('<style>' + css + '</style>');
							}

							if (js) {
								if (typeof gratify.components[namespace] !== 'object') {
									gratify.components[namespace] = {};
								}

								$(appspace).find('head').append('<script>' + js + '</script>');

								var component = gratify.components[namespace][component_name];

								if (typeof component !== 'object') {
									throw { message: "component js missing object definition '" + namespace + '.' + component_name + "'" };
								}

								component.$id = component_name;
								var obj = gratify.spawn(component);

								if (obj) {
									obj.$container = $e.find('.' + plugin_class);
								}
							}
						} catch (ex) {
							console.error('error loading plugin: ' + ex.message, ex);
						}
					});

					$e.prop('gfy-plugin-loaded', true);
					/* jshint ignore:end */
				}
			}
		}
	}, 'gratify-scanner-event-handler', 0.2);
}

