<?php
$content = $response['payload'];
$errno = $response['errno'];
$error = $response['error'];
$component = $content['meta']['component_name'];
$namespace = $content['meta']['namespace'];
$plugin = $content['meta']['plugin_name'];
?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<title><?= $content['meta']['component_name'] ?? 'Gratify Plugin' ?></title>
		<base href="<?= $_ENV['BASE_URI'] ?>">
		<link href="data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQEAYAAABPYyMiAAAABmJLR0T///////8JWPfcAAAACXBIWXMAAABIAAAASABGyWs+AAAAF0lEQVRIx2NgGAWjYBSMglEwCkbBSAcACBAAAeaR9cIAAAAASUVORK5CYII=" rel="icon" type="image/x-icon">
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
		<?php if ($content) { ?>
			<style><?= $content['css'] ?></style>
		<?php } ?>
		<script src="jquery-3.6.0.min.js"></script>
		<script src="gratify-latest-dev.min.js"></script>
	</head>

	<body>
		<?php if ($errno) { ?>
			<div>Error: <?= $error ?></div>
		<?php } else { ?>
			<?= $content['html'] ?>
		<?php } ?>
	</body>

	<?php if ($content) { ?>
		<script>
			if (!gratify.components['<?= $namespace ?>']) {
				gratify.components['<?= $namespace ?>'] = {};
			}
			<?= $content['js'] ?>
			var component = gratify.components['<?= $namespace ?>']['<?= $component ?>'];
			component.$id = '<?= $component ?>';
			var obj = gratify.spawn(component);
			obj.$container = $('.<?= $plugin ?>');
		</script>
	<?php } ?>
</html>

