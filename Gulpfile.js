var gulp = require('gulp');
var browserify = require('gulp-browserify');
// Edit this values to best suit your app
var WEB_PORT = 9000;
var APP_DIR = 'app';
var run = require('gulp-run');
/*
 * Tthings that must happen
 *  - compile all js files in src/web into build/web
 *    * run it through flow and jsx : sweet fat arrow lambdas n generators brah
 *    * run node webkit
*/
gulp.task('scripts', function() {

});

gulp.task('default', function() {
  run('npm start').exec();
  gulp.watch('./src/**/*.js',['scripts']);
  
});

