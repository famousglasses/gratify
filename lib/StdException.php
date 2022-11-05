<?php

namespace Gratify;
use \Exception;

class StdException extends Exception {
	public function __construct($message, $code = 1) {
		parent::__construct($message, $code);
	}
}

