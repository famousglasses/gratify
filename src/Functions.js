function asert(x, type) {
	if (typeof type === 'object' && type.indexOf) {
		if (type.indexOf(typeof x) === -1) {
			throw new TypeError("Bad parameter of type " + (typeof x) + ", expecting " + type.join(', '));
		}
	} else {
		if (typeof x !== String(type)) {
			throw new TypeError("Bad parameter of type " + (typeof x) + ", expecting " + type);
		}
	}
}


