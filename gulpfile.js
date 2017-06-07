var gulp        = require('gulp'),
    sass        = require('gulp-sass'),
    rename      = require('gulp-rename'),
    cleanCSS    = require('gulp-clean-css'),
    concat      = require('gulp-concat'),
    uglify      = require('gulp-uglify'),
    jshint      = require('gulp-jshint'),
    prefix      = require('gulp-autoprefixer'),
    browserSync = require('browser-sync'),
    reload      = browserSync.reload,
    htmlmin     = require('gulp-htmlmin'),
    size        = require('gulp-size'),
    imagemin    = require('gulp-imagemin'),
    pngquant    = require('imagemin-pngquant'),
    plumber     = require('gulp-plumber'),
    ghpages      = require('gulp-gh-pages'),
    notify      = require('gulp-notify'),
    sassLint    = require('gulp-sass-lint'),
    del         = require('del'),
    vinylPaths  = require('vinyl-paths'),
    sourcemaps  = require('gulp-sourcemaps'),
    colors      = require('colors'),
    sassdoc     = require('sassdoc'),
    runSequence = require('run-sequence'),
    svgSprite   = require('gulp-svg-sprite'),
    nunjucks    = require('gulp-nunjucks-render'),
    fs          = require('fs'),
    data        = require('gulp-data'),
    pug         = require('gulp-pug');

// PATHS
var bases = {
    app:    'src/',
    dist:   'dist/'
};
var sources = {
    svg:        bases.app + 'svg/',
    sprite:     bases.app + 'sprite/',
    pug:        bases.app + 'pug/',
    nunjucks:   bases.app + 'nunjucks/',
    data:       bases.app + 'data/'
};

// COLORS
colors.setTheme({
  silly:   'rainbow',
  input:   'grey',
  verbose: 'cyan',
  prompt:  'grey',
  info:    'green',
  data:    'grey',
  help:    'cyan',
  warn:    'yellow',
  debug:   'blue',
  error:   'red'
});

// ERRORS
var displayError = function(error) {
  var errorString = '[' + error.plugin.error.bold + ']';
  errorString += ' ' + error.message.replace("\n",'');
  if(error.fileName)
      errorString += ' in ' + error.fileName;
  if(error.lineNumber)
      errorString += ' on line ' + error.lineNumber.bold;
  console.error(errorString);
}
var onError = function(err) {
  notify.onError({
    title:    "Gulp",
    subtitle: "Failure!",
    message:  "Error: <%= error.message %>",
    sound:    "Basso"
  })(err);
  this.emit('end');
};

// OPTIONS
var sassOptions = {
  outputStyle: 'expanded'
};
var prefixerOptions = {
  browsers: ['last 2 versions']
};

// Clean
gulp.task('clean:dist', function() {
  return gulp.src(bases.dist)
    .pipe(vinylPaths(del));
});

// SVG Sprite
var configSVG = {
    mode: {
        symbol: {
            inline: true,
            dest: 'sprite',
            sprite: 'sprite.svg',
            example: true
        }
    },
    svg: {
        xmlDeclaration: false,
        doctypeDeclaration: false
    }
};
gulp.task('sprite', function() {
    return gulp.src(sources.svg + '**/*.svg')
        .pipe(svgSprite(configSVG))
        .pipe(gulp.dest(bases.app));
});
gulp.task('svg', ['sprite'],function() {
    return gulp.src(sources.sprite + 'sprite.svg')
        .pipe(gulp.dest(bases.dist + 'sprite'));
});

// Pug
gulp.task('pug', function () {
    return gulp.src(sources.pug + 'pages/*.pug')
        .pipe(pug({
            pretty: true
        }))
        .pipe(gulp.dest(bases.app));
});

// Nunjucks
gulp.task('nunjucks', function() {
  return gulp.src(sources.nunjucks + 'pages/*.+(html|nunjucks)')
    .pipe(plumber({errorHandler: onError}))
    .pipe(data(function() {
      return JSON.parse(fs.readFileSync(sources.data + 'data.json'))
    }))
    .pipe(nunjucks({
      path: [sources.nunjucks + 'templates'],
      watch: true,
    }))
    .pipe(gulp.dest(bases.app))
    .pipe(browserSync.reload({
      stream: true
    }))
});

// Styles
gulp.task('styles', function() {
  return gulp.src(bases.app + 'scss/styles.scss')
    .pipe(plumber({errorHandler: onError}))
    .pipe(sourcemaps.init())
    .pipe(sass(sassOptions))
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(prefix(prefixerOptions))
    .pipe(rename('styles.css'))
    .pipe(gulp.dest(bases.dist + 'css'))
    .pipe(reload({stream:true}))
    .pipe(cleanCSS({debug: true}, function(details) {
      console.log(details.name + ': ' + details.stats.originalSize);
      console.log(details.name + ': ' + details.stats.minifiedSize);
    }))
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(bases.dist + 'css'))
});

// Themes
gulp.task('themes', function() {
  return gulp.src(bases.app + 'scss/themes/*.scss')
    .pipe(plumber({errorHandler: onError}))
    .pipe(sourcemaps.init())
    .pipe(sass(sassOptions))
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(prefix(prefixerOptions))
    .pipe(gulp.dest(bases.dist + 'css/themes'))
    .pipe(reload({stream:true}))
    .pipe(cleanCSS({debug: true}, function(details) {
      console.log(details.name + ': ' + details.stats.originalSize);
      console.log(details.name + ': ' + details.stats.minifiedSize);
    }))
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(bases.dist + 'css/themes'))
});

// Browser Sync
gulp.task('browser-sync', function() {
  browserSync({
    server: {
      baseDir: bases.dist
    }
  });
});

// Deploy
var options = { 
    force: true
};
gulp.task('deploy', function() {
  return gulp.src(bases.dist + '**/*')
    .pipe(ghpages(options));
});

// JS
gulp.task('js-app', function() {
  gulp.src(bases.app + 'js/*.js')
    .pipe(uglify())
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(concat('app.js'))
    .pipe(gulp.dest(bases.dist + 'js'))
    .pipe(reload({stream:true}));
});
gulp.task('js-libs', function() {
  gulp.src([bases.app + 'js/libs/*.js', '!' + bases.app + 'js/libs/modernizr.js'])
    .pipe(uglify())
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(concat('libs.js'))
    .pipe(gulp.dest(bases.dist + 'js'))
    .pipe(reload({stream:true}));
});

// Copy
gulp.task('copy', function() {
  // copy modernizr to dist directly
  gulp.src(bases.app + 'js/libs/modernizr.js')
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(bases.dist + 'js/libs'))
    .pipe(reload({stream:true}));
  // copy icons to dist directly
  gulp.src(bases.app + 'icons/**/*.*')
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(bases.dist))
    .pipe(reload({stream:true}));
  // copy meta files to dist directly
  gulp.src([bases.app + '*.xml', bases.app + '*.txt'])
    .pipe(size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(bases.dist))
    .pipe(reload({stream:true}));

});

// Sass Lint
gulp.task('sass-lint', function() {
  gulp.src([bases.app + 'scss/**/*.scss', '!' + bases.app + 'scss/libs/**/*.scss', '!' + bases.app + 'scss/states/_print.scss'])
    .pipe(sassLint())
    .pipe(sassLint.format())
    .pipe(sassLint.failOnError());
});

// Minify HTML
gulp.task('minify-html', function() {
  gulp.src(bases.app + './*.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest(bases.dist))
    .pipe(reload({stream:true}));
});

// Gulp Watch
gulp.task('watch', function() {
    gulp.watch(bases.app + 'scss/**/*.scss', ['styles']);
    gulp.watch(bases.app + './*.html', ['minify-html']);
    gulp.watch(bases.app + 'img/*', ['imagemin']);
    gulp.watch(sources.svg + '*.svg', ['svg']);
    gulp.watch(sources.pug + '**/*.pug', ['pug']);
    gulp.watch(sources.nunjucks + '**/*', ['nunjucks']);
});

// Minify Images
gulp.task('imagemin', function() {
  return gulp.src(bases.app + 'img/*')
    .pipe(imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use: [pngquant()]
    }))
    .pipe(gulp.dest(bases.dist + 'img'));
});

// Sassdoc
gulp.task('sassdoc', function () {
  var options = {
     dest: 'docs',
     verbose: true,
     display: {
       access: ['public', 'private'],
       alias: true,
       watermark: true,
     },
     groups: {
       'undefined': 'Ungrouped',
     },
     basePath: 'https://github.com/SassDoc/sassdoc',
   };
  return gulp.src(bases.app + 'scss/**/*.scss')
    .pipe(sassdoc(options));
});

// BUILD TASKS
// ------------
gulp.task('default', function(done) {
  runSequence('clean:dist', 'browser-sync', 'js-app', 'js-libs', 'imagemin', 'pug', 'nunjucks', 'minify-html', 'styles', 'themes', 'copy', 'watch', done);
});
gulp.task('build', function(done) {
  runSequence('clean:dist', 'js-app', 'js-libs', 'imagemin', 'pug', 'nunjucks', 'minify-html', 'svg', 'styles', 'copy', done);
});