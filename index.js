// Public API

const ncu = require('npm-check-updates')

/*
   CDN URL format with a base URL, name, version (optional), and file (optional)
   Based on https://github.com/unpkg/unpkg-website/blob/c49efe2de1fa4bd673999d607f0df73b374ba4e7/server/utils/parsePackageURL.js#L3
   TODO: wait until the unpkg project picks an open source license and mention it here
 */
const urlFormat = 'https?://(cdn.jsdelivr.net/npm|unpkg.com)/((?:@[^/@]+/)?[^/@]+)(?:@([^/]+))?(/.*)?'

/*
   Returns an HTML String's npm dependencies as an Object of names and versions
   (Strings compatible with the semver package), extracted from CDN URLs. The
   result is similar to the dependencies property of package.json. Versions may
   be undefined, representing a package's latest tag on npm (usually the latest
   stable version).
 */
exports.list = html =>
  (html.match(RegExp(urlFormat, 'g')) || [])
    .map(dependency => RegExp(urlFormat).exec(dependency).slice(2)) // Extract capture groups
    .reduce((memo, dependency) => {
      const name = dependency[0]
      const version = dependency[1] || ''

      if (name in memo) throw new Error(`cdnm: ${name} must not have multiple versions, found ${memo[name]} and ${version}`)

      // Build object from key/value pairs
      return Object.assign({}, memo, { [name]: version })
    }, {})

/*
   Returns a Promise of a copy of an HTML String with its CDN URL versions
   updated in place. Version ranges are maintained and only updated when they do
   not include the latest version of a package. Works similarly to the
   npm-check-updates package.
 */
exports.update = html =>
  ncu
    .run({
      jsonAll: true,
      packageData: JSON.stringify({ dependencies: exports.list(html) })
    })
    .then(dependencies =>
      html.replace(RegExp(urlFormat, 'g'), (match, base, name, version, file) => {
        const newVersion = dependencies.dependencies[name]

        // Build the new package URL using HTTPS and leaving missing sections empty
        return ['https://', base, '/', name, newVersion && '@', newVersion, file].join('')
      })
    )
