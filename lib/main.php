<?php

declare(strict_types=1);

namespace Gratify;
use \Exception;

// Initial error reporting state -- this is
// modified later in respect to your env config
error_reporting(E_ALL & ~E_NOTICE);
ini_set('display_errors', '1');

require __DIR__ . '/../vendor/autoload.php';

try {
	loadConstants();
	loadEnv();
} catch (Exception $e) {
	error($e->getMessage());
}

// Setup routing vars
if (_CLI) {
	if ($argc < 3) {
		error("at least 3 parameters required, only {$argc} passed");
	}

	$argx = [];
	for ($i = 1; $i < count($argv); $i++) {
		if (strpos($argv[$i], '-') === 0) {
			continue;
		}
		$argx[] = $argv[$i];
	}
	$route_parts = array_merge([''], $argx);
} else {
	$len = strlen('lib/main.php');
	$root = rtrim(substr($_SERVER['PHP_SELF'], 0, strlen($_SERVER['PHP_SELF']) - $len), '/');
	$uri = str_replace($root, '', $_SERVER['REQUEST_URI']);
	$url_path = substr($uri, 0, ($i = strpos($uri, '?')) !== false ? $i : strlen($uri));
	$route_parts = explode('/', $url_path);
}

// More routing vars...
$route = rtrim(implode('/', $route_parts), '/');
array_shift($route_parts);
if (count($route_parts) > 2) {
	$subdirs = array_splice($route_parts, 0, count($route_parts) - 2);
	$service = $route_parts[0] ?? '';
	$function = $route_parts[1] ?? '';
} else {
	$subdirs = [];
	$service = $route_parts[0] ?? '';
	$function = $route_parts[1] ?? '';
}

$subspace = '';
foreach ($subdirs as $subdir) {
	$subspace .= '\\' . getServiceClass($subdir);
}

$service = $service ? $service : $_ENV['DEFAULT_SERVICE'];
$function = $function ? $function : $_ENV['DEFAULT_FUNCTION'];
$namespace = 'App\Services' . $subspace;
$method = getServiceMethod($function);
$class = getServiceClass($service);

// Override for system services
if ($service === $_ENV['SYSTEM_SERVICE']) {
	$namespace = 'Gratify';
	$class = 'System';
}

// When strict routes is turned off, we will
// revert to a default service in the case
// the requested one does not exist.
if (!_CLI && $_ENV['STRICT_ROUTES'] == false) {
	if (!class_exists("{$namespace}\\{$class}")) {
		// Check for dot strict files
		$dirs = explode('\\', $namespace);
		array_shift($dirs);
		$_dir = '';
		$strict = false;
		foreach ($dirs as $dir) {
			$_dir .= '/' . $dir;
			if (file_exists(_APP . $_dir . '/.strict')) {
				$strict = true;
				break;
			}
		}

		if (!$strict) {
			$namespace = 'App\Services';
			$service = $_ENV['DEFAULT_SERVICE'];
			$function = $_ENV['DEFAULT_FUNCTION'];
			$method = getServiceMethod($function);
			$class = getServiceClass($service);
		}
	}
}

// Handle request
try {
	$app = getApp();

	if (!class_exists("{$namespace}\\{$class}")) {
		throw new NotFoundException("service '{$class}' does not exist");
	}

	$rc = new \ReflectionClass("{$namespace}\\{$class}");

	if (!$rc->hasMethod($method)) {
		throw new NotFoundException("function '{$method}' does not exist");
	}

	$rm = $rc->getMethod($method);

	if (!$rm->isPublic()) {
		throw new NotFoundException("function '{$method}' does not exist");
	}

	define('_FUNCTION', "{$namespace}\\{$class}::{$method}");

	if (!_CLI) {
		$dc = $rm->getDocComment();
		if ($dc) {
			$pattern = "/\*\s*@([a-zA-Z]+)\s*([a-zA-Z0-9, ()_].*)/";
			preg_match_all($pattern, $dc, $matches, PREG_PATTERN_ORDER);

			if (count($matches) == 3) {
				foreach ($matches[1] as $i => $tag) {
					$tag = strtolower(trim($tag));
					$val = strtolower(trim($matches[2][$i]));
					$val = preg_replace('/\s*\*\/$/', '', $val);

					switch ($tag) {
						case 'http':
							$rqmeth = strtolower($_SERVER['REQUEST_METHOD']);
							if ($rqmeth != $val) {
								throw new StdException("request method '{$rqmeth}' not allowed");
							}
							break;
					}
				}
			}
		}
	}

	if (_CLI) {
		$_REQUEST = $app->getShell()->getOptions();
	}

	$app->boot();

	if ($rc->getConstructor() === null) {
		$object = $rc->newInstance();
	} else {
		$object = $rc->newInstance($app);
	}

	$app->respond($object->{$method}($app, $_REQUEST));
} catch (StdException $e) {
	$app->respond(null, max($e->getCode(), 1), $e->getMessage());

	if ($_ENV['DEV_MODE']) {
		$app->getLogger()->out($e->getMessage());
	}
} catch (Exception $e) {
	$app->respond(null, max($e->getCode(), 1), $e->getMessage());

	if ($_ENV['DEV_MODE']) {
		$app->getLogger()->out($e->getMessage());
	}
}

