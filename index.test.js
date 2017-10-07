const cdnm = require('.')
const { copyFile, readFile, unlink } = require('fs')
const { parse, parseFragment, serialize } = require('parse5')
const { URL } = require('url')
const { promisify } = require('util')

// Async functions
const copyFileAsync = promisify(copyFile)
const readFileAsync = path => promisify(readFile)(path, 'utf8')
const readHTML = async file => (
  (await readFileAsync(file, 'utf8'))
    .replace('DOCTYPE', 'doctype')
    .replace(/\n/g, '')
    .replace(/>\s+</g, '><')
)
const unlinkAsync = promisify(unlink)

// AST nodes
const parseNode = node => parseFragment(node).childNodes[0]
const createLink = href => parseNode(`<link  href="${href}" rel="stylesheet">`)
const createScript = src => parseNode(`<script src=${src}></script>`)

// Test files
const file = 'fixture.html'
const fileTmp = 'fixture_tmp.html'

// Package metadata
const name = 'juggernaut'
const version = '2.1.0'
const newVersion = '2.1.1'
const unpkgURL = `https://unpkg.com/${name}`
const replaceVersion = string => string.replace(version, newVersion)

describe('createURL', () => {
  test('valid URL', () => expect(cdnm.createURL(unpkgURL)).toEqual(new URL(unpkgURL)))
  test('invalid URL', () => expect(cdnm.createURL('')).toBe(null))
})

test('findDependencies', async () => {
  const node = parse(await readFileAsync(file))
  const serializeArray = array => array.map(serialize)
  expect(serializeArray(cdnm.findDependencies(node))).toEqual(serializeArray([createScript(unpkgURL)]))
})

test('list', () => expect(cdnm.list(file)).resolves.toEqual({ [name]: version }))

test('update', async () => {
  await copyFileAsync(file, fileTmp)
  await cdnm.update(fileTmp)

  await expect(readHTML(fileTmp)).resolves.toBe(replaceVersion(await readHTML(file)))

  await unlinkAsync(fileTmp)
})

describe('updateDependency', () => {
  test('script with fixed version', async () => {
    const url = `https://unpkg.com/${name}@${version}/index.js`
    await expect(cdnm.updateDependency(createScript(url))).resolves.toEqual(createScript(replaceVersion(url)))
  })

  test('script with latest version', async () => {
    const script = createScript(`https://unpkg.com/${name}@${newVersion}/index.js`)
    await expect(cdnm.updateDependency(script)).resolves.toEqual(script)
  })

  test('script with semver range', async () => {
    const script = createScript(`https://unpkg.com/${name}@^${newVersion}/index.js`)
    await expect(cdnm.updateDependency(script)).resolves.toEqual(script)
  })

  test('script with tag', async () => {
    const script = createScript(`https://unpkg.com/${name}@latest/index.js`)
    await expect(cdnm.updateDependency(script)).resolves.toEqual(script)
  })

  test('script without vesion', async () => {
    const script = createScript(`https://unpkg.com/${name}/index.js`)
    await expect(cdnm.updateDependency(script)).resolves.toEqual(script)
  })

  test('script without path', async () => {
    const url = `https://unpkg.com/${name}@${version}`
    await expect(cdnm.updateDependency(createScript(url))).resolves.toEqual(createScript(replaceVersion(url)))
  })

  test('script with trailing slash', async () => {
    const url = `https://unpkg.com/${name}@${version}/`
    await expect(cdnm.updateDependency(createScript(url))).resolves.toEqual(createScript(replaceVersion(url)))
  })

  test('script for home page', async () => {
    const script = createScript(`https://unpkg.com`)
    await expect(cdnm.updateDependency(script)).resolves.toEqual(script)
  })

  test('script with query', async () => {
    const url = `https://unpkg.com/${name}@${version}/index.js?main=example`
    await expect(cdnm.updateDependency(createScript(url))).resolves.toEqual(createScript(replaceVersion(url)))
  })

  test('link', async () => {
    const link = createLink(unpkgURL)
    await expect(cdnm.updateDependency(link)).resolves.toEqual(link)
  })

  test('any link rel', async () => {
    const html = `<link href="${unpkgURL}" rel="invalid">`
    await expect(cdnm.updateDependency(parseNode(html))).resolves.toEqual(parseNode(replaceVersion(html)))
  })

  test('absolute href', async () => {
    const script = createScript('https://example.com/index.js')
    await expect(cdnm.updateDependency(script)).resolves.toEqual(script)
  })

  test('relative href', async () => {
    const script = createScript('index.js')
    await expect(cdnm.updateDependency(script)).resolves.toEqual(script)
  })

  test('root relative href', async () => {
    const script = createScript('/index.js')
    await expect(cdnm.updateDependency(script)).resolves.toEqual(script)
  })
})

describe('urlProperty', () => {
  test('link', () => expect(cdnm.urlProperty(createLink(unpkgURL))).toBe('href'))
  test('script', () => expect(cdnm.urlProperty(createScript(unpkgURL))).toBe('src'))
})
