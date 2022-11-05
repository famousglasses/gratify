module.exports = function(grunt) {
	var pkg = grunt.file.readJSON('package.json');

	grunt.initConfig({
		pkg: pkg,
		jshint: {
			gratify: pkg.sources
		},
		concat: {
			options: {
				banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd h:mm TT") %> */ var __gfy_version__ = "<%= pkg.version %>";\n',
				separator: '\n'
			},
			gratify: {
				src: pkg.sources,
				dest: '/tmp/gratify.js'
			}
		},
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd h:mm TT") %> */\n',
			},
			gratify: {
				src: '/tmp/gratify.js',
			 	dest: 'public/gratify-<%= pkg.version %>.min.js'
			},
			gratify_dev: {
				src: '/tmp/gratify.js',
				dest: 'public/gratify-latest-dev.min.js'
			}
		},
		copy: {
			main: {
				files: [
					{src: 'public/gratify-<%= pkg.version %>.md5', dest: 'public/gratify-latest-dev.md5'}
				]
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'copy']);
};
