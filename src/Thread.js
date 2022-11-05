/**
 * Start and stop threaded routines.
 */
function GratifyThread() {
	var _this = this;
	this.intervals = {};

	/**
	 * Start a new thread.
	 */
	this.start = function(func, id, frequency) {
		try {
			asert(func, 'function');
		} catch (ex) {
			return gratify.error(ex.message, 'Thread::start');
		}

		if (typeof id !== 'string') {
			id = (new Date()).getTime();
		}

		if (typeof frequency !== 'number') {
			frequency = 1;
		}

		// Start the thread
		if (typeof _this.intervals[id] === 'undefined') {
			_this.intervals[id] = {
				id: setInterval(func, frequency * 1000),
				frequency: frequency
			};

			func();
		}

		return id;
	};

	/**
	 * Stop an existing thread.
	 */
	this.stop = function(id) {
		if (typeof _this.intervals[id] !== 'undefined') {
			clearInterval(_this.intervals[id].id);
			delete _this.intervals[id];
		}
	};
}
