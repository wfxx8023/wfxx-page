const {src, dest, parallel, series, watch} = require("gulp")

const browserSync = require("browser-sync")

const del = require("del")

// 自动加载插件
const loadPlugins = require("gulp-load-plugins")
const plugins = loadPlugins()
// 自动创建开发服务器
const bs = browserSync.create()

const cwd = process.cwd() // 获取项目工作目录
let config = {
	build : {
		src : "src",
		dist : "dist",
		temp : "temp",
		public : "public",
		paths : {
			styles : "assets/styles/*.scss",
			scripts : "assets/scripts/*.js",
			pages : "*.html",
			images : "assets/images/**",
			fonts : "assets/fonts/**"
		}
	}
}
try{
	const loadConfg = require(`${cwd}/pages.config.js`)
	config = Object.assign({}, config, loadConfg)
}catch (e){
}

const clean = () => {
	return del([config.build.dist, config.build.temp])
}
// sass样式处理
const style = () => {
	return src(config.build.paths.styles, {base : config.build.src, cwd : config.build.src}) //{base: "src"}保留原来路径，可以不写
		.pipe(plugins.sass({outputStyle : "expanded"})) // sass模块不会转换下划线开头的文件，因为他会以为是系统依赖的文件，不会去处理，{outputStyle:"expanded"}参数是是使编译后的css括号展开
		.pipe(dest(config.build.temp))
		.pipe(bs.reload({stream : true}))
}
// es6 js处理
const script = () => {
	return src(config.build.paths.scripts, {base : config.build.src, cwd : config.build.src})
		.pipe(plugins.babel({presets : [require("@babel/preset-env")]}))
		.pipe(dest(config.build.temp))
		.pipe(bs.reload({stream : true}))
}
// 页面处理
const page = () => {
	// src/**/*.html 匹配src下所有目录中html文件
	return src(config.build.paths.pages, {base : config.build.src, cwd : config.build.src})
		.pipe(plugins.swig({config, defaults : {cache : false}}))// 防止模板缓存导致页面不能及时更新
		.pipe(dest(config.build.temp))
		.pipe(bs.reload({stream : true}))
}

// 图片转换压缩
const image = () => {
	return src(config.build.paths.images, {base : config.build.src, cwd : config.build.src})
		.pipe(plugins.imagemin())
		.pipe(dest(config.build.dist))
}
// 字体文件处理
const font = () => {
	return src(config.build.paths.fonts, {base : config.build.src, cwd : config.build.src})
		.pipe(plugins.imagemin())
		.pipe(dest(config.build.dist))
}
// 其他文件处理
const extra = () => {
	return src("**", {base : config.build.public, cwd : config.build.public})
		.pipe(dest(config.build.dist))
}

// 定义开发服服务器任务
const serve = () => {
	watch(config.build.paths.styles, {cwd : config.build.src}, style)
	watch(config.build.paths.scripts, {cwd : config.build.src}, script)
	watch(config.build.paths.pages, {cwd : config.build.src}, page)
	// watch("src/assets/images/**", image)
	// watch("src/assets/fonts/**", font)
	// watch("public/**", extra)
	watch([
		config.build.paths.images,
		config.build.paths.fonts,
	], {cwd : config.build.src}, bs.reload)
	watch("**", {cwd : config.build.public}, bs.reload)

	bs.init({
		notify : false, // 关闭提示
		port : 2020,
		//opent: false, // 设置是否打开浏览器
		// files : "dist/**", // 指定监听文件变化
		server : {
			baseDir : [config.build.temp, config.build.dist, config.build.public], // 指定打开页面
			routes : { // 指定优先查看目录
				"/node_modules" : "node_modules"
			}
		}
	})
}
// 文件合并
const useref = () => {
	return src(config.build.paths.pages, {base : config.build.temp,cwd:config.build.temp})
		.pipe(plugins.useref({searchPath : [config.build.temp, "."]}))
		.pipe(plugins.if(/\.js$/, plugins.uglify()))
		.pipe(plugins.if(/\.css$/, plugins.cleanCss()))
		.pipe(plugins.if(/\.html$/, plugins.htmlmin({
			collapseWhitespace : true,
			minifyCSS : true,
			minifyJs : true,
		})))
		.pipe(dest(config.build.dist))
}
// parallel是gulp中同时开始执行任务，series是gulp中按照顺序开始执行任务, 任务可以传数组，也可以一个一个传
const compile = parallel(style, script, page)
const build = series(clean, parallel(series(compile, useref), image, font, extra))
const develop = series(compile, serve)
module.exports = {
	clean,
	build,
	develop,
}
