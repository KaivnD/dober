#!/usr/bin/env node

const program = require('commander')
const packageJson = require('./package.json')
const { Extendscript } = require('../dist')

program
  .version(packageJson.version)
  .usage('[options]')
  .option(
    '-s, --script <path>',
    'The input file to compile into an executable extendscript'
  )
  .option('-o, --output <path>', 'The path to the wished compiled output file')
  .option(
    '-t, --target [targetApp]',
    'The Adobe Application the script is intended for. i.e. InDesign [targetApp]'
  )
  .option(
    '-e, --targetengine [targetEngine]',
    'The target engine. i.e. "session" [targetEngine]'
  )
  .parse(process.argv)

const extendscript = new Extendscript()

const adobeTarget = String(program.target).toLowerCase()
if (
  adobeTarget &&
  (adobeTarget.indexOf('indesign') >= 0 ||
    adobeTarget.indexOf('photoshop') >= 0 ||
    adobeTarget.indexOf('illustrator') >= 0 ||
    adobeTarget.indexOf('aftereffects') >= 0)
) {
  extendscript.Prepend('#target ' + program.target + '\n')
}

const targetEngine = String(program.targetengine).replace(
  new RegExp('^[^a-zA-Z_$]|[^0-9a-zA-Z_$]', 'g'),
  '_'
)

if (targetEngine !== 'undefined') {
  if (targetEngine.length > 0) {
    extendscript.Prepend('#targetengine "' + targetEngine + '"\n')
  }
}

extendscript.save(program.script, program.output)
