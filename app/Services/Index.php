<?php

namespace App\Services;
use Gratify\App;
use Gratify\StdException;

class Index {
	public function index(App $app) {
		$app->setTemplate('default.php');
	}
}
