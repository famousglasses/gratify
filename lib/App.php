<?php

declare(strict_types=1);

namespace Gratify;

/**
 * The application handler.
 */
class App {
	/**
	 * An array of global vars.
	 */
	private $globals;

	/**
	 * The template path; relative to /templates/.
	 */
	private $template;

	/** @ignore */
	private $databases;

	/** @ignore */
	private $logger;

	/** @ignore */
	private $keyring;

	/** @ignore */
	private $session;

	/** @ignore */
	private $shell;

	/** @ignore */
	public function __construct() {
		global $route;

		$this->setTemplate($_ENV['DEFAULT_TEMPLATE']);

		if ($_ENV['DEV_MODE']) {
			$this->getLogger()->out(strtoupper(_METHOD) . ' ' . (_CLI ? $route : $_SERVER['REQUEST_URI']) . ' FROM ' . _CLIENT . (!_CLI ? " {$os}/{$browser}" : ''));
		}
	}

	/** @ignore */
	public function __destruct() {
		if ($_ENV['DEV_MODE']) {
			$response_time = round((hrtime(true) - _STARTED_ON) / 1e+6, 2);
			@$this->getLogger()->out("RESP IN {$response_time}ms");
		}
	}

	public function boot(bool $force = false) {
		static $is_booted = false;

		if ($is_booted && !$force) {
			return true;
		}

		$loaders = [];
		$paths = glob(_APP . '/BootLoaders/*.php');

		foreach ($paths as $path) {
			$class = substr($path, strrpos($path, '/') + 1);
			$class = substr($class, 0, strlen($class) - 4);
			$class = 'App\\BootLoaders\\' . $class;
			$loaders[] = $class;
		}

		foreach ($loaders as $loader) {
			$loader::load($this);
		}

		$is_booted = true;
		return true;
	}

	/**
	 * Set a global var.
	 *
	 * @param string $name
	 * @param mixed $value
	 */
	function setGlobal(string $name, $value) {
		$this->globals[$name] = $value;
	}

	/**
	 * Get a global var.
	 *
	 * @param string $name
	 * @param mixed $value
	 */
	function getGlobal(string $name, $value) {
		return $this->globals[$name] ?? null;
	}

	/**
	 * Set the response template.
	 *
	 * @param string $name A valid template path or NULL to use the default JSON render.
	 */
	function setTemplate(?string $filename) {
		$this->template = $filename;
	}

	/**
	 * Get the response template.
	 *
	 * @return string
	 */
	function getTemplate(): ?string {
		return $this->template;
	}

	/**
	 * Terminate the application and output a response. If no template is set, the response will output as JSON.
	 *
	 * @param mixed $payload Reponse data.
	 * @param int $errno An error number, if one exists.
	 * @param string $error An error message, if one exists.
	 */
	function respond($payload, int $errno = 0, string $error = '') {
		$response = [
			'errno' => $errno,
			'error' => $error,
			'payload' => $payload
		];

		if (_CLI) {
			$shell = $this->getShell();

			if ($errno) {
				$shell->write("Error {$errno}: {$error}");
				exit(1);
			} else {
				$shell->write("Result: ", false);
				switch (gettype($payload)) {
					case 'boolean':
						$shell->write($payload ? 'TRUE' : 'FALSE');
						break;
					default:
						var_dump($payload);
						$shell->write('');
						break;
				}
				exit(0);
			}
		}

		$template = $this->getTemplate();

		if ($template) {
			$path = _TEMPLATES . '/' . $template;
			if (file_exists($path)) {
				include $path;
				exit(0);
			}
		}

		exit(json_encode($response));
	}

	/**
	 * Send an email.
	 *
	 * @param string $to To address
	 * @param string $subject Subject line
	 * @param string $template A valid template file
	 * @param array $vars Replacement variables
	 */
	public function email(string $to, string $subject, array $vars = [], string $template = 'emails/simple.txt') {
		$file = _TEMPLATES . '/' . $template;

		if (!file_exists($file)) {
			throw new StdException("email template '{$template}' not found");
		}

		$body = file_get_contents($file);
		$headers = [];

		if (count($vars)) {
			foreach ($vars as $k => $v) {
				$body = str_replace('{{' . $k . '}}', $v, $body);
			}
		}

		$headers[] = 'MIME-Version: 1.0';
		$headers[] = 'From: ' . $_ENV['SITE_NAME'] . ' <' . $_ENV['ADMIN_EMAIL'] . '>';

		if (preg_match('/.html?$/i', $template)) {
			$headers[] = 'Content-Type: text/html; charset="UTF-8"';
		} else {
			$headers[] = 'Content-Type: text/plain; charset="UTF-8"';
		}

		mail($to, $subject, $body, implode("\r\n", $headers));
	}

	/**
	 * Get a database instance.
	 *
	 * @param string $id
	 * @throws StdException
	 * @return mixed
	 */
	public function getDatabase(string $id = 'default') {
		$id = strtoupper($id);

		if (isset($this->databases[$id])) {
			return $this->databases[$id];
		}

		$db = [];
		foreach ($_ENV as $key => $val) {
			if (preg_match("/^DB_({$id})_(DRIVER|PATH|HOST|PORT|USER|PASS|DBNAME)$/", $key, $matches)) {
				$db[$matches[2]] = $val;
			}
		}

		if (count($db) == 0) {
			throw new StdException("unknown database id '{$id}'");
		}

		$driver = strtoupper($db['DRIVER']);
		$driver_const = "_DATABASE_DRIVER_{$driver}";

		if (!isset($db['DRIVER']) || !defined($driver_const)) {
			throw new StdException("unknown database driver '{$driver}'");
		}

		switch (constant($driver_const)) {
			case _DATABASE_DRIVER_SQLITE3:
			case _DATABASE_DRIVER_SQLITE:
				if (strpos($db['PATH'], '/') === 0) {
					$path = $db['PATH'];
				} else {
					$path = _ROOT . '/' . $db['PATH'];
				}

				$this->databases[$id] = new SQLite3($id, $path);
				return $this->databases[$id];
			case _DATABASE_DRIVER_STRATA:
				if (strpos($db['PATH'], '/') === 0) {
					$path = $db['PATH'];
				} else {
					$path = _ROOT . '/' . $db['PATH'];
				}

				$this->databases[$id] = new Strata($id, $path);
				return $this->databases[$id];
			default:
				throw new StdException("unknown database driver '{$driver}'");
		}
	}

	/**
	 * Get the shell module.
	 *
	 * @return Shell
	 */
	public function getShell(): Shell {
		if (!$this->shell) {
			$this->shell = new Shell();
		}

		return $this->shell;
	}

	/**
	 * Get the keyring module.
	 *
	 * @return Keyring
	 */
	public function getKeyring(): Keyring {
		if (!$this->keyring) {
			$this->keyring = new Keyring();
		}

		return $this->keyring;
	}

	/**
	 * Get the session module.
	 *
	 * @param string $driver The session driver type (see constants)
	 * @param array $params An associative array of session config params.
	 * @throws StdException
	 * @return Session
	 */
	public function getSession(int $driver = _SESSION_DRIVER_NONE, array $params = []): Session {
		if (!in_array($driver, [_SESSION_DRIVER_NONE])) {
			throw new StdException("unknown session driver '{$driver}'");
		}

		if (!$this->session || func_num_args() > 0) {
			unset($this->session);
			$this->session = new Session($driver, $params);
		}

		return $this->session;
	}

	/**
	 * Get the logger module.
	 *
	 * @return Logger
	 */
	public function getLogger(): Logger {
		if (!$this->logger) {
			$this->logger = new Logger();
		}

		return $this->logger;
	}
}

