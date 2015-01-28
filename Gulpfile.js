var gulp = require('gulp');
var browserify = require('gulp-browserify');
// Edit this values to best suit your app
var WEB_PORT = 9000;
var APP_DIR = 'app';
var run = require('gulp-run');
var nodemon = require('gulp-nodemon');
var livereload = require('gulp-livereload');
var path = require('path');
var react = require('gulp-react');
var sourcemaps = require('gulp-sourcemaps');
var traceur = require('gulp-traceur');
var nodemon = require('gulp-nodemon')

/*
 * Tthings that must happen
 *  - compile all js files in src/web into build/web
 *    * run it through flow and jsx : sweet fat arrow lambdas n generators brah
 *    * run node webkit
*/
gulp.task('scripts', function() {
  return gulp.src('./src/**/*.js')
    .pipe(react({harmony: true}))
    .pipe(sourcemaps.init())
    .pipe(traceur())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./build'));
});

gulp.task('serve', function() {
  nodemon({ 
    script: path.join(__dirname, 'build', 'node', 'index.js'), 
    ext: 'html js',
    watch: [path.join(__dirname, 'build', 'node'), path.join(__dirname, 'views')],
    ignore: ['ignored.js'] })
  .on('restart', function () {
    console.log('restarted!')
  });
});

gulp.task('default', function() {
  livereload.listen();
  gulp.run('serve');
  gulp.watch('./src/**/*.js',['scripts']);
  
});

