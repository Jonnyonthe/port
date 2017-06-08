var a_pp        = require('adaptive-pixel-perfect').create(),
    browserSync = require('browser-sync').create(),
    colors      = require('colors'),
    del         = require('del'),
    fs          = require('fs'),
    gulp        = require('gulp');
    glp         = require('gulp-load-plugins')();
    pngquant    = require('imagemin-pngquant'),
    reload      = browserSync.reload,
    runSequence = require('run-sequence'),
    sassdoc     = require('sassdoc'),
    vinylPaths  = require('vinyl-paths');

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

// A_PP
var port = 3010,
    folderForDesignScreenshots = 'design',
    portForBrowserSync = 3000;

gulp.task('a_pp', function() {
    a_pp.start(port, folderForDesignScreenshots, portForBrowserSync);
});

// ERRORS
var displayError = function(error) {
  var errorString = '[' + error.plugin.error.bold + ']';
  errorString += ' ' + error.message.replace('\n','');
  if(error.fileName)
      errorString += ' in ' + error.fileName;
  if(error.lineNumber)
      errorString += ' on line ' + error.lineNumber.bold;
  console.error(errorString);
}
var onError = function(err) {
  notify.onError({
    title:    'Gulp',
    subtitle: 'Failure!',
    message:  'Error: <%= error.message %>',
    sound:    'Basso'
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
        .pipe(glp.svgSprite(configSVG))
        .pipe(gulp.dest(bases.app));
});
gulp.task('svg', ['sprite'],function() {
    return gulp.src(sources.sprite + 'sprite.svg')
        .pipe(gulp.dest(bases.dist + 'sprite'));
});

// Pug
gulp.task('pug', function () {
    return gulp.src(sources.pug + 'pages/*.pug')
        .pipe(glp.pug({
            pretty: true
        }))
        .pipe(gulp.dest(bases.app));
});

// Nunjucks
gulp.task('nunjucks', function() {
  return gulp.src(sources.nunjucks + 'pages/*.+(html|nunjucks)')
    .pipe(glp.plumber({errorHandler: onError}))
    .pipe(glp.data(function() {
      return JSON.parse(fs.readFileSync(sources.data + 'data.json'))
    }))
    .pipe(glp.nunjucksRender({
      path: [sources.nunjucks + 'templates'],
      watch: true,
    }))
    .pipe(gulp.dest(bases.app))
    .pipe(reload({stream:true}))
});

// Styles
gulp.task('styles', function() {
  return gulp.src(bases.app + 'scss/styles.scss')
    .pipe(glp.plumber({errorHandler: onError}))
    .pipe(glp.sourcemaps.init())
    .pipe(glp.sass(sassOptions))
    .pipe(glp.size({ gzip: true, showFiles: true }))
    .pipe(glp.autoprefixer(prefixerOptions))
    .pipe(glp.rename('styles.css'))
    .pipe(gulp.dest(bases.dist + 'css'))
    .pipe(reload({stream:true}))
    .pipe(glp.cleanCss({debug: true}, function(details) {
      console.log(details.name + ': ' + details.stats.originalSize);
      console.log(details.name + ': ' + details.stats.minifiedSize);
    }))
    .pipe(glp.size({ gzip: true, showFiles: true }))
    .pipe(glp.rename({ suffix: '.min' }))
    .pipe(gulp.dest(bases.dist + 'css'))
    .on('end', a_pp.endStyleTask);
});

// Themes
gulp.task('themes', function() {
  return gulp.src(bases.app + 'scss/themes/*.scss')
    .pipe(glp.plumber({errorHandler: onError}))
    .pipe(glp.sourcemaps.init())
    .pipe(glp.sass(sassOptions))
    .pipe(glp.size({ gzip: true, showFiles: true }))
    .pipe(glp.autoprefixer(prefixerOptions))
    .pipe(gulp.dest(bases.dist + 'css/themes'))
    .pipe(reload({stream:true}))
    .pipe(glp.cleanCss({debug: true}, function(details) {
      console.log(details.name + ': ' + details.stats.originalSize);
      console.log(details.name + ': ' + details.stats.minifiedSize);
    }))
    .pipe(glp.size({ gzip: true, showFiles: true }))
    .pipe(glp.rename({ suffix: '.min' }))
    .pipe(gulp.dest(bases.dist + 'css/themes'))
    .on('end', a_pp.endStyleTask);
});

// Browser Sync
gulp.task('browser-sync', function() {
    browserSync.init({
        server: bases.dist,
        cors: true,
        middleware: function (req, res, next) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            next();
        },
        socket: {
            domain: 'localhost:' + portForBrowserSync
        },
        scriptPath: function (path, port, options) {
            return 'http://' + options.getIn(['socket', 'domain']) + path;
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
    .pipe(glp.uglify())
    .pipe(glp.size({ gzip: true, showFiles: true }))
    .pipe(glp.concat('app.js'))
    .pipe(gulp.dest(bases.dist + 'js'))
    .pipe(reload({stream:true}));
});
gulp.task('js-libs', function() {
  gulp.src([bases.app + 'js/libs/*.js', '!' + bases.app + 'js/libs/modernizr.js'])
    .pipe(glp.uglify())
    .pipe(glp.size({ gzip: true, showFiles: true }))
    .pipe(glp.concat('libs.js'))
    .pipe(gulp.dest(bases.dist + 'js'))
    .pipe(reload({stream:true}));
});

// Copy
gulp.task('copy', function() {
  // copy modernizr to dist directly
  gulp.src(bases.app + 'js/libs/modernizr.js')
    .pipe(glp.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(bases.dist + 'js/libs'))
    .pipe(reload({stream:true}));
  // copy icons to dist directly
  gulp.src(bases.app + 'icons/**/*.*')
    .pipe(glp.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(bases.dist))
    .pipe(reload({stream:true}));
  // copy meta files to dist directly
  gulp.src([bases.app + '*.xml', bases.app + '*.txt'])
    .pipe(glp.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(bases.dist))
    .pipe(reload({stream:true}));

});

// Sass Lint
gulp.task('sass-lint', function() {
  gulp.src([bases.app + 'scss/**/*.scss', '!' + bases.app + 'scss/libs/**/*.scss', '!' + bases.app + 'scss/states/_print.scss'])
    .pipe(glp.sassLint())
    .pipe(glp.sassLint.format())
    .pipe(glp.sassLint.failOnError());
});

// Minify HTML
gulp.task('minify-html', function() {
  gulp.src(bases.app + './*.html')
    .pipe(glp.htmlmin({collapseWhitespace: true}))
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
    gulp.watch(bases.app + 'scss/**/*.scss')
        .on('change', function(event) {
            a_pp.changeStyle({
                filepath: event.path,
                runTask: function() {
                    gulp.start('styles');
                }
            });
        });
});

// Minify Images
gulp.task('imagemin', function() {
  return gulp.src(bases.app + 'img/*')
    .pipe(glp.imagemin({
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