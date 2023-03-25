<!DOCTYPE html>
<html lang="en">
	<head>
		<title><?= $_ENV['SITE_NAME'] ?></title>
		<base href="<?= $_ENV['BASE_URI'] ?>">
		<link href="data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABmJLR0T///////8JWPfcAAAACXBIWXMAAABIAAAASABGyWs+AAAAF0lEQVRIx2NgGAWjYBSMglEwCkbBSAcACBAAAeaR9cIAAAAASUVORK5CYII=" rel="icon" type="image/x-icon">
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
		<script src="jquery-3.6.0.min.js"></script>
		<script src="gratify-latest-dev.<?= $_ENV['DEV_MODE'] ? '' : 'min.' ?>js"></script>
	</head>

	<body>
		<?php if ($response['errno']) { ?>
			<div>Error: <?= $response['error'] ?></div>
		<?php } else { ?>
			<div>Welcome ~ Gratify</div>
		<?php } ?>
	</body>
</html>

