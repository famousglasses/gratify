<?php

declare(strict_types=1);

namespace Gratify;

class Shell {
	const SH_BIN = '/usr/bin';
	const SH_SYSTEMCTL = self::SH_BIN . '/systemctl';
	const SH_PS = self::SH_BIN . '/ps';
	const SH_PGREP = self::SH_BIN . '/pgrep';
	const SH_GREP = self::SH_BIN . '/grep';
	const SH_PHP = self::SH_BIN . '/php';
	const SYSTEMD_SERVICES = [];
	const SYSTEMD_ACTIONS = ['restart', 'status'];

	/** @ignore */
	private $owd;

	/** @ignore */
	private $cwd;

	/** @ignore */
	private $prefix;

	/** @ignore */
	private $options = [];

	/** @ignore */
	private $params = [];

	/** @ignore */
	private $outfile = '';

	/** @ignore */
	public function __construct() {
		$this->prefix = '';
		$this->owd = $this->cwd = getcwd();
		$this->var('HISTCONTROL', 'ignoreboth');

		foreach ($GLOBALS['argv'] ?? [] as $i => $arg) {
			if ($i == 0) {
				continue;
			}

			if (strpos($arg, '-') === 0) {
				$arg = ltrim($arg, '-');

				if (($eqpos = strpos($arg, '=')) !== false) {
					$key = substr($arg, 0, $eqpos);
					$val = substr($arg, $eqpos + 1);
				}
				else {
					$key = $arg;
					$val = true;
				}

				$this->options[$key] = $val;
			}
			else {
				array_push($this->params, $arg);
			}
		}
	}

	/** @ignore */
	public function __destruct() {
		$this->cd($this->owd);
	}

	/**
	 * Get or set the output prefix.
	 *
	 * @param string $prefix
	 * @return boolean|string
	 */
	public function prefix(string $prefix) {
		if ($prefix) {
			$this->prefix = $prefix;
			return true;
		}

		return $this->prefix;
	}

	/**
	 * Change directory.
	 *
	 * @param string $path The dir.
	 * @return boolean Returns TRUE on success, FALSE otherwise.
	 */
	public function cd(string $path): bool {
		if (chdir($path)) {
			$this->cwd = getcwd();
			return true;
		}

		return false;
	}

	/**
	 * Get the current working directory.
	 *
	 * @return string
	 */
	public function getCwd(): string {
		return $this->cwd;
	}

	/**
	 * Get a directory listing.
	 *
	 * @return array
	 */
	public function ls() {
		$items = explode(PHP_EOL, $this->exec('ls -a'));

		foreach ($items as $key => $val) {
			if (in_array($val, ['', '.', '..'])) {
				unset ($items[$key]);
			}
		}

		return $items;
	}

	/**
	 * Write to STDOUT and exit.
	 *
	 * @param string $text
	 * @param boolean $new_line If TRUE, new line will be appended to the output.
	 */
	public function kill(string $text = '', int $code = 1) {
		if (!empty($text)) {
			$this->out($text);
		}

		exit($code);
	}

	/**
	 * Write to STDOUT.
	 *
	 * @param string $text
	 * @param boolean $new_line If TRUE, new line will be appended to the output.
	 */
	public function out(string $text = '', bool $new_line = true) {
		echo $this->prefix . $text . ($new_line ? PHP_EOL : '');
	}

	/**
	 * Alias for out().
	 */
	public function write(string $text = '', bool $new_line = true) {
		return $this->out($text, $new_line);
	}

	/**
	 * Colorize a string of text. Colors include:
	 *  white
	 *  green
	 *  red
	 *  yellow
	 *  blue
	 *  cyan
	 *  magenta
	 *
	 * @param string $text
	 * @param string $foreground
	 * @param string $background
	 * @return string
	 */
	public function colorize(string $text, string $foreground = '', string $background = ''): string {
		// Default prefix
		$prefix = "\e[";

		switch (strtolower($foreground)) {
			case 'white':
				$prefix .= '97;';
				break;
			case 'green':
				$prefix .= '32;';
				break;
			case 'red':
				$prefix .= '31;';
				break;
			case 'yellow':
				$prefix .= '33;';
				break;
			case 'blue':
				$prefix .= '34;';
				break;
			case 'cyan':
				$prefix .= '36;';
				break;
			case 'magenta':
				$prefix .= '35;';
				break;
			default:
				if (is_numeric($foreground)) {
					$prefix .= $foreground . ';';
				}
				else {
					$prefix .= '39;';
				}
		}

		switch (strtolower($background)) {
			case 'white':
				$prefix .= '107;';
				break;
			case 'green':
				$prefix .= '42;';
				break;
			case 'red':
				$prefix .= '41;';
				break;
			case 'yellow':
				$prefix .= '43;';
				break;
			case 'blue':
				$prefix .= '44;';
				break;
			case 'cyan':
				$prefix .= '46;';
				break;
			default:
				if (is_numeric($background)) {
					$prefix .= $background . ';';
				}
				else {
					$prefix .= '49;';
				}
				break;
		}

		$prefix = trim($prefix, ';');

		return "{$prefix}m{$text}\e[0m";
	}

	/**
	 * Prompt user for input.
	 *
	 * @param string $text The prompt content.
	 * @return string The user's input.
	 */
	public function prompt(string $text): string {
		return (string)readline($this->prefix . $text);
	}

	/**
	 * Prompt user for input (hidden while typing).
	 *
	 * @param string $text The prompt content.
	 * @return string The user's input.
	 */
	public function promptSecret(string $text): string {
		$secret = rtrim(shell_exec("/usr/bin/env bash -c 'read -s -p \"" . addslashes($this->prefix . $text) . "\" mysecret && echo \$mysecret'"));
		echo PHP_EOL;
		return $secret;
	}

	/**
	 * Get all options passed to the script. Array keys
	 * will contain the name of the option, the value will
	 * be set to TRUE or a string if a value was specified
	 * for the option.
	 *
	 * @return array
	 */
	public function getOptions(): array {
		return $this->options;
	}

	/**
	 * Get a single option passed to the script.
	 *
	 * @return mixed
	 */
	public function getOption(string $name): string {
		return (string)$this->options[$name];
	}

	/**
	 * Get all parameters passed to the script. Options
	 * will not be included in this.
	 *
	 * @return array
	 */
	public function getParams(): array {
		return $this->params;
	}

	/**
	 * Set or get environment variable.
	 */
	public function var(string $name, string $value = null) {
		if ($value !== null) {
			return putenv("{$name}={$value}");
		} else {
			return getenv($name);
		}
	}

	/**
	 * Execute a command.
	 *
	 * @param string $cmd The command
	 * @param bool $passthru If TRUE, the command will exec using php passthru()
	 * @return string|null The output from the executed command (sometimes NULL) or FALSE on error
	 */
	public function exec(string $cmd, bool $passthru = false): ?string {
		if ($passthru) {
			return passthru($cmd);
		} else {
			return shell_exec(" {$cmd} 2>&1");
		}
	}

	/**
	 * Returns an array of processes matching the mattern.
	 *
	 * @param string $pattern A process name to match
	 * @param bool $exact Use TRUE to match exact process name
	 * @return array
	 */
	public function pgrep($pattern, $exact = false) {
		if (!preg_match('/^[\w ]+$/', $pattern)) {
			throw new StdException('pattern not allowed');
		}

		$cmd  = self::SH_PGREP;
		$cmd .= !$exact ? ' -fl ' : ' -l ';
		$cmd .= "'" . addslashes($pattern) . "' ";
		$cmd .= '| grep -v "^$$ "';
		$res = $this->exec($cmd);
		if (!$res) {
			return [];
		} else {
			return array_filter(explode(PHP_EOL, (string)$res));
		}
	}

	/**
	 * tbd
	 *
	 * @param int $pid A process id
	 * @return string
	 */
	public function ps($pid = 0, string $options = '', string $grep = '') {
		if (!is_numeric($pid)) {
			throw new StdException('pid must be numeric');
		}

		if (!preg_match('/^[a-z\-]*$/', $options)) {
			throw new StdException('options invalid');
		}

		if (!preg_match('/^[\w]*$/', $grep)) {
			throw new StdException('grep invalid');
		}

		$cmd  = self::SH_PS;
		$cmd .= ' -o command --no-headers';
		$cmd .= $pid ? " -fp {$pid}" : "";
		$cmd .= $options ? " {$options}" : "";
		$cmd .= $grep ? " | grep '{$grep}'" : "";
		$res = $this->exec($cmd);
		return $res;
	}
}
?>
