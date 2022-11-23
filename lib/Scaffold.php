<?php

namespace Gratify;
use Composer\Script\Event;

require_once __DIR__ . '/Functions.php';

class Scaffold {
	public static function createPlugin(Event $event) {
		$shell = new Shell();
		$args = $event->getArguments();

		if (count($args) < 2) {
			$shell->kill('usage: gfy-create-plugin {namespace} {plugin_name}');
		}

		$namespace = (string)@$args[0];
		$plugin_name = (string)@$args[1];

		if (empty($namespace) || !preg_match('/^[\w\d-]+$/', $namespace)) {
			$shell->kill('invalid namespace');
		}

		if (empty($plugin_name) || !preg_match('/^[\w\d-]+$/', $plugin_name)) {
			$shell->kill('invalid plugin name');
		}

		$namespace = strtolower(str_replace('_', '-', $namespace));
		$plugin_name = strtolower(str_replace('_', '-', $plugin_name));

		$dir = "plugins/{$namespace}";

		if (!is_dir($dir)) {
			$res = mkdir($dir);
			$shell->write("mkdir {$dir}: " . ($res ? 'OK' : 'FAIL'));

			if (!$res) {
				$shell->kill();
			}
		}

		$dir .= "/{$plugin_name}";

		if (!is_dir($dir)) {
			$res = mkdir($dir);
			$shell->write("mkdir {$dir}: " . ($res ? 'OK' : 'FAIL'));

			if (!$res) {
				$shell->kill();
			}
		}

		$esc_namespace = strpos('-', $namespace) !== false ? "['{$namespace}']" : ".{$namespace}";
		$component_name = getServiceClass($plugin_name);
		$class_name = "{$namespace}-{$plugin_name}";

		$file = 'manifest.json';
		$path = $dir . '/' . $file;
		if (!is_file($path)) {
			$res = file_put_contents($path, "{\n\t\"name\": \"{$plugin_name}\"\n}");
			$shell->write("write {$file}: " . ($res ? 'OK' : 'FAIL'));
		} else {
			$shell->write("{$file} already exists; skipping");
		}

		$file = 'component.js';
		$path = $dir . '/' . $file;
		if (!is_file($path)) {
			$res = file_put_contents($path, "gratify.components{$esc_namespace}.{$component_name} = {};");
			$shell->write("write {$file}: " . ($res ? 'OK' : 'FAIL'));
		} else {
			$shell->write("{$file} already exists; skipping");
		}

		$file = 'template.twig';
		$path = $dir . '/' . $file;
		if (!is_file($path)) {
			$res = file_put_contents($path, "<div class=\"{$class_name}\"></div>");
			$shell->write("write {$file}: " . ($res ? 'OK' : 'FAIL'));
		} else {
			$shell->write("{$file} already exists; skipping");
		}

		$file = 'style.less';
		$path = $dir . '/' . $file;
		if (!is_file($path)) {
			$res = file_put_contents($path, ".{$class_name} {}");
			$shell->write("write {$file}: " . ($res ? 'OK' : 'FAIL'));
		} else {
			$shell->write("{$file} already exists; skipping");
		}
	}
}

