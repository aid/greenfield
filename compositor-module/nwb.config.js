module.exports = {
  type: 'web-module',
  npm: {
    esModules: true,
    cjs: false,
    umd: false
  },
  babel: {
    env: {
      targets: {
        browsers: 'last 2 versions'
      },
      modules: false
    }
  }
}
