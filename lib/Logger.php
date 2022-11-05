<?php

namespace Gratify;

/**
 *
 */
class Logger {
	const NOTICE = 0;
	const WARNING = 1;
	const CRITICAL = 2;
	const FILENAME = 'gratify.log';
	const MAX_SIZE = 5000; // in KB

	private $seed;

	/** @ignore */
	public function __construct() {
		$this->seed = mt_rand(100000, 999999);
	}

	/**
	 * Write to the log file.
	 *
	 * @param string $text
	 * @return bool
	 */
	public function out(string $text, int $lvl = self::NOTICE): bool {
		switch ($lvl) {
			case self::NOTICE:
				$lvl_text = 'NOTICE';
				break;
			case self::WARNING:
				$lvl_text = 'WARNING';
				break;
			case self::CRITICAL:
				$lvl_text = 'CRITICAL';
				break;
			default:
				$lvl = self::NOTICE;
				$lvl_text = 'NOTICE';
				$this->out("unknown logging level '{$lvl}'");
				break;
		}

		$logdir = rtrim($_ENV['LOGDIR'], '/');
		$path = $logdir . '/' . self::FILENAME;

		if (!is_file($path)) {
			if (!touch($path)) {
				throw new StdException("could not create log file '{$path}' [" . error_get_last()['message'] . "]");
			}
		}

		if (filesize($path) > 1000 * self::MAX_SIZE) {
			$logs = glob("{$path}*");
			rsort($logs);
			foreach ($logs as $log) {
				$num = substr($log, strrpos($log, '.') + 1);
				$next = $num + 1;
				rename($log, "{$path}.{$next}");
			}
		}

		return @(bool)file_put_contents($path, "[{$this->seed} " . date("M j @ h:i:s A") . " {$lvl_text} {$_ENV['SITE_NAME']}] {$text}\n", FILE_APPEND);
	}
}
?>
