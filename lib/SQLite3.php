<?php

namespace Gratify;
use \SQLite3 as NativeSQLite3;
use \Exception;

/**
 * SQLite3 database driver.
 */
class SQLite3 {
	/**
	 * Max amount of query tries.
	 */
	const MAX_TRIES = 2;

	/**
	 * Amount of time to wait between retries (in seconds).
	 */
	const RETRY_WAIT = 1;

	/** @ignore */
	private $id;

	/** @ignore */
	private $app;

	/** @ignore */
	private $link;

	/** @ignore */
	private $error = '';

	/** @ignore */
	private $errno = 0;

	/** @ignore */
	public function __construct(string $id, string $path) {
		try {
			$this->link = new NativeSQLite3($path);
		} catch (Exception $e) {
			throw new StdException("could not connect to database {$id} [{$e->getCode()}, {$e->getMessage()}]");
		}
	}

	/** @ignore */
	public function __destruct() {
		$this->link->close();
	}

	/**
	 * Submit a query.
	 *
	 * @param string $sql
	 * @return SQLite3Result
	 */
	public function query(string $sql): SQLite3Result {
		$dbresult = new SQLite3Result();

		if ($_ENV['DEV_MODE']) {
			$dbresult->sql = $sql;
		}

		$result = @$this->link->query($sql);

		if (!$result) {
			$error = $this->link->lastErrorMsg();
			$errno = $this->link->lastErrorCode();
			$dbresult->error = $error;
			$dbresult->errno = $errno;
		} else {
			$num_rows = 0;
			if ($result->numColumns()) {
				while ($result->fetchArray()) {
					$num_rows++;
				}
				$result->reset();
			}

			$dbresult->num_rows = $num_rows;
			$dbresult->num_affected = $this->link->changes();
			$dbresult->result = $result;

			if ($dbresult->num_affected > 0) {
				$dbresult->last_insert_id = $this->link->lastInsertRowID();
			}
		}

		return $dbresult;
	}

	/**
	 * Escape text.
	 *
	 * @param string $text
	 * @return string
	 */
	public function escape($text): string {
		$esc_text = $this->link->escapeString((string)$text);

		if (!$esc_text) {
			$esc_text = addslashes($text);
		}

		return $esc_text;
	}

	/**
	 * Quote a value.
	 *
	 * @param mixed $value
	 * @return string
	 */
	public function quote($val): string {
		if (is_null($val)) {
			return 'NULL';
		} else {
			return "'{$this->escape((string)$val)}'";
		}
	}

	/**
	 * Alias of quote().
	 *
	 * @param mixed $value
	 * @return string
	 */
	public function q($val): string {
		return $this->quote($val);
	}

	/**
	 * Get the last error message.
	 *
	 * @return string
	 */
	public function error(): string {
		return $this->error;
	}

	/**
	 * Get the last error number.
	 *
	 * @return int
	 */
	public function errno(): int {
		return $this->errno;
	}
}
?>
