#!/usr/bin/env node
const inquirer = require('inquirer')
const inquirerFileTreeSelection = require('inquirer-file-tree-selection-prompt')
const { say } = require('cfonts')
const packageJson = require('../package.json')
const { Extendscript } = require('../dist')
const commander = require('commander')
const program = new commander.Command()
const path = require('path')
const fs = require('fs')
const shell = require('shelljs')
const chalk = require('chalk')
const ora = require('ora')
const rds = require('randomstring')

const isCI = process.env.CI || false

const ORA_SPINNER = {
  interval: 80,
  frames: ['⠋', '⠙', '⠚', '⠞', '⠖', '⠦', '⠴', '⠲', '⠳', '⠓']
}

const cmdTmp = {
  win32: `"{app}" -r "{script}"`,
  darwin: `osascript -e 'tell application id "com.adobe.{app}" to activate do javascript file "{script}"'`
}

inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection)

const cwd = path.resolve('./')
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

let aliasesToApp = {}

Object.keys(apps).forEach(app => {
  aliasesToApp[app] = app
  apps[app].aliases.forEach(al => (aliasesToApp[al] = app))
})

require('dotenv').config()

const cols = process.stdout.columns
let text = ''

if (cols > 85) text = 'Dober.js'
else if (cols > 60) text = 'Dober.js'
else text = false
console.log()
if (text && !isCI) {
  say(text, {
    colors: ['yellow'],
    font: 'block',
    space: false
  })
} else console.log(chalk.yellow.bold('\n  Dober.js'))
console.log()

if (process.argv.length > 2) {
  program
    .version(packageJson.version)
    .command('config')
    .alias('c')
    .description('config local adobe app location')
    .action(() => {
      if (fs.existsSync(envfile) || process.platform !== 'win32') return
      ;(async () => {
        let selectApps = await inquirer.prompt({
          type: 'checkbox',
          name: 'apps',
          message: 'Apps to be set',
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
              message: `Which app are you setting for?`,
              choices: Object.keys(hostApps)
            },
            {
              type: 'input',
              name: 'path',
              message: 'Where is this app exe?'
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
    .option('-d, --debug', 'If debug minify is disabled.')
    .option('-s, --save [save]', 'Save the output where ever you want.')
    .action((app, source, opts) => {
      if (!fs.existsSync(envfile) && process.platform === 'win32') return

      if (opts.save) {
        try {
          const info = fs.statSync(opts.save)
          if (info.isDirectory) {
            opts.save = path.join(
              opts.save,
              rds.generate({
                length: 12,
                charset: 'alphanumeric'
              }) + '.js'
            )
          } else if (info.isFile) {
            if (!fs.existsSync(path.dirname(opts.save))) return
          }

          if (!path.isAbsolute(opts.save)) {
            opts.save = path.resolve(opts.save)
          }
        } catch {
          return
        }
      }

      compileAndRun(app, source, opts.debug, opts.save)
    })

  program.parse(process.argv)
  return
}

;(async () => {
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
      message: `Where is your script file be?`
    }
  ])

  compileAndRun(answers.app, answers.file)
})()

async function compileAndRun(app, source, debug = false, save = false) {
  const spinner = ora({
    text: `Compiling ${source} ... (This may take a while)`,
    spinner: ORA_SPINNER
  }).start()

  const runningApp = aliasesToApp[app]

  if (!runningApp) return

  const extendscript = new Extendscript()

  // extendscript.Prepend('#target ' + runningApp + '\n')

  try {
    let scriptfile = await extendscript.Parse(source, {
      debug: debug,
      save: save
    })

    let cmd = cmdTmp[process.platform].replace('{script}', scriptfile)

    if (process.platform === 'win32') {
      let appLoc = process.env[runningApp]
      if (!appLoc) return
      cmd = cmd.replace('{app}', appLoc)
    } else if (process.platform === 'darwin') {
      cmd = cmd.replace('{app}', runningApp)
    } else return

    shell.exec(cmd, () => {
      spinner.stopAndPersist({
        text: chalk.black.bgGreen(` ✔ Done `)
      })

      if (debug || save) {
        console.log(scriptfile)
        return
      }

      fs.unlinkSync(scriptfile)
    })
  } catch (e) {
    console.log()
    spinner.stopAndPersist({
      text: chalk.white.bgRed(` ${e.message} `)
    })
  }
  console.log()
}
