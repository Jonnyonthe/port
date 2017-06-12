var $           = require('gulp-load-plugins')(),
    sync        = require('browser-sync').create(),
    colors      = require('colors'),
    del         = require('del'),
    fs          = require('fs'),
    gulp        = require('gulp'),
    pngquant    = require('imagemin-pngquant');

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
function clean() {
  return del([ 'dist' ]);
}

// Copy
function copy() {
    return gulp.src([bases.app + '*.xml', bases.app + '*.txt', bases.app + 'icons/**/*.*'])
        .pipe($.size({ gzip: true, showFiles: true }))
        .pipe(gulp.dest(bases.dist))
}

// gh-pages
function ghPages() {
  return gulp.src(bases.dist + '**/*')
    .pipe($.ghPages(options));
}

// IMAGES
// ==================================================================

// Retina Image  Generation
function images() {
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
}

// Srcset Injection
function views() {
  return gulp.src(bases.dist + '**/*.html')
    .pipe($.imgRetina(options.retinaOpts))
    .on('error', function(e) {
      console.log(e.message);
    })
    .pipe(gulp.dest('./build'));
}

// SVG Sprite
function sprite() {
    return gulp.src(sources.svg + '**/*.svg')
        .pipe($.svgSprite(configSVG))
        .pipe(gulp.dest(bases.app));
}
function svg() {
    return gulp.src(sources.sprite + 'sprite.svg')
        .pipe(gulp.dest(bases.dist + 'sprite'));
}

// Minify Images
function imagemin() {
  return gulp.src(bases.app + 'img/*')
    .pipe($.imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use: [pngquant()]
    }))
    .pipe(gulp.dest(bases.dist + 'img'));
}

// HTML
// ==================================================================

// Compile Pug Templates
function pug() {
    return gulp.src(sources.pug + 'pages/*.pug')
        .pipe($.pug({
            pretty: true
        }))
        .pipe(gulp.dest(bases.app))
}

// Compile Nunjucks Templates
function nunjucks() {
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
    .pipe(sync.stream());
}

// Minify HTML
function minifyHtml() {
  return gulp.src(bases.app + './*.html')
    .pipe($.htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest(bases.dist))
    .pipe(sync.stream());
}

// SASS
// ==================================================================

// Compile Sass
function styles() {
  return gulp.src(bases.app + 'scss/styles.scss')
    .pipe($.plumber())
    .pipe($.if(options.sourceMaps, $.sourcemaps.init()))
    .pipe($.sass(options.sass))
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe($.autoprefixer(options.prefix))
    .pipe($.rename('styles.css'))
    .pipe(gulp.dest(bases.dist + 'css'))
    .pipe(options.production ? $.cleanCss({debug: true}, function(details) {
      console.log(details.name + ': ' + details.stats.originalSize);
      console.log(details.name + ': ' + details.stats.minifiedSize);
    }) : $.util.noop())
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe($.rename({ suffix: '.min' }))
    .pipe($.if(options.sourceMaps, $.sourcemaps.write()))
    .pipe(gulp.dest(bases.dist + 'css'))
    .pipe(sync.stream())
}

// SCRIPTS
// ==================================================================

function scripts() {
  return gulp.src(bases.app + 'js/*.js')
    .pipe($.uglify())
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe($.concat('app.js'))
    .pipe(gulp.dest(bases.dist + 'js'))
    .pipe(sync.stream());
}

function jsLibs() {
  return gulp.src([bases.app + 'js/libs/*.js', '!' + bases.app + 'js/libs/modernizr.js'])
    .pipe($.uglify())
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe($.concat('libs.js'))
    .pipe(gulp.dest(bases.dist + 'js'))
    .pipe(sync.stream());
}

// SERVER
// ==================================================================

function bs() {
    return sync.init({
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
}

gulp.task('watch', function(done) {
    gulp.watch(bases.app + 'js/**/*.js').on('change', gulp.series(scripts, jsLibs, sync.reload));
    gulp.watch(bases.app + 'scss/**/*.scss', styles);
    gulp.watch(bases.app + './*.html').on('change', gulp.series(minifyHtml, sync.reload));
    gulp.watch(bases.app + 'img/*').on('change', gulp.series(images, sync.reload));
    gulp.watch(sources.svg + '*.svg').on('change', gulp.series(svg, sync.reload));
    gulp.watch(sources.pug + '**/*.pug').on('change', gulp.series(pug, minifyHtml, sync.reload));
    gulp.watch(sources.nunjucks + '**/*').on('change', gulp.series(nunjucks, minifyHtml, sync.reload));
});

// TASKS
// ==================================================================

gulp.task('default',
    gulp.series(
        clean,
        gulp.parallel(scripts, jsLibs, imagemin, pug, nunjucks, styles), 
        minifyHtml, svg, copy,
        gulp.parallel(bs, 'watch')
    )
);

gulp.task('build',
    gulp.series(
        clean,
        gulp.parallel(scripts, jsLibs, imagemin, pug, nunjucks, styles),
        minifyHtml, svg, copy
    )
);

gulp.task('deploy', ghPages);