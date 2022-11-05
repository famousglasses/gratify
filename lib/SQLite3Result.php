<?php

namespace Gratify;

class SQLite3Result {
	/**
	 * The current result index.
	 *
	 * @ignore
	 */
	private $index = -1;

	/** @ignore */
	private $rows = [];

	/**
	 * The error text
	 */
	public $error = '';

	/**
	 * The error number
	 */
	public $errno = 0;

	/**
	 * The number of rows in the result-set
	 */
	public $num_rows = 0;

	/**
	 * The number of rows affected by the query
	 */
	public $num_affected = 0;

	/**
	 * The last inserted row ID
	 */
	public $last_insert_id = null;

	/**
	 * The raw mysqli return value
	 */
	public $result = null;

	/**
	 * Fetch the next available record from the record-set.
	 *
	 * @return array|null A row, or NULL if no more rows are left.
	 */
	public function next(): ?array {
		$this->index++;

		// Reached end, reset index and return null
		if ($this->index >= $this->num_rows) {
			$this->index = -1;

			if (is_resource($this->result)) {
				$this->result->reset();
			}

			return null;
		}

		if ($this->result) {
			return $this->result->fetchArray(SQLITE3_ASSOC);
		}

		return null;
	}

	/**
	 * Pull all result records as an associative array.
	 *
	 * @param string $ikey If specified, rows will be indexed using the corresponding field value. This will be ignored if the key doesn't exist in the result set.
	 * @return array
	 */
	public function rows($ikey = null): array {
		if ($this->result && $this->num_rows && !$this->rows) {
			$this->result->reset();
			$this->index = -1;
			while ($row = $this->next()) {
				array_push($this->rows, $row);
			}
		}

		if (is_string($ikey) && $this->num_rows > 0) {
			// Build new result
			$temp = [];
			foreach ($this->rows as $row) {
				if (!array_key_exists($ikey, array_flip(array_keys($row)))) {
					break;
				}

				$temp[$row[$ikey]] = $row;
			}

			if ($temp) {
				return $temp;
			}
		}

		return $this->rows;
	}

	/**
	 * Free result info.
	 */
	public function free() {
		unset($this->rows);
		$this->result->finalize();
	}
}
?>
