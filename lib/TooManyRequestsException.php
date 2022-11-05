<?php

namespace Gratify;
use \Exception;

class TooManyRequestsException extends StdException {
	public function __construct($message, $code = 1) {
		parent::__construct($message, $code);
	}
}

