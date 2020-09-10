const { src, dest, parallel, series, watch } = require('gulp')

const del = require('del')
const browserSync = require('browser-sync')

const loadPlugins = require('gulp-load-plugins')

const plugins = loadPlugins()
const bs = browserSync.create()
// 返回你当前命令行所在的工作目录
const cwd = process.cwd()
let confg = {
  // default config
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}

try {
  const loadConfg = require(`${cwd}/pages.cong.js`)
  confg = Object.assign({}, confg, loadConfg)
}catch (e) {

}


const clean = () => {
  return del([ confg.build.dist , confg.build.temp])
}

const style = () => {
  return src(confg.build.paths.styles, { base: confg.build.src, cwd: confg.build.src })
    .pipe(plugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest(confg.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const script = () => {
  return src(confg.build.paths.scripts, { base: confg.build.src, cwd: confg.build.src })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(confg.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const page = () => {
  return src(confg.build.paths.pages, { base: confg.build.src, cwd: confg.build.src })
    .pipe(plugins.swig({ data: confg.data, defaults: { cache: false } })) // 防止模板缓存导致页面不能及时更新
    .pipe(dest(confg.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const image = () => {
  return src(confg.build.paths.images, { base: confg.build.src, cwd: confg.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(confg.build.dist))
}

const font = () => {
  return src(confg.build.paths.fonts, { base: confg.build.src, cwd: confg.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(confg.build.dist))
}

const extra = () => {
  return src('**', { base: confg.build.public, cwd: confg.build.public })
    .pipe(dest(confg.build.dist))
}

const serve = () => {
  watch(confg.build.paths.styles, { cwd: confg.build.src }, style)
  watch(confg.build.paths.scripts, { cwd: confg.build.src },script)
  watch(confg.build.paths.pages, { cwd: confg.build.src }, page)
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)
  watch([
    confg.build.paths.images,
    confg.build.paths.fonts,
  ], { cwd: confg.build.src }, bs.reload)
  watch('**', { cwd: confg.build.public }, bs.reload) // /public/** 目录下的文件

  bs.init({
    notify: false,
    port: 2080,
    // open: false,
    // files: 'dist/**',
    server: {
      baseDir: [confg.build.temp, confg.build.src, confg.build.public],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

const useref = () => {
  return src( confg.build.paths.pages, { base: confg.build.temp, cwd: confg.build.temp })
    .pipe(plugins.useref({ searchPath: [confg.build.temp, '.'] }))
    // html js css
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest(confg.build.dist))
}

const compile = parallel(style, script, page)

// 上线之前执行的任务
const build =  series(
  clean,
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  )
)

const develop = series(compile, serve)

module.exports = {
  clean,
  build,
  develop
}
