<?php

namespace Gratify;
use \Exception;

class NotFoundException extends StdException {
	public function __construct($message, $code = 1) {
		parent::__construct($message, $code);
	}
}

