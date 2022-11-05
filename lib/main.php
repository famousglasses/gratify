<?php

declare(strict_types=1);

namespace Gratify;
use Dotenv\Dotenv;
use Dotenv\Exception\ValidationException;
use \Exception;

// Initial error reporting state -- this is
// modified later in respect to your env config
error_reporting(E_ALL);
ini_set('display_errors', '1');

define('_ROOT', realpath(__DIR__ . '/..'));
define('_LIB', _ROOT . '/lib');
define('_PUBLIC', _ROOT . '/public');
define('_TEMPLATES', _ROOT . '/templates');
define('_PLUGINS', _ROOT . '/plugins');
define('_TEMP', '/tmp');
define('_CLI', php_sapi_name() === 'cli');
define('_METHOD', _CLI ? 'cli' : strtolower($_SERVER['REQUEST_METHOD']));
define('_IS_AJAX', strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') == 'xmlhttprequest');
define('_DOMAIN', _CLI ? 'localhost' : $_SERVER['HTTP_HOST']);
define('_REFERER', isset($_SERVER['HTTP_REFERER']) ? rtrim($_SERVER['HTTP_REFERER'], '/') : '');
define('_ORIGIN',  isset($_SERVER['HTTP_REFERER']) ? rtrim($_SERVER['HTTP_REFERER'], '/') : (_REFERER ? _REFERER : ($_SERVER['REMOTE_ADDR'] ?? '')));
define('_CLIENT', _CLI ? 'localhost' : $_SERVER['REMOTE_ADDR']);
define('_STARTED_ON', hrtime(true));
define('_DATABASE_DRIVER_SQLITE3', 1);
define('_DATABASE_DRIVER_SQLITE', _DATABASE_DRIVER_SQLITE3);
define('_DATABASE_DRIVER_STRATA', 2);
define('_SESSION_DRIVER_NONE', 1);

require _ROOT . '/vendor/autoload.php';

// Setup environment
try {
	$dotenv = Dotenv::createImmutable(_ROOT);
	$dotenv->load();

	$dotenv->ifPresent('DEV_MODE')->allowedValues(['0', '1']);

	ini_set('display_errors', $_ENV['DEV_MODE']);

	$dotenv->required('SITE_NAME')->notEmpty();
	$dotenv->required('TIMEZONE')->notEmpty();
	$dotenv->required('ADMIN_EMAIL')->notEmpty();
	$dotenv->required('SYSTEM_SERVICE')->notEmpty();
	$dotenv->required('DEFAULT_SERVICE')->notEmpty();
	$dotenv->required('DEFAULT_FUNCTION')->notEmpty();
	$dotenv->required('DEFAULT_TEMPLATE');
	$dotenv->required('STRICT_ROUTES')->allowedValues(['0', '1']);
	$dotenv->required('LOGDIR')->notEmpty();
	$dotenv->required('ENC_CIPHER')->notEmpty();
	$dotenv->required('ENC_KEY')->notEmpty();

	if (!_CLI) {
		$dotenv->required('BASE_URI');
	}

	$err_text = 'One or more environment variables failed assertions:';

	if (!@date_default_timezone_set($_ENV['TIMEZONE'])) {
		throw new ValidationException("{$err_text} TIMEZONE unsupported");
	}

	if (!filter_var($_ENV['ADMIN_EMAIL'], FILTER_VALIDATE_EMAIL)) {
		throw new ValidationException("{$err_text} ADMIN_EMAIL invalid address");
	}

	if (!is_dir($_ENV['LOGDIR'])) {
		throw new ValidationException("{$err_text} LOGDIR invalid directory");
	}

	if (!in_array($_ENV['ENC_CIPHER'], openssl_get_cipher_methods())) {
		throw new ValidationException("{$err_text} ENC_CIPHER unsupported");
	}
} catch (ValidationException $e) {
	error($e->getMessage());
}

// Setup routing vars
if (_CLI) {
	if ($argc < 3) {
		error("at least 3 parameters required, only {$argc} passed");
	}

	$route_parts = ['', $argv[1], $argv[2]];
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
	$subdir = $route_parts[0] ?? '';
	$service = $route_parts[1] ?? '';
	$function = $route_parts[2] ?? '';
} else {
	$subdir = '';
	$service = $route_parts[0] ?? '';
	$function = $route_parts[1] ?? '';
}

$service = $service ? $service : $_ENV['DEFAULT_SERVICE'];
$function = $function ? $function : $_ENV['DEFAULT_FUNCTION'];
$namespace = 'App\Services' . ($subdir ? '\\' . getServiceClass($subdir) : '');
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
		$service = $_ENV['DEFAULT_SERVICE'];
		$function = $_ENV['DEFAULT_FUNCTION'];
		$method = getServiceMethod($function);
		$class = getServiceClass($service);
	}
}

// Handle request
try {
	$app = getApp();

	if (_CLI) {
		switch ($service) {
			case 'system':
			case 'sys':
				if ($function === 'update') {
					return $app->update();
				}
				break;
		}
	}

	if (!class_exists("{$namespace}\\{$class}")) {
		throw new NotFoundException("service '{$class}' does not exist");
	}

	$rc = new \ReflectionClass("{$namespace}\\{$class}");

	if (!$rc->hasMethod($method)) {
		throw new NotFoundException("function '{$method}' does not exist");
	}

	$rm = $rc->getMethod($method);

	if ($rm->isPublic()) {
		if ($rc->getConstructor() === null) {
			$object = $rc->newInstance();
		} else {
			$object = $rc->newInstance($app);
		}

		if (_CLI) {
			$_REQUEST = $app->getShell()->getOptions();
		}

		$app->respond($object->{$method}($app, $_REQUEST));
	}
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

