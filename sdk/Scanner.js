/**
 * Scans the DOM for special tags. Discovered elements
 * will be subject to scripted events.
 */
function GratifyScanner() {
	var _this = this;
	this.absorb_rate = 0.2;
	this.tick_rate = 0.25;
	this.reauth_wait = 0.25;
	this.reauth_count = 0;
	this.reauth_max = 3;
	this.max_elements_size = 1024; // max size of elements before starting gc
	this.elements = [];
	this.index_registry = {};
	this.tags = [
		'gratify-var',
		'gratify-def',
		'gratify-goto',
		'gratify-plugin'
	];

	gratify.thread.start(function() {
		// Look for and add new elements
		for (var i in _this.tags) {
			var tag = _this.tags[i];
			var $elems = $(gratify.app.root).find('[' + tag + ']');

			/* jshint ignore:start */
			$elems.each(function(x, e) {
				// Check for existing elements
				for (var u in _this.elements) {
					if (e === _this.elements[u].element) {
						return;
					}
				}

				var e_index = _this.elements.push({ element: e }) - 1;
				gratify.say("scanner: new " + tag + " @ " + e.tagName + '-' + e_index);

				if (e_index > _this.max_elements_size) {
					gratify.say("scanner: elements size exceeded " + _this.max_elements_size + ".. garbage collecting empty indexes");
					_this.elements = _this.elements.filter(elm => elm);
					gratify.say("scanner: post-gc size = " + _this.elements.length);
				}
			});
			/* jshint ignore:end */
		}
	}, 'gratify-scanner-absorb-dom', this.absorb_rate);

	gratify.thread.start(function() {
		for (var i in _this.elements) {
			var checkme = gratify.app.root;

			if (gratify.app.browser == 'ie' && checkme == document) {
				checkme = document.body;
			}

			// Drop deleted elements
			if (!checkme.contains(_this.elements[i].element)) {
				gratify.say("scanner: garbage collecting " + _this.elements[i].element.tagName + '-' + i);

				if (_this.elements[i].plugin_ref) {
					gratify.drop(_this.elements[i].plugin_ref);
				}

				gratify.datasource.unsubscribe(_this.elements[i].plugin_ref);

				delete(_this.elements[i]);
				continue;
			}

			var $e = $(_this.elements[i].element);

			// Dictionary event
			var term = $e.attr('gratify-var') || $e.attr('gratify-def');
			if (term) {
				var data = gratify.def(term);
				if ($e.html() != data) {
					gratify.say('poulating def ' + term);
					$e.html(data);
				}
			}

			// Navigation events
			var nav = $e.attr('gratify-goto');
			if (nav) {
				if (!$e.prop('gratify-goto-active')) {
					/* jshint ignore:start */
					$e.prop('gratify-goto-active', true).on('click', function() {
						gratify.goto($(this).attr('gratify-goto'));
					});
					/* jshint ignore:end */
				}
			}

			var plugin = $e.attr('gratify-plugin');
			if (plugin) {
				// Debug mode styling
				if (gratify.debug_active) {
					if (!$e.hasClass('gratify-debug')) {
						$e.addClass('gratify-debug');
					}
				}

				if (!$e.prop('gratify-plugin-loaded')) {
					plugin = plugin.replace(/[\r\n]+/g, " ");
					plugin = plugin.replace(/^\s+/, "");
					plugin = plugin.replace(/\s+$/, "");
					var matches = plugin.match(/^([a-z\d-]+)\.([a-z\d-]+)(\((.*)\))?$/i);

					if (!matches) {
						$e.prop('gratify-plugin-loaded', true);
						return gratify.error('invalid gratify plugin: ' + plugin);
					}

					if (String($e.attr('gratify-wait-for-auth')) === 'true') {
						if (!gratify.auth.active) {
							continue; // try again next time
						}
					}

					gratify.say('scanner: loading plugin @ ' + $e.prop('tagName') + '-' + i);

					var seed = 0;
					var namespace = matches[1];
					var plgName = matches[2];
					var params = matches[4];

					if (params) {
						try {
							params = params.replace(/'+/g, "\"");
							params = JSON.parse(params);
						} catch (ex) {
							gratify.error("could not parse plugin parameters: " + ex.message + params);
						}
					}

					if (typeof params !== 'object') {
						params = {};
					}

					params.namespace = namespace;
					params.plugin = plgName;
					params.json = 1;

					/* jshint ignore:start */
					seed = gratify.request('get ' + gratify.system_endpoint + '/plugin --cache --version', params, function(r, s) {
						var e_index = _this.index_registry[s];
						var $dest = $(_this.elements[e_index].element);

						// Access denied, let's try and re-authorize
						// todo double check this errno
						if (r.errno == 3) {
							if (gratify.auth.active && _this.reauth_count < _this.reauth_max) {
								_this.reauth_count++;
								gratify.say("session expired.. re-authorizing");
								gratify.auth.authorize();

								// Mark plugin for re-load
								setTimeout(function() {
									$dest.prop('gratify-plugin-loaded', false);
								}, _this.reauth_wait);

								return;
							}
						} else {
							_this.reauth_count = 0;
						}

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
							var plugin_class = (namespace + '-' + meta.plugin_name);
							var plugin_str = namespace + '.' + meta.plugin_name;
							var subscribers = meta.subscribers;

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

									if (typeof gratify.components[namespace][component_name] !== 'object') {
										$(head).append('<script>' + js + '</script>');
									}

									var component = gratify.components[namespace][component_name];

									if (typeof component !== 'object') {
										throw { message: "component js missing object definition '" + namespace + '.' + component_name + "'" };
									}

									component.$id = component_name;
									component.$pluginstr = plugin_str;
									var obj = gratify.spawn(component, {}, true);

									if (obj) {
										obj.$container = $dest.find('.' + plugin_class);
									}

									obj.$create(params);
									_this.elements[e_index].plugin_ref = obj.$id;

									// Subscribe to datasources
									for (var s in subscribers) {
										var meta = subscribers[s];
										gratify.datasource.subscribe({
											id: s,
											url: meta.url,
											interval: meta.interval || '',
											bind: meta.bind,
											component_id: obj.$id
										});
									}
								}
							}
						} catch (ex) {
							gratify.error('error loading plugin: ' + ex.message, ex);
						}
					});

					_this.index_registry[seed] = i;
					$e.prop('gratify-plugin-loaded', true);
					/* jshint ignore:end */
				}
			}
		}
	}, 'gratify-scanner-event-handler', this.tick_rate);
}

