<?php

namespace Gratify;

class Session {
	/** @ignore */
	private $driver;

	/** @ignore */
	private $params;

	/** @ignore */
	private $name;

	/** @ignore */
	private $id;

	/** @ignore */
	private $started = false;

	/** @ignore */
	private $using_cookies;

	/** @ignore */
	public function __construct(int $driver, array $params = []) {
		$this->driver = $driver;
		$this->params = $params;
		$this->using_cookies = isset($params['use_cookies']) && !$params['use_cookies'] ? false : true;
		$this->useCookies($this->using_cookies);
	}

	/** @ignore */
	public function __destruct() {
		session_write_close();
	}

	/**
	 * Enable or disable the use of cookies for session IDs.
	 *
	 * @param boolean $enable TRUE to enable cookie-based sessions, FALSE otherwise.
	 */
	public function useCookies($enable = true) {
		$this->using_cookies = $enable;
		@ini_set('session.use_cookies', $enable ? 1 : 0);
		@ini_set('session.use_only_cookies', $enable ? 1 : 0);
		if ($enable && is_array($_COOKIE)) {
			$this->id(@$_COOKIE[$this->name()]);
		}
	}

	/**
	 * Start a session.
	 *
	 * @param string $name The session name.
	 * @param string $id The session ID value.
	 */
	public function start($name = null, $id = null) {
		if ($this->started) {
			return true;
		}

		if (_CLI) {
			throw new StdException("session impossible over CLI");
		}

		switch ($this->driver) {
			case _SESSION_DRIVER_NONE:
				// Do nothing, use local sessions
				break;
			default:
				throw new StdException("unknown session driver [{$this->driver}]");
				break;
		}

		if ($name) {
			$this->name($name);
		}

		if ($id) {
			$this->id = $id;
			@session_id($id);
		}

		if (!session_start()) {
			throw new StdException("could not start session [" . error_get_last()['message'] . "]");
		}

		if (!$this->id) {
			$this->id = @session_id();
		}

		$this->started = true;

		return true;
	}

	/**
	 * Get a session var.
	 *
	 * @param string $key The var name.
	 * @return mixed The value.
	 */
	public function get($key) {
		return $_SESSION[$key] ?? null;
	}

	/**
	 * Set a session var.
	 *
	 * @param string $key The var name.
	 * @param mixed $value The value.
	 */
	public function set($key, $value) {
		$_SESSION[$key] = $value;
	}

	/**
	 * Destroy the session.
	 */
	public function end() {
		session_destroy();
		if ($this->using_cookies) {
			setcookie($this->name(), null, time() / 2);
		}
		$this->started = false;
		return true;
	}

	/**
	 * Get or set the session name.
	 *
	 * @param string $name A valid session name.
	 * @return boolean|string Returns TRUE if setting, and the current name otherwise.
	 */
	public function name($name = null) {
		if ($name) {
			$name = (string)$name;
			session_name($name);
			return true;
		}

		return session_name();
	}

	/**
	 * Get or set the session ID.
	 *
	 * @param string $id A valid session ID.
	 * @return boolean|string Returns TRUE if setting, and the current ID value otherwise.
	 */
	public function id($id = null) {
		if ($id) {
			$id = (string)$id;
			$this->id = $id;
			session_id($id);
			return true;
		}

		return $this->id;
	}

	/**
	 * Return all session vars as an associative array.
	 *
	 * @return array
	 */
	public function toArray(): array {
		return $_SESSION;
	}
}
?>
