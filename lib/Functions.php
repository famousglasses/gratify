<?php

declare(strict_types=1);

namespace Gratify;

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

