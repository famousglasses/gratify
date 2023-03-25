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
			assert(func, 'function');
		} catch (ex) {
			return gratify.error(ex.message, 'Thread::start');
		}

		if (typeof id !== 'string') {
			id = (new Date()).getTime();
		}

		if (Boolean(frequency)) {
			frequency = String(frequency);
			var f_matches = frequency.match(/^([0-9]+)?\.?([0-9]+)$/);

			if (!f_matches) {
				return gratify.error("bad frequency value '" + frequency + "'", "Thread::start");
			}

			frequency = Number(frequency);
		} else {
			gratify.say("warning: found non-numeric thread frequency; setting to 1");
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
			gratify.say("stopping thread '" + id + "'");
			clearInterval(_this.intervals[id].id);
			delete _this.intervals[id];
		}
	};
}
