<?php

namespace Gratify;

class StrataResult extends SQLite3Result {
	/**
	 * Fetch the next available record from the record-set.
	 *
	 * @return array|null A row, or NULL if no more rows are left.
	 */
	public function next(): ?array {
		$row = parent::next();

		if (!$row) {
			return null;
		}

		foreach ($row as $field => $value) {
			if (strpos($field, '__VALUE_') === 0) {
				unset($row[$field]);
				$row = array_merge($row, json_decode($value, true));
			}
		}

		return $row;
	}
}
?>
