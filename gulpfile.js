var gulp       = require('gulp');
var util       = require('gulp-util');
var browserify = require('browserify');
var reactify   = require('reactify');
var source     = require('vinyl-source-stream');

function errorHandler (err) {
  util.log(util.colors.red('Error'), err.message);
}

gulp.task('build', function() {
  browserify({
    entries: [ './jsx/app.jsx' ],
    transform: [reactify]
  })
  .bundle()
  .on('error', errorHandler)
  .pipe(source('app.js'))
  .pipe(gulp.dest('./public/js'));
});

gulp.task('watch', function () {
  gulp.watch(['./jsx/**/*.jsx'], ['build']);
});

gulp.task('default', ['build', 'watch']);
