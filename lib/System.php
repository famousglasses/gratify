<?php

namespace Gratify;
use \Exception;
use \ReflectionClass;

class System {
	const VERSION = '1.0.0';
	const SOURCE_GRATIFY = 'https://github.com/famousglasses/gratify.git';
	private $cache = false; // todo implement

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
			$app->setTemplate(null);
		} else {
			$app->setTemplate('plugin.php');
		}

		$namespace = @$request['namespace'];
		$plugin = @$request['plugin'];
		$component = str_replace(' ', '', ucwords(str_replace('-', ' ', $plugin)));

		if (!$namespace || !preg_match('/^[a-z][a-z\d-]+$/i', $namespace)) {
			throw new Exception("invalid namespace");
		}

		if (!$plugin || !preg_match('/^[a-z][a-z\d-]+$/i', $plugin)) {
			throw new Exception("invalid plugin name");
		}

		// Find plugin
		$dir = _PLUGINS . "/{$namespace}/{$plugin}";
		if (!is_dir($dir)) {
			throw new Exception("plugin not found '{$namespace}.{$plugin}'");
		}

		$path = $dir . '/manifest.json';
		if (!file_exists($path)) {
			throw new Exception("plugin manifest is missing");
		}

		$manifest = json_decode(file_get_contents($path), true);

		if (!$manifest) {
			throw new Exception("plugin manifest invalid");
		}

		$str = ''; // a basic string, used for cache key
		$ds = $manifest['data'] ?? [];

		// Review and encirch data sources
		foreach ($ds as $name => &$info) {
			$str .= $name;
			if (is_array(@$info['filters'])) {
				$info['filters'] = $this->enrichFilters($app, $info['filters']);
				foreach ($info['filters'] as $x => $y) {
					$str .= $x . $y; // concat for request hash
				}
			}
		}

		unset($info);
		$ttl = $manifest['ttl'] ?? 0;

		if ($this->cache && $ttl) {
			if (!preg_match('/^(\d+) (second|minute|hour|day)s?$/i', $ttl, $matches)) {
				throw new Exception("invalid TTL defined '{$ttl}'");
			}

			$ttlNum = (int)$matches[1];
			$ttlFactor = $matches[2];
			$ttl = 0; // in minutes always

			if ($ttlNum <= 0) {
				throw new Exception("cannot define null TTL");
			}

			switch ($ttlFactor) {
				case 'second':
					$ttl = $ttlNum / 60;
					break;
				case 'minute':
					$ttl = $ttlNum;
					break;
				case 'hour':
					$ttl = $ttlNum * 60;
					break;
				case 'day':
					$ttl = $ttlNum * 60 * 24;
					break;
			}

			$session = $app->getSession();
			$domain = ''; // client session (only for personal data) todo
			$ckey = ''; // cache key
			$cache = $app->getCache();

			if (!$cache->open()) {
				throw new Exception("cache error: {$cache->last_error}");
			}

			$ckey = md5($namespace . $plugin . $str);
			$cval = $cache->get($ckey);

			if (!empty($cval)) {
				if (is_array($cval['meta'])) {
					$cval['meta']['cached'] = true;
				}
				return $cval;
			}
		}

		if (!is_array($ds)) {
			throw new Exception("invalid data sources defined");
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
			$template_array = ['component' => "gratify.get('{$component}')"];

			// Fetch data sources
			foreach ($ds as $name => $info) {
				$template_array[$name] = [];
				$source = $info['source'] ?? null;
				$filters = $info['filters'] ?? [];

				if (!$source) {
					throw new Exception("invalid data source config");
				}

				if (!preg_match('/^[a-z][a-z\d]+\/[a-z][a-z\d]+$/i', $source)) {
					throw new Exception("invalid data source '{$source}'");
				}

				$parts = explode('/', $source);
				$class = "App\Datasources\\{$parts[0]}";
				$func = $parts[1];

				try {
					$rc = new ReflectionClass($class);
					$method = $rc->getMethod($func);
				} catch (Exception $e) {
					throw new Exception("unknown data source '{$class}/{$func}'");
				}

				try {
					$obj = new $class($app);
					$data = $obj->{$func}($app, $filters);
				} catch (Exception $e) {
					throw new Exception("data source error: {$e->getMessage()}");
				}

				$template_array[$name] = $data;
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
			'component_name' => $component,
			'plugin_name' => $plugin,
			'plugin_uri' => "https://{$_SERVER['HTTP_HOST']}{$_ENV['BASE_URI']}{$_ENV['SYSTEM_SERVICE']}/plugin?namespace={$namespace}&plugin={$plugin}"
		];

		if ($ttl && @$ckey) {
			$cache->set($ckey, $ret, $ttl);
		}

		return $ret;
	}

	private function enrichFilters(App $app, array $filters) {
		$session = $app->getSession();

		foreach ($filters as $key => $value) {
			if (preg_match('/^([%\$])/', $value, $matches)) {
				$ref = substr($value, 1);

				switch ($matches[1]) {
					case '%':
						$x = $session->get($ref) ?? null;
						break;
					case '$':
					default:
						$x = $_REQUEST[$ref] ?? null;
						break;
				}

				if ($x !== null) {
					$filters[$key] = $x;
				} else {
					unset($filters[$key]);
				}
			}
		}

		return $filters;
	}
}
