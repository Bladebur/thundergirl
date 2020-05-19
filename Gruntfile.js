module.exports = grunt => {

	require('time-grunt')(grunt);
	
	grunt.option('config', 'production');
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		sync: {
			main: {
				files: [
					{
						cwd:    'games',
						src:    [ '**', '!**/*.js' ],
 						dest:   'dist',
					},
				],
				pretend: false,
				updateAndDelete: true,
				ignoreInDest: [ "**/*.js", "**/*.map" ],
				verbose: true
			}
		},
		concat: {
		    options: {
			  stripBanners: true,
			  sourceMap: true,
		      banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' + '<%= grunt.template.today("yyyy-mm-dd") %> */\n',
		    },
			dist: {
				files: {
					'dist/adventure-toolkit.js': 'src/**/*.js'
				}
			}
		},
		jshint: {
			files: [ 'src/**/*.js' ]
		},
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> | v<%= pkg.version %> | ' +
				        '<%= grunt.template.today("yyyy-mm-dd") %> */\n',
				flatten: false,
				sourceMap: true,
				mangle: true,
				compress: true
			},
			dist: {
				files: {
					'dist/adventure-toolkit.min.js': [ 'dist/adventure-toolkit.js' ]
				}
			}
		},
		"merge-source-maps": {
			dist: {
				files: [{
					src: 'dist/*.min.js',
					expand: true
				}]
			}

		},
		clean: {
			dist: [ 
					'dist/adventure-toolkit.js',
					'dist/adventure-toolkit.js.map'
			]
		},
		connect: {
			base: 'dist',
			options: {
				host: 'localhost',
				port: 9000,
				livereload: false 		// Buggy on windows, script added manually
			}
		},
		syncdeploy: {
			main: {
				cwd: 'dist/',
				src: [ '**/*' ],
			},
			options: {
				"serverTimezone": "EDT"
			}
		},
		watch: {
			files: [ '<%= jshint.files %>', 'games/**/*' ],
			tasks: [ 'jshint', 'concat', 'sync', 'uglify', 'merge-source-maps', 'clean' ],
			options: { spawn: false, livereload: true },
			livereload: {
				options: { livereload: true },
				files: [ 'dist/**/*' ]
			}
		}
	});

	grunt.registerTask("prepare", "Finds and prepares games for concatenation.", function() {
        var jshint = grunt.config.get('jshint') || {};
	    var concat = grunt.config.get('concat') || {};
        var uglify = grunt.config.get('uglify') || {}; 
        var clean  = grunt.config.get('clean') || {}; 
        var merge  = grunt.config.get('merge-source-maps') || {}; 

	    grunt.file.expand("games/*").forEach(dir => {

	    	if (dir.match(/\./))
	    		return;

	        var gameName = dir.substr(dir.lastIndexOf('/')+1);
	        grunt.log.writeln('Adding tasks for ' + dir.cyan);

	        // hint the game sources
	        jshint.files.push('games/' + gameName + '/*.js');

	        // create a subtask for each game, find all src files
	        // and combine into a single js file per module
	        concat.dist.files['dist/' + gameName + '/game.js'] = dir + '/**/*.js';

	        // uglify the resulting file
			uglify.dist.files['dist/' + gameName + '/game.min.js'] = [ 'dist/' + gameName + '/game.js' ];
			
			// merge the source map
			merge.dist.files.push({
				src: 'dist/' + gameName + '/*.min.js',
				expand: true
			});

			// clean intermediate files
			clean.dist.push('dist/' + gameName + '/game.js');
			clean.dist.push('dist/' + gameName + '/game.js.map');

	    });

        grunt.config.set('uglify', uglify);
        grunt.config.set('jshint', jshint);
        grunt.config.set('concat', concat);
        grunt.config.set('clean', clean);
        grunt.config.set('merge-source-maps', merge);
	});

	require('jit-grunt')(grunt);

	grunt.registerTask('default', [ 'prepare', 'jshint', 'concat', 'sync', 'uglify', 'merge-source-maps', 'clean', 'connect', 'watch' ]);
	grunt.registerTask('build', [ 'prepare', 'jshint', 'concat', 'sync', 'uglify', 'merge-source-maps', 'clean', 'syncdeploy' ]);
};
