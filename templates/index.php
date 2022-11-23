<?php
$gratify_js = 'gratify-latest-dev.' . ($_ENV['DEV_MODE'] ? '' : 'min.') .'js';
$gratify_md5 = md5_file(_PUBLIC . '/' . $gratify_js);
?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<title><?= $_ENV['SITE_NAME'] ?></title>
		<base href="<?= $_ENV['BASE_URI'] ?>">
		<link rel="icon" href="img/favicon.png">
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
		<script src="jquery-3.6.0.min.js"></script>
		<script src="<?= $gratify_js . '?' . $gratify_md5 ?>"></script>
	</head>

	<body>
		<?php if ($response['errno']) { ?>
			<div>Error: <?= $response['error'] ?></div>
		<?php } else { ?>
			<div gfy-plugin="example.hello" />
		<?php } ?>
	</body>
</html>

