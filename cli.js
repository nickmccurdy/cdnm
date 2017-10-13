#!/usr/bin/env node

const cdnm = require('.')
const program = require('commander')
const { readFileSync, writeFileSync } = require('fs')
const { description, version } = require('./package')

program
  .command('list <path>')
  .description('list CDN dependencies in HTML file')
  .action(path => console.log(cdnm.list(readFileSync(path, 'utf8'))))

program
  .command('update <path>')
  .description('update CDN dependencies in HTML file')
  .action(async path => writeFileSync(path, await cdnm.update(readFileSync(path, 'utf8'))))

program
  .description(description)
  .version(version)
  .parse(process.argv)

program.args.length || program.help()
