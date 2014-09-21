var gulp = require('gulp');
var jshint = require('gulp-jshint');
var connect = require('connect');
var browserify = require('gulp-browserify');
// Edit this values to best suit your app
var WEB_PORT = 9000;
var APP_DIR = 'app';

// jshint files
gulp.task('jshint', function() {
    gulp.src(['test/**/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter());
});

// Basic usage
gulp.task('scripts', function() {
    // Single entry point to browserify
    gulp.src('src/web/hello.js')
        .pipe(browserify({
          insertGlobals : true,
          debug : !gulp.env.production
        }))
        .pipe(gulp.dest('./build/web'))
});


gulp.task('default', function() {
    gulp.run('scripts');
});

