<?php

namespace App\Services;
use Gratify\App;

class Index {
	public function index(App $app) {
		$app->setTemplate('index.php');
	}
}
