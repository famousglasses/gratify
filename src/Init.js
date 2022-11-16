var min_jq_ver = 3.1;
if (typeof jQuery === 'undefined') {
	console.error('could not load gratify; missing jQuery');
} else if (parseFloat(jQuery().jquery.substr(0, 3)) < min_jq_ver) {
	console.error('could not load gratify; jQuery version too old -- requires at least ' + min_jq_ver + '.x');
} else {
	if ($ !== jQuery) {
		$ = jQuery;
	}
	var config = {
		loud: true
	};
	var gratify;
	gratify = new GratifyMain();
	gratify.version = __gfy_version__;
	gratify.init(config);
}

