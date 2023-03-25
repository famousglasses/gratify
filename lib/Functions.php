<?php

declare(strict_types=1);

namespace Gratify;
use Dotenv\Dotenv;
use Dotenv\Exception\ValidationException;

/**
 * Translate service to PHP class name.
 *
 * @param string $name
 * @param string
 */
function getServiceClass(string $name): string {
	$name = str_replace('_', '-', $name);
	$name = preg_replace('/[^a-z\d-]/', '', $name);
	$parts = explode('-', $name);
	$cased_parts = array_map(function($n) {
		return ucfirst($n);
	}, $parts);
	return implode('', $cased_parts);
}

/**
 * Translate service function to PHP method name.
 *
 * @param string $name
 * @param string
 */
function getServiceMethod(string $name): string {
	return lcfirst(getServiceClass($name));
}

/**
 * Get the application instance.
 *
 * @return App
 */
function getApp(): App {
	static $app;
	$app = $app ?? new App();
	return $app;
}

/**
 * Load all core constants.
 */
function loadConstants() {
	static $loaded = false;

	if ($loaded) {
		return true;
	}

	define('_ROOT', realpath(__DIR__ . '/..'));
	define('_APP', _ROOT . '/app');
	define('_LIB', _ROOT . '/lib');
	define('_PUBLIC', _ROOT . '/public');
	define('_TEMPLATES', _APP . '/Templates');
	define('_DATASOURCES', _APP . '/Datasources');
	define('_PLUGINS', _APP . '/WebPlugins');
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

	$loaded = true;
	return true;
}

/**
 * Load environment variables.
 *
 * @throws ValidationException
 */
function loadEnv() {
	static $loaded = false;

	if ($loaded) {
		return true;
	}

	loadConstants();

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

	$loaded = true;
	return true;
}

/**
 * Exit and print an error message.
 *
 * @param string $msg
 */
function error(string $msg) {
	exit("Gratify Error: {$msg}" . PHP_EOL);
}

/**
 * Print info about gratify.
 */
function info() {
	if (!_CLI) {
		echo '<div>';
	}

	foreach (get_defined_constants(true)['user'] as $name => $val) {
		if (strpos($name, '_') === 0) {
			if (is_bool($val)) {
				$valtxt = $val ? 'TRUE' : 'FALSE';
			} else {
				$valtxt = print_r($val, true);
			}
			echo $name . ' = ' . $valtxt . (_CLI ? PHP_EOL : '<br>');
		}
	}

	if (!_CLI) {
		echo '</div>';
	}
}

