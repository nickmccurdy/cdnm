const { JSDOM: { fromFile } } = require('jsdom')
const { URL } = require('url')

/*
 * From https://github.com/unpkg/unpkg-website/blob/c49efe2de1fa4bd673999d607f0df73b374ba4e7/server/utils/parsePackageURL.js#L3
 * TODO: wait until the unpkg project picks an open source license and mention it here
 */
const URLFormat = /^\/((?:@[^\/@]+\/)?[^\/@]+)(?:@([^\/]+))?(\/.*)?$/

exports.list = async path => {
  const dom = await fromFile(path)
  const links = [...dom.window.document.querySelectorAll('link[rel=stylesheet]')]

  return links.reduce((memo, link) => {
    const pathname = new URL(link.href).pathname
    const [name, version] = URLFormat.exec(pathname).slice(1)

    return { ...memo, [name]: version }
  }, {})
}
