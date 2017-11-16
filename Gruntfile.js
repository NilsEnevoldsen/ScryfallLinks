/* eslint-env node */
module.exports = function ( grunt ) {
	var conf = grunt.file.readJSON( 'extension.json' );

	grunt.loadNpmTasks( 'grunt-contrib-less' );
	grunt.loadNpmTasks( 'grunt-banana-checker' );
	grunt.loadNpmTasks( 'grunt-eslint' );
	grunt.loadNpmTasks( 'grunt-jsonlint' );
	grunt.loadNpmTasks( 'grunt-stylelint' );

	grunt.initConfig( {
		less: {
			development: {
				options: {
					paths: [ 'modules' ],
					plugins: [
						new ( require( 'less-plugin-autoprefix' ) )( { browsers: [ 'last 2 versions' ] } )
					],
					compress: true
				},
				files: {
					'modules/ext.scryfallLinks.css': 'modules/ext.scryfallLinks.less'
				}
			}
		},
		eslint: {
			all: [
				'**/*.js',
				'!modules/tippy.js',
				'!modules/tippy.min.js',
				'!node_modules/**',
				'!vendor/**'
			]
		},
		stylelint: {
			options: {
				syntax: 'less'
			},
			all: [
				'**/*.{css,less}',
				'!modules/ext.scryfallLinks.css',
				'!modules/tippy.css',
				'!node_modules/**',
				'!vendor/**'
			]
		},
		banana: conf.MessagesDirs,
		jsonlint: {
			all: [
				'**/*.json',
				'!node_modules/**',
				'!vendor/**'
			]
		}
	} );

	grunt.registerTask( 'test', [ 'eslint', 'stylelint', 'jsonlint', 'banana' ] );
	grunt.registerTask( 'default', [ 'less', 'test' ] );
};
