<?php

header('Content-Type: application/json');

echo json_encode([
	'errno' => $response['errno'],
	'error' => $response['error'],
	'payload' => $response['payload']
]);

