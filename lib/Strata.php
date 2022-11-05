<?php

namespace Gratify;

/**
 * Strata database driver.
 */
class Strata extends SQLite3 {
	const METAS = ['id', 'key', 'created', 'modified', 'deleted'];
	const DATES = ['created', 'modified', 'deleted'];

	/** @ignore */
	private $tables = [];

	/** @ignore */
	public function __construct(string $id, string $path) {
		parent::__construct($id, $path);

		$res = $this->query("
			SELECT name FROM sqlite_master
			WHERE type = 'table'
			ORDER BY name
		");

		if (!$res->errno) {
			$this->tables = array_keys($res->rows('name'));
		}
	}

	public function get(string $objects, array $criteria = []): StrataResult {
		$objects = explode(',', $objects);
		$whats = [];
		$froms = [];

		foreach ($objects as $exp) {
			$e = $this->parseExp($exp, false);

			if (in_array($e['prop'], self::METAS)) {
				if (in_array($e['prop'], self::DATES)) {
					$w = "datetime({$e['table']}.{$e['prop']}, 'localtime') AS `{$e['alias']}`";
				} else {
					$w = "{$e['table']}.{$e['prop']} AS `{$e['alias']}`";
				}
			} else {
				$x = substr(md5($e['table']), 0, 4);
				if ($e['prop'] != '*') {
					$w = "JSON_EXTRACT({$e['table']}.`value`, '$.{$e['prop']}') AS `{$e['alias']}`";
				} else {
					$w = "{$e['table']}.`value` AS __VALUE_{$x}"; // this will be decoded in the result object
				}
			}

			if (!in_array($w, $whats)) {
				$whats[] = $w;

				if ($e['prop'] == '*') {
					foreach (self::METAS as $i => $meta) {
						if (in_array($meta, self::DATES)) {
							$whats[] = "datetime({$e['table']}.{$meta}, 'localtime') AS `{$meta}`";
						} else {
							$whats[] = "{$e['table']}.{$meta} AS `{$meta}`";
						}
					}
				}
			}

			if (!in_array($e['table'], $froms)) {
				$froms[] = $e['table'];
			}
		}

		if (count($whats) == 0 || count($froms) == 0) {
			throw new StdException('no selection');
		}

		// prioritize table values
		$whats = array_reverse($whats);

		$sql = "SELECT ";

		foreach ($whats as $i => $what) {
			if ($i > 0) {
				$sql .= ', ';
			}

			$sql .= $what;
		}

		$sql .= " FROM ";

		foreach ($froms as $i => $from) {
			if ($i > 0) {
				$sql .= ', ';
			}

			$sql .= $from;
		}

		$wheres = [];

		foreach ($criteria as $exp1 => $exp2) {
			$e1 = $this->parseExp($exp1);

			if ($exp2 != $this->stripExp((string)$exp2)) {
				$e2 = $this->parseExp($exp2);
			} else {
				$e2 = $exp2;
			}

			$wheres[] = [
				$e1,
				$e2
			];
		}

		$s = false;
		$sql .= " WHERE ";
		$uses_deleted = [];

		if (count($wheres)) {
			foreach ($wheres as $where) {
				if ($s) {
					$sql .= " AND ";
				}

				$left = '';
				$right = '';
				$operator = '';
				unset($is_key);

				foreach ($where as $i => $v) {
					$is_link = is_array($v);

					if ($i == 0) {
						$side =& $left;
						$operator = $is_link ? $v['operator'] : '=';
					} else {
						$side =& $right;
					}

					$table = $is_link ? $v['table'] : null;
					$prop = $is_link ? $v['prop'] : null;
					$is_key = @$is_key || ($is_link ? $v['is_key'] : false);
					$is_index = $is_link ? $v['is_index'] : false;
					$is_meta_val = !$is_link && $is_meta; // from last loop
					$is_meta = $prop && in_array($prop, self::METAS);

					if ($is_link) {
						if ($i == 0) {
							if (!$table) {
								$table = $froms[0];
							}

							if ($is_key) {
								$is_meta = true;
								$prop = 'key';
							}
						}

						if (!$table) {
							throw new StdException("linking expression must specify table");
						}

						if ($is_meta) {
							if ($prop == 'key') {
								$is_key = true;
							}

							if ($prop == 'deleted') {
								$uses_deleted[$table] = true;
							}

							$side = "{$table}.{$prop}";
						} else {
							$side = "CAST(JSON_EXTRACT({$table}." . ($is_index ? '`index`' : '`value`') . ", '$.{$prop}') AS TEXT)";
						}
					} else {
						if ($is_key) {
							if (!$v) {
								throw new StdException('key value cannot be empty');
							}

							$v = md5($v);
						}

						if ($is_meta_val) {
							if (is_numeric($v)) {
								$side = $v;
							} elseif (is_null($v)) {
								$side = 'NULL';
							} else {
								$side = "'{$this->escape($v)}'";
							}
						} else {
							if (is_bool($v)) {
								$v = (int)$v;
							}
							$side = "'{$this->escape($v)}'";
						}
					}
				}

				if ($right == 'NULL') {
					if ($operator == '!=') {
						$operator = 'IS NOT';
					} elseif ($operator == '=') {
						$operator = 'IS';
					}
				}

				$sql .= "{$left} {$operator} {$right}";
				$s = true;
			}
		}

		foreach ($froms as $table) {
			if (!isset($uses_deleted[$table])) {
				if ($s) {
					$sql .= " AND ";
				}

				$sql .= "{$table}.deleted IS NULL";
				$s = true;
			}
		}

		$res = $this->query($sql);
		$ret = new StrataResult();

		foreach ($res as $p => $v) {
			$ret->{$p} = $v;
		}

		if ($ret->errno) {
			if ($this->isNonError($ret->error)) {
				$ret->errno = 0;
				$ret->error = '';
			}
		}

		return $ret;
	}

	public function put(string $table, array $data): StrataResult {
		if (!$this->tableValid($table)) {
			throw new StdException("invalid table name");
		}

		if (count($data) == 0) {
			throw new StdException("empty data");
		}

		if (!in_array($table, $this->tables)) {
			$res = $this->query("
				CREATE TABLE IF NOT EXISTS `{$table}` (
					`id` INTEGER PRIMARY KEY,
					`key` TEXT UNIQUE,
					`index` TEXT UNIQUE,
					`value` TEXT,
					`created` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
					`modified` DATETIME,
					`deleted` DATETIME
				)
			");

			if ($res->errno) {
				throw new StdException("could not create table; {$res->error}");
			}
		}

		$index = [];
		$value = [];
		$key = '';

		foreach ($data as $x => $y) {
			$x = trim($x);

			$is_key = $this->expIsKey($x);
			$is_index = $is_key || $this->expIsIndex($x);
			$x = $this->stripExp((string)$x);

			if (!$this->propValid($x)) {
				throw new StdException("invalid property name");
			}

			if (in_array($x, self::METAS)) {
				throw new StdException("cannot use reserved word as property name");
			}

			if (is_bool($y)) {
				$y = (int)$y;
			}

			if ($is_index) {
				$index[$x] = $y;
			}

			if ($is_key) {
				if ($key) {
					throw new StdException('multiple keys not allowed');
				}

				if (!$y) {
					throw new StdException('key value cannot be empty');
				}

				$key = md5($y);
			}

			$value[$x] = $y;
		}

		ksort($index);

		$res = $this->query("
			INSERT INTO {$table} (
				`key`,
				`index`,
				`value`
			) VALUES (
				" . ($key ? "'{$this->escape($key)}'" : 'NULL') . ",
				" . (count($index) ? "'{$this->escape(json_encode($index))}'" : 'NULL') . ",
				'{$this->escape(json_encode($value))}'
			)
		");

		$ret = new StrataResult();

		foreach ($res as $p => $v) {
			$ret->{$p} = $v;
		}

		// todo if insertion fails from dupe on deleted record, we should overwrite it instead

		return $ret;
	}

	public function delete(string $table, array $criteria = []): StrataResult {
		$e = $this->parseExp($table, false);

		if (!$e['table'] || $e['prop'] != '*') {
			throw new StdException('invalid table declaration');
		}

		if (!in_array($table, $this->tables)) {
			throw new StdException('table does not exist');
		}

		$sql = "UPDATE {$e['table']} SET deleted = CURRENT_TIMESTAMP";

		$wheres = [];

		foreach ($criteria as $exp1 => $exp2) {
			$e1 = $this->parseExp($exp1);

			if ($exp2 != $this->stripExp((string)$exp2)) {
				throw new StdException("right hand linking expression not allowed here");
			} else {
				$e2 = $exp2;
			}

			$wheres[] = [
				$e1,
				$e2
			];
		}

		$sql .= " WHERE ";

		if (count($wheres)) {
			foreach ($wheres as $w => $where) {
				$left = '';
				$right = '';
				$operator = '';
				unset($is_key);

				foreach ($where as $i => $v) {
					$is_link = is_array($v); // always true for $i == 0
					$prop = $is_link ? $v['prop'] : null;
					$is_key = @$is_key || ($is_link ? $v['is_key'] : false);
					$is_index = $is_link ? $v['is_index'] : false;
					$is_meta = $prop && in_array($prop, self::METAS);

					if ($i == 0) {
						$operator = $v['operator'];

						if ($is_key) {
							$is_meta = true;
							$prop = 'key';
						}

						if ($is_meta) {
							if ($prop == 'key') {
								$is_key = true;
							}

							if ($prop == 'deleted') {
								throw new StdException('property not allowed here');
							}

							$left = "{$table}.{$prop}";
						} else {
							$left = "CAST(JSON_EXTRACT({$table}." . ($is_index ? '`index`' : '`value`') . ", '$.{$prop}') AS TEXT)";
						}
					} else {
						if ($is_key) {
							if (!$v) {
								throw new StdException('key value cannot be empty');
							}

							$v = md5($v);
						}

						if (is_bool($v)) {
							$v = (int)$v;
						}

						$right .= is_numeric($v) ? $v : "'{$this->escape($v)}'";
					}
				}

				if ($right == 'NULL') {
					if ($operator == '!=') {
						$operator = 'IS NOT';
					} elseif ($operator == '=') {
						$operator = 'IS';
					}
				}

				$sql .= "{$left} {$operator} {$right} AND ";
			}
		}

		$sql .= "deleted IS NULL";

		$res = $this->query($sql);
		$ret = new StrataResult();

		foreach ($res as $p => $v) {
			$ret->{$p} = $v;
		}

		if ($ret->errno) {
			if ($this->isNonError($ret->error)) {
				$ret->errno = 0;
				$ret->error = '';
			}
		}

		return $ret;
	}

	public function restore(string $table, int $id) {
		// todo implement
		// restore a deleted record
	}

	public function rm(string $table, array $criteria = []): StrataResult {
		$e = $this->parseExp($object, false);

		if (!$e['table'] || $e['prop'] != '*') {
			throw new StdException('invalid objects declaration; must specify only tables');
		}

		$sql = "DELETE FROM {$e['table']}";

		$wheres = [];

		foreach ($criteria as $exp1 => $exp2) {
			$e1 = $this->parseExp($exp1);

			if ($exp2 != $this->stripExp((string)$exp2)) {
				throw new StdException("right hand linking expression not allowed here");
			} else {
				$e2 = $exp2;
			}

			$wheres[] = [
				$e1,
				$e2
			];
		}

		if (count($wheres)) {
			$sql .= " WHERE ";

			foreach ($wheres as $w => $where) {
				if ($w > 0) {
					$sql .= " AND ";
				}

				$left = '';
				$right = '';
				$operator = '';
				unset($is_key);

				foreach ($where as $i => $v) {
					$is_link = is_array($v); // always true for $i == 0
					$prop = $is_link ? $v['prop'] : null;
					$table = $is_link ? $v['table'] : null;
					$is_key = @$is_key || ($is_link ? $v['is_key'] : false);
					$is_index = $is_link ? $v['is_index'] : false;
					$is_meta = $prop && in_array($prop, self::METAS);

					if ($i == 0) {
						$operator = $v['operator'];

						if (!$table) {
							$table = $froms[0];
						}

						if ($is_key) {
							$is_meta = true;
							$prop = 'key';
						}

						if ($is_meta) {
							if ($prop == 'key') {
								$is_key = true;
							}

							$left = "{$table}.{$prop}";
						} else {
							$left = "CAST(JSON_EXTRACT({$table}." . ($is_index ? '`index`' : '`value`') . ", '$.{$prop}') AS TEXT)";
						}
					} else {
						if ($is_key) {
							if (!$v) {
								throw new StdException('key value cannot be empty');
							}

							$v = md5($v);
						}

						$right .= is_numeric($v) ? $v : "'{$this->escape($v)}'";
					}
				}

				if ($right == 'NULL') {
					if ($operator == '!=') {
						$operator = 'IS NOT';
					} elseif ($operator == '=') {
						$operator = 'IS';
					}
				}

				$sql .= "{$left} {$operator} {$right}";
			}
		}

		$res = $this->query($sql);
		$ret = new StrataResult();

		foreach ($res as $p => $v) {
			$ret->{$p} = $v;
		}

		if ($ret->errno) {
			if ($this->isNonError($ret->error)) {
				$ret->errno = 0;
				$ret->error = '';
			}
		}

		return $ret;
	}

	public function update(string $table, array $assignments = [], array $criteria = []): StrataResult {
		$e = $this->parseExp($table, false);

		if (!$e['table'] || $e['prop'] != '*') {
			throw new StdException('invalid table declaration');
		}

		if (!in_array($table, $this->tables)) {
			throw new StdException('table does not exist');
		}

		$sql = "UPDATE {$e['table']} ";

		$sets = [
			'key' => '',
			'index' => [],
			'value' => []
		];

		foreach ($assignments as $key => $val) {
			$x = $this->parseExp($key, true);
			$prop = $x['prop'];

			if ($x['table']) {
				throw new StdException('invalid assignment expression');
			}

			if ($x['is_index']) {
				if (empty($sets['index'][$prop])) {
					$sets['index'][$prop] = $val;
				}
			}

			if ($x['is_key']) {
				if ($sets['key']) {
					throw new StdException('multiple keys not allowed');
				}

				if (!$val) {
					throw new StdException('key value cannot be empty');
				}

				$sets['key'] = md5($val);
			}

			$sets['value'][$prop] = $val;
		}

		if (count($sets['value']) == 0) {
			throw new StdException('no assignments');
		}

		$sql .= "SET ";

		if ($sets['key']) {
			$sql .= "key = '{$this->escape(md5($sets['key']))}', ";
		}

		if (count($sets['index'])) {
			$enclosure = '`index`';
			foreach ($sets['index'] as $k => $v) {
				$v2 = is_numeric($v) ? $v : "'{$this->escape($v)}'";

				$enclosure = "JSON_SET({$enclosure}, '$.{$k}', {$v2})";
			}

			$sql .= "`index` = {$enclosure}, ";
		}

		$enclosure = 'value';
		foreach ($sets['value'] as $k => $v) {
			$v2 = is_numeric($v) ? $v : "'{$this->escape($v)}'";

			$enclosure = "JSON_SET({$enclosure}, '$.{$k}', {$v2})";
		}

		$sql .= "value = {$enclosure}, modified = CURRENT_TIMESTAMP";

		$wheres = [];

		foreach ($criteria as $exp1 => $exp2) {
			$e1 = $this->parseExp($exp1);

			if ($exp2 != $this->stripExp((string)$exp2)) {
				throw new StdException("right hand linking expression not allowed here");
			} else {
				$e2 = $exp2;
			}

			$wheres[] = [
				$e1,
				$e2
			];
		}

		$sql .= " WHERE ";

		if (count($wheres)) {
			foreach ($wheres as $w => $where) {
				$left = '';
				$right = '';
				$operator = '';
				unset($is_key);

				foreach ($where as $i => $v) {
					$is_link = is_array($v); // always true for $i == 0
					$prop = $is_link ? $v['prop'] : null;
					$is_key = @$is_key || ($is_link ? $v['is_key'] : false);
					$is_index = $is_link ? $v['is_index'] : false;
					$is_meta = $prop && in_array($prop, self::METAS);

					if ($i == 0) {
						$operator = $v['operator'];

						if ($is_key) {
							$is_meta = true;
							$prop = 'key';
						}

						if ($is_meta) {
							if ($prop == 'key') {
								$is_key = true;
							}

							if ($prop == 'deleted') {
								throw new StdException('property not allowed here');
							}

							$left = "{$table}.{$prop}";
						} else {
							$left = "CAST(JSON_EXTRACT({$table}." . ($is_index ? '`index`' : '`value`') . ", '$.{$prop}') AS TEXT)";
						}
					} else {
						if ($is_key) {
							if (!$v) {
								throw new StdException('key value cannot be empty');
							}

							$v = md5($v);
						}

						$right .= is_numeric($v) ? $v : "'{$this->escape($v)}'";
					}
				}

				if ($right == 'NULL') {
					if ($operator == '!=') {
						$operator = 'IS NOT';
					} elseif ($operator == '=') {
						$operator = 'IS';
					}
				}

				$sql .= "{$left} {$operator} {$right} AND ";
			}
		}

		$sql .= "deleted IS NULL";

		$res = $this->query($sql);
		$ret = new StrataResult();

		foreach ($res as $p => $v) {
			$ret->{$p} = $v;
		}

		if ($ret->errno) {
			if ($this->isNonError($ret->error)) {
				$ret->errno = 0;
				$ret->error = '';
			}
		}

		return $ret;
	}

	private function parseExp(string $exp, bool $table_optional = true) {
		$exp = preg_replace('/\s+/', ' ', trim($exp));

		if (substr_count($exp, '.') > 1) {
			throw new StdException('invalid expression');
		}

		if (substr_count($exp, ' ') > 1) {
			throw new StdException('invalid expression');
		}

		$parts = explode(' ', $exp);
		$object = $parts[0];
		$operator = $parts[1] ?? '=';

		if (!in_array(strtolower($operator), ['=', '!=', 'like'])) {
			throw new StdException('invalid operator');
		}

		$is_key = $this->expIsKey($object);
		$is_index = $this->expIsIndex($object);
		$is_link = $this->expIsLink($object);
		$parts = explode('.', $this->stripExp($object));

		if ($table_optional) {
			$table = count($parts) > 1 ? $parts[0] : null;
			$prop = $table ? $parts[1] : $parts[0];
		} else {
			$table = $parts[0];
			$prop = $parts[1] ?? '*';
		}

		if ($prop != '*' && !$this->propValid($prop)) {
			throw new StdException("property name invalid");
		}

		if ($table !== null && !$this->tableValid($table)) {
			throw new StdException('table name invalid');
		}

		$x = explode(':', $prop);
		$prop = $x[0];
		$alias = $x[1] ?? $prop;

		return [
			'table' => $table,
			'prop' => $prop,
			'alias' => $alias,
			'operator' => $operator,
			'is_key' => $is_key,
			'is_index' => $is_index,
			'is_link' => $is_link
		];
	}

	private function tableValid(string $table) {
		$pattern = '^[a-z_][a-z\d_]*$';
		return preg_match("/{$pattern}/i", $table);
	}

	private function propValid(string $prop) {
		$pattern = '^[a-z\d_-]+(:[a-z\d_-]+)?$';
		return preg_match("/{$pattern}/i", $prop);
	}

	private function stripExp(string $exp) {
		return ltrim($exp, '@$#');
	}

	private function expIsIndex(string $field) {
		$pattern = '^@';
		return preg_match("/{$pattern}/i", $field);
	}

	private function expIsLink(string $field) {
		$pattern = '^\$';
		return preg_match("/{$pattern}/i", $field);
	}

	private function expIsKey(string $field) {
		$pattern = '^#';
		return preg_match("/{$pattern}/i", $field);
	}

	private function isNonError(string $error) {
		return (
			strpos($error, 'no such table') !== false
		);
	}
}
?>
