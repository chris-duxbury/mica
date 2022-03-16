var gulp = require('gulp');
var gutil = require('gulp-util');
var autoprefixer = require('gulp-autoprefixer');
var minifyCss = require('gulp-minify-css');
var connect = require('connect');
var http = require('http');
var livereload = require('gulp-livereload');
var open = require('open');
var sass = require('gulp-sass');
var fileinclude = require('gulp-file-include');
var rename = require('gulp-rename');
var serveStatic = require('serve-static');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var transform = require('vinyl-transform');
var buffer = require('vinyl-buffer');
var del = require('del');
var useref = require('gulp-useref');
var uglify = require('gulp-uglify');
var gulpif = require('gulp-if');
var htmlmin = require('gulp-htmlmin');
var lazypipe = require('lazypipe');
var sourcemaps = require('gulp-sourcemaps');
var filter = require('gulp-filter');
var debug = require('gulp-debug');
var rev = require('gulp-rev');
var revReplace = require('gulp-rev-replace');
var webkitAssign = require('webkit-assign/gulp');

var BUILD_FOLDER = 'dist/';
var TMP_FOLDER = '.tmp/'
var app = connect().use(serveStatic(__dirname + '/' + BUILD_FOLDER));

var options = {
  'port': 8000,
  'host': 'localhost',
  'scssPath': './scss/',
  'iconsPath': ['./icons/*.png', './img/*.png'],
  'fontsPath': ['./fonts/**/*.ttf', './fonts/**/*.woff'],
  'soundsPath': ['./snd/*.mp3'],
  'partialsPath': './partials/*.html',
  'coverageApp': "./js/coverage_calculator/",
  'angular': './lib/angular/angular.min.js',
  'production': !!gutil.env.production,
        // variable for checking if production flag is passed
        // i.e. gulp --production
  'dist': './' + BUILD_FOLDER,
  'tmp': './' + TMP_FOLDER
};

var minify_css = lazypipe()
    .pipe(function() {
      return gulpif(options.production, minifyCss());
    })
var uglify_js = lazypipe()
    // .pipe(rename, {'dirname': "js/"})
    .pipe(function() {
      return gulpif(options.production, uglify({
        'preserveComments': 'some'
      }));
    });


// Pipe for including the partials into source.html
var partials = lazypipe()
    .pipe(fileinclude, {prefix: '@@', basepath: '@file'});

// Pipe for writing out the sourcemaps for debugging
var write_sourcemaps = lazypipe()
    .pipe(function() {
      var srcmapsOption = {includeContent: true};
      return gulpif(!options.production, sourcemaps.write(".", srcmapsOption));
    })

// Pipe to initialize the sourcemaps
var srcmaps_init = lazypipe().pipe(sourcemaps.init, {loadMaps: true});


//////////////////////////////////////////////////////////////////////////////////////
// Gulp Task
//////////////////////////////////////////////////////////////////////////////////////

// Process all scss to css files
gulp.task('scss', function() {
  return gulp.src(options.scssPath + '**/**/*.scss')
    .pipe(sass({
      errLogToConsole: true
    }))
    .pipe(autoprefixer())
    .pipe(gulpif(options.production, minifyCss()))
    .pipe(gulp.dest(options.tmp + 'css'))
});

// Combine the css files listed in the source.html into one css file
gulp.task('css', ['scss'], function() {

  var assets = useref.assets({
                searchPath: [options.tmp, "./"]
              },srcmaps_init );

  var cssFilter = filter('**/*.css');
  return gulp.src('./source.html')
    .pipe(assets)
    .pipe(cssFilter)
    .pipe(minify_css())
    .pipe(gulpif(options.production, rev()))
    .pipe(write_sourcemaps())
    .pipe(useref())
    .pipe(gulpif(options.production, revReplace()))
    .pipe(gulp.dest(options.dist))
    .pipe(livereload());
});

// Build the coverage app and bundle it into ./js/coverageApp.js
gulp.task('browserify', function() {
  var b = browserify({
    entries:options.coverageApp + 'heatmapGenerator.js',
    standalone: "Heatmap",
    debug: !options.production
  });

  return b.bundle()
      .pipe(source('coverageApp.js'))
      .pipe(buffer())
      .pipe(gulp.dest('./js'))
});

// Combine all the js files listed in the source.html into one js file
gulp.task('js', function() {
  var assets = useref.assets({
                searchPath: [options.tmp, "./"]
              },srcmaps_init );

  var jsFilter = filter('**/*.js');
  return gulp.src('./source.html')
    .pipe(assets)
    .pipe(jsFilter)
    .pipe(uglify_js())
    .pipe(gulpif(options.production, rev()))
    .pipe(write_sourcemaps())
    .pipe(useref())
    .pipe(gulpif(options.production, revReplace()))
    .pipe(gulp.dest(options.dist))
    .pipe(livereload());
});

// Make the html compact by using one file link for js and css
// Also include the partials into source.html
gulp.task('html', ['scss'], function() {
  var assets = useref.assets({ noconcat: false,
                searchPath: [options.tmp, "./"]
              },srcmaps_init );

  var src = partials();

  var html_min = lazypipe()
      .pipe(function() {
        return gulpif(options.production, htmlmin({
          collapseWhitespace: true,
          conservativeCollapse: true,
          collapseBooleanAttributes: true,
          removeCommentsFromCDATA: true,
          removeOptionalTags: true
        }));
      })

  return gulp.src('./source.html')
    .pipe(partials())
    .pipe(rename('index.html'))
    .pipe(assets)
    .pipe(gulpif('**/*.css', minify_css()))
    .pipe(gulpif('**/*.js', uglify_js()))
    .pipe(gulpif(options.production, rev()))
    .pipe(write_sourcemaps())
    .pipe(assets.restore())
    .pipe(useref())
    .pipe(gulpif('*.html', html_min()))
    .pipe(gulpif(options.production, revReplace()))
    .pipe(gulp.dest(options.dist))
    .pipe(livereload());
});

// Move task
gulp.task('move:partials', function() {
  return gulp.src(options.partialsPath, {base: '.'})
      .pipe(gulp.dest(options.dist));
});
gulp.task('move:fonts', function() {
  return gulp.src(options.fontsPath, {base: '.'})
      .pipe(gulp.dest(options.dist));
});
gulp.task('move:icons', function() {
  return gulp.src(options.iconsPath, {base: '.'})
      .pipe(gulp.dest(options.dist));
});
gulp.task('move:sounds', function() {
  return gulp.src(options.soundsPath, {base: '.'})
      .pipe(gulp.dest(options.dist));
});
gulp.task('move:angular', function() {
  return gulp.src(options.angular, {base: '.'})
      .pipe(webkitAssign())
      // ^ Rewrites dot notation as bracket notion in Angular source, to make app work
      // on iOS 8.4.0 / Safari. See https://github.com/angular/angular.js/issues/9128
      .pipe(gulp.dest(options.dist));
});

// Create server that host the webui
gulp.task('connect', function () {
  http.createServer(app).listen(options.port);
});

// Open webui on the browser
gulp.task('open-browser', ['build', 'connect'], function() {
  open('http://' + options.host + ':' + options.port);
});

// Clean dist and tmp folder
gulp.task('clean', function(done) {
  del(['dist', './.tmp'], done);
});

// watch for change
gulp.task('watch', function() {
  livereload.listen();
  gulp.watch(options.scssPath + '*.scss', ['css']);
  gulp.watch(options.scssPath + '**/**/*.scss', ['css']);
  gulp.watch('./js/*.js', ['js']);
  gulp.watch(options.coverageApp + '*.js', ['browserify']);
  gulp.watch(['./source.html', './partials/*.html'], ['html', 'move:partials', 'move:angular']);
});

// Build the webui app
gulp.task('build', ['browserify','html', 'move:angular', 'move:partials', 'move:fonts', 'move:icons', 'move:sounds']);

// Clean and then build
// Note: since gulp run these tasks in parallel, it's better to run clean
//separately to make sure no race happen
gulp.task('build-clean', ['clean', 'build']);

// build the coverage app
gulp.task('build-coverageCalculator', function() {
  var c = coverage_app();
  return c.pipe(gulp.dest('./js/'));
});

gulp.task('default', ['connect', 'build', 'watch']);
gulp.task('start', ['open-browser', 'default']);

// gulp.task('practice', function() {
//   var assets = useref.assets({'noconcat': true});

//     return gulp.src('source.html')
//         .pipe(assets)
//         .pipe(assets.restore())
//         .pipe(useref())
//         .pipe(gulp.dest('gatai'));
// })
