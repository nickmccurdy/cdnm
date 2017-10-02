const fs = require('fs')
const { JSDOM } = require('jsdom')
const ncu = require('npm-check-updates')
const { promisify } = require('util')
const { URL } = require('url')

const writeFile = promisify(fs.writeFile)

/*
 * From https://github.com/unpkg/unpkg-website/blob/c49efe2de1fa4bd673999d607f0df73b374ba4e7/server/utils/parsePackageURL.js#L3
 * TODO: wait until the unpkg project picks an open source license and mention it here
 */
const URLFormat = /^\/((?:@[^\/@]+\/)?[^\/@]+)(?:@([^\/]+))?(\/.*)?$/

exports.list = async path => {
  const dom = await JSDOM.fromFile(path)
  const links = Array.from(dom.window.document.querySelectorAll('link[rel=stylesheet]'))

  return Array.from(links).reduce((memo, link) => {
    const pathname = new URL(link.href).pathname
    const [, name, version] = URLFormat.exec(pathname)

    return { ...memo, [name]: version }
  }, {})
}

exports.updateLink = async link => {
  const url = new URL(link.href)
  const [, name, version, file] = URLFormat.exec(url.pathname)
  const newVersion = Object.values(await ncu.run({ packageData: JSON.stringify({ dependencies: { [name]: version } }) }))[0]
  url.pathname = `/${name}@${newVersion}${file}`
  link.href = url.toString()
}

exports.update = async path => {
  const dom = await JSDOM.fromFile(path)
  const links = Array.from(dom.window.document.querySelectorAll('link[rel=stylesheet]'))

  await Promise.all(links.map(exports.updateLink))
  await writeFile(path, dom.serialize())
}
