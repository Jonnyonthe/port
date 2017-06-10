var $           = require('gulp-load-plugins')(),
    a_pp        = require('adaptive-pixel-perfect').create(),
    browserSync = require('browser-sync').create(),
    colors      = require('colors'),
    del         = require('del'),
    fs          = require('fs'),
    gulp        = require('gulp'),
    pngquant    = require('imagemin-pngquant'),
    reload      = browserSync.reload,
    runSequence = require('run-sequence'),
    vinylPaths  = require('vinyl-paths');

// CONFIG
// ==================================================================

var bases = {
      app:    'src/',
      dist:   'dist/'
    },
    sources = {
        svg:        bases.app + 'svg/',
        sprite:     bases.app + 'sprite/',
        pug:        bases.app + 'pug/',
        nunjucks:   bases.app + 'nunjucks/',
        data:       bases.app + 'data/',
        img:        bases.app + 'img/'
    },
    options = {
        production: !!$.util.env.production,
        sourceMaps: !$.util.env.production,
        sass: { outputStyle: 'expanded' },
        prefix: { browsers: ['last 2 versions'] },
        retinaOpts: { 1: '', 2: '@2x', 3: '@3x' }
    },
    configSVG = {
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
    },
    server = {
        port: 3010,
        folderForDesignScreenshots: 'design',
        portForBrowserSync: 3000
    };

// UTILS
// ==================================================================

// Clean
gulp.task('clean:dist', function() {
  return gulp.src(bases.dist)
    .pipe(vinylPaths(del));
});

// Copy
gulp.task('copy', function() {
  // copy modernizr to dist directly
  gulp.src(bases.app + 'js/libs/modernizr.js')
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(bases.dist + 'js/libs'))
    .pipe(reload({stream:true}));
  // copy icons to dist directly
  gulp.src(bases.app + 'icons/**/*.*')
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(bases.dist))
    .pipe(reload({stream:true}));
  // copy meta files to dist directly
  gulp.src([bases.app + '*.xml', bases.app + '*.txt'])
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(bases.dist))
    .pipe(reload({stream:true}));

});

// gh-pages
gulp.task('ghpages', function() {
  return gulp.src(bases.dist + '**/*')
    .pipe($.ghPages(options));
});

// Adaptive Pixel Perfect
gulp.task('a_pp', function() {
    a_pp.start(server.port, server.folderForDesignScreenshots, server.portForBrowserSync);
});

// IMAGES
// ==================================================================

// Retina Image  Generation
gulp.task('images', function () {
  return gulp.src(sources.img + '*.png')
    .pipe($.responsive({
      '*.png': [{
        width: 300, rename: { suffix: '-300px', extname: '.jpg' },
        format: 'jpeg'
      }, {
        width: 600, rename: { suffix: '-600px', extname: '.jpg' }
      }, {
        width: 1900, rename: { suffix: '-1900px', extname: '.jpg' },
        withoutEnlargement: true
      }, {
        width: 630,
        rename: { suffix: '-630px', extname: '.webp' }
      }],
    }, {
      quality: 80,
      progressive: true,
      withMetadata: false,
      errorOnEnlargement: false
    }))
    .pipe(gulp.dest('dist'));
})

// Srcset Injection
gulp.task('views', function() {
  return gulp.src(bases.dist + '**/*.html')
    .pipe($.imgRetina(options.retinaOpts))
    .on('error', function(e) {
      console.log(e.message);
    })
    .pipe(gulp.dest('./build'));
});

// SVG Sprite
gulp.task('sprite', function() {
    return gulp.src(sources.svg + '**/*.svg')
        .pipe($.svgSprite(configSVG))
        .pipe(gulp.dest(bases.app));
});
gulp.task('svg', ['sprite'],function() {
    return gulp.src(sources.sprite + 'sprite.svg')
        .pipe(gulp.dest(bases.dist + 'sprite'));
});

// Minify Images
gulp.task('imagemin', function() {
  return gulp.src(bases.app + 'img/*')
    .pipe($.imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use: [pngquant()]
    }))
    .pipe(gulp.dest(bases.dist + 'img'));
});

// HTML
// ==================================================================

// Compile Pug Templates
gulp.task('pug', function () {
    return gulp.src(sources.pug + 'pages/*.pug')
        .pipe($.pug({
            pretty: true
        }))
        .pipe(gulp.dest(bases.app));
});

// Compile Nunjucks Templates
gulp.task('nunjucks', function() {
  return gulp.src(sources.nunjucks + 'pages/*.+(html|nunjucks)')
    .pipe($.plumber())
    .pipe($.data(function() {
      return JSON.parse(fs.readFileSync(sources.data + 'data.json'))
    }))
    .pipe($.nunjucksRender({
      path: [sources.nunjucks + 'templates'],
      watch: true,
    }))
    .pipe(gulp.dest(bases.app))
    .pipe(reload({stream:true}))
});

// Minify HTML
gulp.task('minify-html', function() {
  gulp.src(bases.app + './*.html')
    .pipe($.htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest(bases.dist))
    .pipe(reload({stream:true}));
});

// SASS
// ==================================================================

// Compile Sass
gulp.task('styles', function() {
  return gulp.src(bases.app + 'scss/styles.scss')
    .pipe($.plumber())
    .pipe($.if(options.sourceMaps, $.sourcemaps.init()))
    .pipe($.sass(options.sass))
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe($.autoprefixer(options.prefix))
    .pipe($.rename('styles.css'))
    .pipe(gulp.dest(bases.dist + 'css'))
    .pipe(reload({stream:true}))
    .pipe(options.production ? $.cleanCss({debug: true}, function(details) {
      console.log(details.name + ': ' + details.stats.originalSize);
      console.log(details.name + ': ' + details.stats.minifiedSize);
    }) : $.util.noop())
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe($.rename({ suffix: '.min' }))
    .pipe($.if(options.sourceMaps, $.sourcemaps.write()))
    .pipe(gulp.dest(bases.dist + 'css'))
    .on('end', a_pp.endStyleTask);
});

// SCRIPTS
// ==================================================================

gulp.task('js-app', function() {
  gulp.src(bases.app + 'js/*.js')
    .pipe($.uglify())
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe($.concat('app.js'))
    .pipe(gulp.dest(bases.dist + 'js'))
    .pipe(reload({stream:true}));
});

gulp.task('js-libs', function() {
  gulp.src([bases.app + 'js/libs/*.js', '!' + bases.app + 'js/libs/modernizr.js'])
    .pipe($.uglify())
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe($.concat('libs.js'))
    .pipe(gulp.dest(bases.dist + 'js'))
    .pipe(reload({stream:true}));
});

// SERVER
// ==================================================================

gulp.task('browser-sync', function() {
    browserSync.init({
        server: bases.dist,
        cors: true,
        middleware: function (req, res, next) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            next();
        },
        socket: {
            domain: 'localhost:' + server.portForBrowserSync
        },
        scriptPath: function (path, port, options) {
            return 'http://' + options.getIn(['socket', 'domain']) + path;
        }
    });
});

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

// SEQUENCE
// ==================================================================

gulp.task('default', function(done) {
  runSequence('clean:dist', 'browser-sync', 'js-app', 'js-libs', 'imagemin', 'pug', 'nunjucks', 'minify-html', 'styles', 'copy', 'watch', done);
});
gulp.task('build', function(done) {
  runSequence('clean:dist', 'js-app', 'js-libs', 'imagemin', 'pug', 'nunjucks', 'minify-html', 'svg', 'styles', 'copy', done);
});