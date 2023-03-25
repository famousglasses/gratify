<?php

namespace Gratify;
use \Exception;
use \ReflectionClass;

class System {
	const VERSION = '2.0.0';
	const SOURCE_GRATIFY = 'https://github.com/famousglasses/gratify.git';

	public function __construct() {
		$app = getApp();
		$app->setTemplate(null);
	}

	/**
	 * Update gratify libraries to latest versions.
	 */
	public function update(App $app, array $request) {
		if (!_CLI) {
			throw new StdException('access denied');
		}

		$shell = $app->getShell();

		if (!file_exists(_ROOT . '/.gratify')) {
			throw new StdException('gratify not found');
		}

		$a = $shell->prompt('You are about to update Gratify. Are you sure? [y/n]: ');

		if (strtolower($a) === 'y') {
			if (!$shell->cd(_ROOT)) {
				throw new StdException('could not cd into gratify root');
			}

			$shell->out("Setting temp dir: ", false);
			$t = '/tmp/gratify-update-' . substr(md5((string)time()), 0, 6);
			$shell->out($t);

			$shell->out("Setting package source: ", false);
			$s = self::SOURCE_GRATIFY;
			$shell->out($s);

			$shell->out("Removing temp dir: ", false);
			$x = $shell->exec("rm -rf $t");
			$shell->out($x ? $x : '-');

			$shell->out("Cloning gratify master: ", false);
			$x = $shell->exec("git clone $s $t");
			$shell->out($x ? $x : '-');

			$shell->out("Copying files: ", false);
			$x = $shell->exec("cp -rf $t/lib/ $t/src/ $t/.gratify $t/.env.example ./");
			$x = $shell->exec("cp -i $t/composer.json $t/README.md ./", true);
			$shell->out($x ? $x : '-');

			$shell->out('Done.');
		}
	}

	public function plugin(App $app, array $request) {
		if (@$request['json']) {
			$app->setTemplate('json.php');
		} else {
			$app->setTemplate('plugin.php');
		}

		$namespace = $request['namespace'] ?? '';

		if (!$namespace || !preg_match('/^[a-z][a-z\d-]+$/i', $namespace)) {
			throw new StdException("invalid namespace");
		}

		$plugin = $request['plugin'] ?? '';

		if (!$plugin || !preg_match('/^[a-z][a-z\d-]+$/i', $plugin)) {
			throw new StdException("invalid plugin name");
		}

		// Find plugin
		$dir = _PLUGINS . "/{$namespace}/{$plugin}";
		if (!is_dir($dir)) {
			throw new StdException("plugin not found '{$namespace}.{$plugin}'");
		}

		$path = $dir . '/manifest.json';
		if (!file_exists($path)) {
			throw new StdException("plugin manifest is missing");
		}

		$manifest = json_decode(file_get_contents($path), true);

		if (!$manifest) {
			throw new StdException("plugin manifest invalid");
		}

		$datasources = $manifest['datasources'] ?? [];
		$subscribers = [];

		// Review and encirch datasources
		foreach ($datasources as $i => &$meta) {
			if (!is_array($meta)) {
				throw new StdException('datasource config error in manifest.json');
			}

			if (is_array(@$meta['filters'])) {
				$meta['filters'] = $this->enrichFilters($app, $meta['filters']);
			}

			if (is_array(@$meta['triggers'])) {
				$meta['triggers'] = $this->enrichTriggers($app, $meta['triggers']);
			}
		}

		unset($meta);
		$ttl = $manifest['ttl'] ?? 0;

		if ($ttl) {
			if (!preg_match('/^(\d+) (second|minute|hour|day)s?$/i', $ttl, $matches)) {
				throw new StdException("invalid TTL defined '{$ttl}'");
			}

			$ttlNum = (int)$matches[1];
			$ttlFactor = $matches[2];
			$ttl = 0; // in seconds always

			if ($ttlNum <= 0) {
				throw new StdException("cannot define null TTL");
			}

			switch ($ttlFactor) {
				case 'second':
					$ttl = $ttlNum;
					break;
				case 'minute':
					$ttl = $ttlNum * 60;
					break;
				case 'hour':
					$ttl = $ttlNum * 60 * 60;
					break;
				case 'day':
					$ttl = $ttlNum * 60 * 60 * 24;
					break;
			}

			header("Cache-Control: private, max-age={$ttl}");
		} else {
			header("Cache-Control: no-cache");
			header('Expires: on, 01 Jan 1970 00:00:00 GMT');
			header('Last-Modified: ' . gmdate('D, d M Y H:i:s') . ' GMT');
			header('Cache-Control: no-store, no-cache, must-revalidate');
			header('Cache-Control: post-check=0, pre-check=0', false);
			header('Pragma: no-cache');
		}

		// Setup return array
		$ret = [
			'html' => '',
			'css' => '',
			'js' => ''
		];

		$template = $dir . '/template.twig';

		if (file_exists($template)) {
			// This will be used to fill our twig template
			$template_array = [
				'component' => "gratify.get('{$plugin}')",
				'base_uri' => getenv('BASE_URI'),
				'img_url' => Util::url('/public/img')
			];

			// Fetch datasources
			foreach ($datasources as $i => $meta) {
				$bind = $meta['bind'];
				$template_array[$bind] = [];
				$ds_name = $meta['name'] ?? null;
				$filters = $meta['filters'] ?? [];
				$triggers = $meta['triggers'] ?? [];
				$subscriber = $meta['subscriber'] ?? [];

				if (!$ds_name) {
					throw new StdException("invalid datasource config: missing name");
				}

				if (!preg_match('/^[a-z][a-z\d]+\/[a-z][a-z\d]+$/i', $ds_name)) {
					throw new StdException("invalid datasource config: invalid name");
				}

				$parts = explode('/', $ds_name);
				$class = $parts[0];
				$nsclass = "App\Datasources\\{$class}";
				$func = $parts[1];

				try {
					$rc = new ReflectionClass($nsclass);
					$method = $rc->getMethod($func);
				} catch (Exception $e) {
					throw new StdException("unknown datasource '{$class}/{$func}'");
				}

				if (!empty($subscriber)) {
					$bind = $subscriber['bind'] ?? '';
					$interval = $subscriber['interval'] ?? '';

					if (!preg_match('/^[a-z\d\._]+$/i', $bind)) {
						throw new StdException("invalid subscriber binding");
					}

					if (!empty($interval)) {
						if (!preg_match('/^(\d+)([sm])$/i', (string)$interval)) {
							throw new StdException("invalid subscriber interval");
						}
					}

					$url_params = [
						'name' => $ds_name
					];

					if (!empty($filters)) {
						$url_params['filters'] = $filters;
					}

					if (!empty($triggers)) {
						$_triggers = [];

						foreach ($triggers as $key => $value) {
							$_triggers[] = $key;
						}

						$url_params['triggers'] = implode(',', $_triggers);
					}

					$subscriber_key = md5(print_r($url_params, true));
					$subscriber_url = Util::url('/sys/datasource', $url_params);
					$subscriber['url'] = $subscriber_url;
					$subscribers[$subscriber_key] = $subscriber;
				} else {
					try {
						$obj = new $nsclass($app);
						$data = $obj->{$func}($app, $filters, $triggers);
					} catch (Exception $e) {
						throw new StdException("datasource error: {$e->getMessage()}");
					}

					$template_array[$bind] = $data;
				}
			}

			$loader = new \Twig\Loader\FilesystemLoader($dir);
			$twig = new \Twig\Environment($loader, [
				'cache' => false,
				'debug' => (bool)(int)$_ENV['DEV_MODE']
			]);
			$twig->addExtension(new \Twig\Extension\DebugExtension());
			$ret['html'] = $twig->render('template.twig', $template_array);
		}

		$js = $dir . '/component.js';

		if (file_exists($js)) {
			$ret['js'] = file_get_contents($js);
		}

		$css = $dir . '/style.css';

		if (file_exists($css)) {
			$ret['css'] = file_get_contents($css);
		}

		$ret['meta'] = [
			'cached' => false,
			'ttl' => $ttl,
			'namespace' => $namespace,
			'component_name' => $plugin,
			'subscribers' => $subscribers,
			'plugin_name' => $plugin,
			'plugin_uri' => "https://{$_SERVER['HTTP_HOST']}{$_ENV['BASE_URI']}{$_ENV['SYSTEM_SERVICE']}/plugin?namespace={$namespace}&plugin={$plugin}"
		];

		if ($ttl && @$ckey) {
			$cache->set($ckey, $ret, $ttl);
		}

		return $ret;
	}

	public function datasource(App $app, array $request) {
		$app->setTemplate('json.php');

		$name = $request['name'] ?? '';
		$filters = $request['filters'] ?? [];
		$triggers = $request['triggers'] ?? [];

		if (empty($name)) {
			throw new StdException("invalid datasource name");
		}

		$dspattern = '/^([a-z\d_]+)\/([a-z\d_]+)$/i';

		if (!preg_match($dspattern, $name, $matches)) {
			throw new StdException("invalid datasource name");
		}

		$class = $matches[1];
		$func = $matches[2];

		if (!empty($filters)) {
			// Temp array
			$_filters = [];

			if (!is_array($filters)) {
				throw new StdException('invalid filters');
			}

			foreach ($filters as $key => $value) {
				$_filters[] = [
					'name' => $key,
					'value' => (string)$value
				];
			}

			// Enrich and reassign filters
			$filters = $this->enrichFilters($app, $_filters);
		}

		if (!empty($triggers)) {
			// Temp array
			$_triggers = [];

			if (is_array($triggers)) {
				foreach ($triggers as $key => $value) {
					$_triggers[] = [
						'name' => $key
					];
				}
			} elseif (is_string($triggers)) {
				$triggers = explode(',', $triggers);

				foreach ($triggers as $key => $value) {
					$_triggers[] = [
						'name' => $value
					];
				}
			} else {
				throw new StdException('invalid triggers');
			}

			// Enrich and reassign triggers
			$triggers = $this->enrichTriggers($app, $_triggers);
		}

		// Check if exists
		$file = _DATASOURCES . "/{$class}.php";
		if (!is_file($file)) {
			throw new StdException("datasource not found '{$class}/{$func}'");
		}

		try {
			$nsclass = "App\\Datasources\\{$class}";
			$rc = new ReflectionClass($nsclass);
			$method = $rc->getMethod($func);
		} catch (Exception $e) {
			throw new StdException("datasource not found '{$class}/{$func}'");
		}

		try {
			$obj = new $nsclass($app);
			$data = $obj->{$func}($app, $filters, $triggers);
		} catch (Exception $e) {
			throw new StdException("datasource error: {$e->getMessage()}");
		}

		return $data;
	}

	private function enrichFilters(App $app, array $filters) {
		$rich_filters = [];

		foreach ($filters as $i => $meta) {
			$name = $meta['name'];
			$nests = [];
			$value = $meta['value'];

			if (preg_match('/^\$/', $value, $matches)) {
				$ref = substr($value, 1);

				// Using nested (dot) notation
				if (strpos($ref, '.') !== false) {
					$parts = explode('.', $ref);
					$ref = array_shift($parts);

					foreach ($parts as $part) {
						$part = trim($part);

						if (empty($part)) {
							continue;
						}

						$nests[] = $part;
					}
				}

				$x = $_REQUEST[$ref] ?? null;

				if (count($nests)) {
					foreach ($nests as $nest) {
						if (is_array($x)) {
							$x = $x[$nest] ?? null;
						}
					}
				}
			} else {
				$x = $value;
			}

			$req = (bool)($meta['required'] ?? false);

			if ($req) {
				if (empty($x)) {
					throw new StdException("required datasource filter is missing: {$meta['name']}");
				}
			}

			if ($x !== null) {
				$rich_filters[$name] = $x;
			}
		}

		return $rich_filters;
	}

	private function enrichTriggers(App $app, array $triggers) {
		$rich_triggers = [];

		foreach ($triggers as $i => $meta) {
			$nests = [];
			$ref = $meta['name'];

			// Using nested (dot) notation
			if (strpos($ref, '.') !== false) {
				$parts = explode('.', $ref);
				$ref = array_shift($parts);

				foreach ($parts as $part) {
					$part = trim($part);

					if (empty($part)) {
						continue;
					}

					$nests[] = $part;
				}
			}

			$session = $app->getSession();
			$x = $session->get($ref) ?? null;

			if (count($nests)) {
				foreach ($nests as $nest) {
					if (is_array($x)) {
						$x = $x[$nest] ?? null;
					}
				}
			}

			$req = (bool)($meta['required'] ?? false);

			if ($req) {
				if (empty($x)) {
					throw new StdException("required datasource trigger is missing: {$ref}");
				}
			}

			if ($x !== null) {
				$rich_triggers[$ref] = $x;
			}
		}

		return $rich_triggers;
	}
}
