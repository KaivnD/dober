#!/usr/bin/env node
const inquirer = require('inquirer')
const inquirerFileTreeSelection = require('inquirer-file-tree-selection-prompt')
const { say } = require('cfonts')
const packageJson = require('../package.json')
const { Extendscript } = require('../dist')
const commander = require('commander')
const { exec } = require('child-process-promise')
const program = new commander.Command()
const path = require('path')
const fs = require('fs')
const shell = require('shelljs')
const chalk = require('chalk')
const ora = require('ora')

const isCI = process.env.CI || false

const ORA_SPINNER = {
  interval: 80,
  frames: [
    '   ⠋',
    '   ⠙',
    '   ⠚',
    '   ⠞',
    '   ⠖',
    '   ⠦',
    '   ⠴',
    '   ⠲',
    '   ⠳',
    '   ⠓'
  ]
}

inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection)

const cwd = path.resolve('./')
console.log(cwd)
const envfile = path.join(cwd, '.env')

const apps = {
  Photoshop: {
    name: 'Photoshop',
    aliases: ['ps', 'photoshop'],
    versions: ['2015.3']
  },
  Illustrator: {
    name: 'Illustrator',
    aliases: ['ai', 'illustrator'],
    versions: ['2015.3', '2017', '2018', '2019', '2020']
  },
  InDesign: {
    name: 'InDesign',
    aliases: ['id', 'indesign', 'in design'],
    versions: ['2015.3', '2018', '2019']
  }
}

if (process.argv.length > 2) {
  program
    .version(packageJson.version)
    .command('config')
    .alias('c')
    .description('config local software location')
    .action(() => {
      if (fs.existsSync(envfile) || process.platform !== 'win32') return
      ;(async () => {
        let selectApps = await inquirer.prompt({
          type: 'checkbox',
          name: 'apps',
          message: 'app location to be set',
          choices: Object.keys(apps)
        })

        let hostApps = {}

        selectApps.apps.forEach(
          app =>
            (hostApps[app] = {
              path: null
            })
        )

        while (
          selectApps.apps.map(app => hostApps[app].path).indexOf(null) > -1
        ) {
          let answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'app',
              message: `Which app are you scripting for?`,
              choices: Object.keys(hostApps)
            },
            {
              type: 'input',
              name: 'path',
              message: 'Where is this app exe'
            }
          ])

          hostApps[answers.app].path = path.normalize(
            String(answers.path).trim()
          )
        }
        let envContent = []
        Object.keys(hostApps).forEach(app => {
          envContent.push(`${app}=${hostApps[app].path}`)
        })
        fs.writeFileSync(envfile, envContent.join('\n'), { encoding: 'utf-8' })
      })()
    })

  program
    .version(packageJson.version)
    .command('run <app> <source>')
    .option(
      '-t, --target [targetApp]',
      'The Adobe Application the script is intended for. i.e. InDesign [targetApp]'
    )
    .action(async (app, source, opts) => {
      if (!fs.existsSync(envfile)) return

      let spinner = ora({
        text: `Compiling ${source} ... (This may take a while)`,
        spinner: ORA_SPINNER
      }).start()

      const extendscript = new Extendscript()

      const adobeTarget = String(opts.target).toLowerCase()
      if (
        adobeTarget &&
        (adobeTarget.indexOf('indesign') >= 0 ||
          adobeTarget.indexOf('photoshop') >= 0 ||
          adobeTarget.indexOf('illustrator') >= 0 ||
          adobeTarget.indexOf('aftereffects') >= 0)
      ) {
        extendscript.Prepend('#target ' + opts.target + '\n')
      }

      try {
        let scriptfile = await extendscript.Parse(source)
        require('dotenv').config()

        let photoshop = process.env.Photoshop
        if (!photoshop) return

        const cmd = `"${photoshop}" -r "${scriptfile}"`

        shell.exec(cmd, () => {
          spinner.stopAndPersist({
            text: `${chalk.black.bgGreen(` ✔ Done `)}`
          })

          fs.unlinkSync(scriptfile)
        })
      } catch (e) {
        spinner.stopAndPersist({
          text: `${chalk.white.bgRed(e.message)}`
        })
      }
    })

  program.parse(process.argv)
  return
}

;(async () => {
  greeting()
  let answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'app',
      message: `Which app are you scripting for?`,
      choices: Object.keys(apps)
    },
    {
      type: 'file-tree-selection',
      name: 'file',
      message: `What should the name of the script file be?`
    }
  ])
  console.log(answers)
})()

function greeting() {
  const cols = process.stdout.columns
  let text = ''

  if (cols > 85) text = 'Dober.js'
  else if (cols > 60) text = 'Dober.js'
  else text = false

  if (text && !isCI) {
    say(text, {
      colors: ['yellow'],
      font: 'block',
      space: false
    })
  } else console.log(chalk.yellow.bold('\n  Dober.js'))
}
