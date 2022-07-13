#!/usr/bin/env node
// config-modules

'use strict'

/*
 * Todo list
 */

//DONE -> Default selectoin (when applying a module, highlight what is the current setting)

//TODO -> Do not mutate on exit (If the user exits module application, turn the old setting back.)
// If this is to be implemented, it will require for the whole codebase to be rewritten from scratch.
// Good moment to:
//TODO -> Add unit testing

//TODO -> Infinite loop protection (what if the config folder falls into the config-modules and this causes infinite..)
//2months later: I discard this possibility since the config folder probably won't be valid to recurse. I might be wrong! Has to be tested.

//TODO -> In the (real) config folder indicate that config-modules is controlling the file with a README

//TODO -> Do not block user ability to pick module before entry.

//TODO -> Exiting module setting should put you back at choosing an entry, rather than exiting the program.

import fs from 'fs'
import path from 'path'
import url from 'url'
import os from 'os'
import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'
import prompts from 'prompts'
import YAML from 'yaml'
import {exec} from 'child_process'
import util from 'util'
const execAsync = util.promisify(exec)
const fsPromises = fs.promises

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const configFileDef = path.join(
  os.homedir(),
  '.config/config-modules/config-modules.yaml'
)

const popupLog = (messages = [], stringify = true) => {
  // popup-log is a wrapper script around notify-send
  messages.forEach(message => {
    if (stringify) message = JSON.stringify(message)
    exec(`popup-log "${message}"`, (err, stdout, stderr) => {
      if (err) throw err
    })
  })
}

const tree = {}

const OPTIONS = {
  help: {
    alias: 'h',
    type: 'boolean',
    describe: 'Print help menu.',
    inConfig: false,
  },
  version: {
    alias: 'v',
    type: 'boolean',
    describe: 'Display version information.',
    inConfig: false,
    set: function() {
      const version = JSON.parse(fs.readFileSync('package.json', 'utf8'))
        .version
      console.log(version)
      process.exit(0)
    },
    validate: function() {
      return true
    },
  },
  entry: {
    alias: 'e',
    describe: 'Which entry do you wish to configure?',
    type: 'string',
    validate: function(val) {
      const okNowIsThisAValidDirPath = entry => {
        const dir = path.join(
          OPTIONS['config-modules-dir'].value,
          'entries',
          entry
        )
        return fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()
      }
      return (
        (typeof val === this.type || val instanceof String) &&
        okNowIsThisAValidDirPath(val)
      )
    },
    value: null,
    path: null,
    inConfig: false,
    set: function(val) {
      let validated = this.validate(val)
      validated && (this.value = val)
      validated &&
        (this.path = path.join(
          OPTIONS['config-modules-dir'].value,
          'entries',
          val
        ))
      return validated
    },
    reset: function() {
      this.value = null
      this.path = null
    },
  },
  module: {
    alias: 'm',
    describe: 'Which module do you wish to enable?',
    type: 'string',
    validate: function(val) {
      // Nice error but it blocks the ability to set only module through cli and choose entry through cli...
      if (
        !OPTIONS['entry'].validate(OPTIONS['entry'].value) ||
        !fs.existsSync(OPTIONS['entry'].path)
      ) {
        console.log('invalid entry while trying to set module')
        return false
      }
      const okNowIsThisAValidFilePath = module => {
        const dir = path.join(OPTIONS['entry'].path, 'modules', module)
        return fs.existsSync(dir) && fs.lstatSync(dir).isFile()
      }
      return (
        (typeof val === this.type || val instanceof String) &&
        okNowIsThisAValidFilePath(val)
      )
    },
    value: null,
    path: null,
    inConfig: false,
    set: function(val) {
      let validated = this.validate(val)
      validated && (this.value = val)
      validated &&
        (this.path = path.join(OPTIONS['entry'].path, 'modules', val))
      return validated
    },
    reset: function() {
      this.value = null
      this.path = null
    },
  },
  'module-first': {
    describe:
      'Pass this option and I will place the chosen module before the static file in the generated, final configuration.',
    type: 'boolean',
    validate: function(val) {
      return typeof val == this.type
    },
    value: null,
    inConfig: true,
    set: function(val) {
      let validated = this.validate(val)
      validated && (this.value = val)
      return validated
    },
  },
  config: {
    alias: 'c',
    describe: 'Config file path.',
    type: 'string',
    validate: function(val) {
      return (
        typeof val == this.type &&
        fs.existsSync(val) &&
        fs.lstatSync(val).isFile()
      )
    },
    value: null,
    inConfig: false,
    set: function(val) {
      let validated = this.validate(val)
      validated && (this.value = val)
      return validated
    },
  },
  'config-modules-dir': {
    describe:
      'What is the path to the folder containing the entries with their modules?',
    type: 'string',
    validate: function(val) {
      return typeof val === this.type || val instanceof String
        ? fs.existsSync(val) && fs.lstatSync(val).isDirectory()
        : false
    },
    value: null,
    inConfig: true,
    set: function(val) {
      let validated = this.validate(val)
      validated && (this.value = val)
      return validated
    },
  },
  'without-preview': {
    alias: 'w',
    describe:
      'When selecting a module interactively, this option disables the preview. In other words, it prevents applying the module right on selection in the menu.',
    type: 'boolean',
    validate: function(val) {
      return typeof val == this.type
    },
    value: null,
    inConfig: true,
    set: function(val) {
      let validated = this.validate(val)
      validated && (this.value = val)
      return validated
    },
  },
}

// Here, list the properties in OPTIONS that aren't needed to yargs (internal to the program properties).
const filterOut = ['validate', 'value', 'path', 'inConfig', 'set', 'reset']
const filteredOptionsProps = {} // yargs doesn't need to know all (filterOut) the properties.
Object.entries(OPTIONS).forEach(property => {
  const ready = Object.keys(property[1])
    .filter(key => !filterOut.includes(key))
    .reduce((obj, key) => {
      obj[key] = property[1][key]
      return obj
    }, {})
  filteredOptionsProps[property[0]] = ready
})
const argv = yargs(hideBin(process.argv))
  .parserConfiguration({'camel-case-expansion': false})
  .version(false)
  .usage('Usage: $0 [options]')
  .options(filteredOptionsProps)
  .example([
    [
      '$0 --entry i3_wm --module material.config',
      'change i3_wm module to material.config',
    ],
    [
      '$0 --entry i3_wm',
      'Ask me which module I want to choose for the entry i3_wm',
    ],
    [
      '$0 --module material.config',
      "Ask me for which entry I want to apply module material.config (Of course, I will apply the module only if it exists for the entry you're about to choose.)",
    ],
  ]).argv

const aliasOrLiteralToLiteral = (opts, arg) => {
  // This should be a clear enough documentation of this function:
  //aliasOrLiteralToLiteral(OPTIONS, 'e') => 'entry'
  //aliasOrLiteralToLiteral(OPTIONS, 'entry') => 'entry'
  //aliasOrLiteralToLiteral(OPTIONS, 'config-modules-dir') => 'config-modules-dir'
  //aliasOrLiteralToLiteral(OPTIONS, 'blahblah') => false

  const dict = {}
  // Generate a dictionary of the kind {'e': 'entry', 'entry': 'entry'}
  for (let prop in opts) {
    dict[prop] = prop
    const alias = opts[prop].alias
    if (alias) dict[alias] = prop
  }
  // Use the dictionary
  const ret = dict[arg]
  // Validate
  if (typeof ret === 'string' || ret instanceof String) {
    return ret
  } else {
    return false
  }
}

const masterValidator = async opts => {
  if (!opts['config'].set(argv['config'])) {
    if (!opts['config'].set(configFileDef)) {
      // File doesn't exist!
      console.log(`This program cannot run without it's config file!`)
      console.log(
        `Specify your custom config file path by passing --config (-c) flag. For more info see --help (-h).`
      )
      console.log(`Or, let me make one for you!`)
      const initFilePerm = (await prompts(
        {
          type: 'confirm',
          name: 'perm',
          message: `Can I initialize my config file at "${configFileDef}"?`,
          initial: false,
        },
        {
          onCancel: () => {
            console.log('No changes were made.', '\nAborting...')
            process.exit()
          },
        }
      )).perm
      if (initFilePerm) {
        const configFileDef_dir = path.normalize(path.join(configFileDef, '..'))
        if (!fs.existsSync(configFileDef_dir)) {
          fs.mkdirSync(configFileDef_dir, {recursive: true})
        }
        // Write some props
        const defaultConfigOpts = YAML.stringify({
          'without-preview': false,
          'module-first': false,
        })
        fs.writeFileSync(configFileDef, defaultConfigOpts)

        if (opts['config'].set(configFileDef)) {
          console.log(`Successfully created "${configFileDef}".`)
        } else {
          throw new Error('Fatal error')
        }
      } else {
        console.log('Exiting...')
        process.exit(0)
      }
    }
  }

  // Load the config file
  const configContent =
    YAML.parse(fs.readFileSync(opts['config'].value, 'utf8')) || {}

  // Figure out the config modules root directory
  if (!opts['config-modules-dir'].set(configContent['config-modules-dir'])) {
    //TODO: Combine those if's and on other places you can see the same pattern as well
    //2months after: Or, actually leave them like that. Verbose code is easier to understand => maintain...
    if (!opts['config-modules-dir'].set(argv['config-modules-dir'])) {
      console.log(
        'Missing, invalid or no config modules directory provided! Please specify it via --config-modules-dir',
        'For more info see --help (-h)'
      )
      console.log('Exiting...')
      process.exit(0)
    } else {
      const toBeConfigModulesDir =
        opts['config-modules-dir'].value ||
        console.error(
          new Error("Wtf's happening?!? Johny?! Did you hacked that code?")
        )
      configContent['config-modules-dir'] = toBeConfigModulesDir
      const configNew = YAML.stringify(configContent)
      fs.writeFileSync(opts['config'].value, configNew)
      console.log(
        `Note: "${
          opts['config-modules-dir'].value
        }" is now cached as the default config modules directory. You won't need to specify it next time unless you want to change it.`
      )
    }
  }

  // Validate the directory structure now and store it into a plain js object (tree var), after we've got the config-modules-dir
  // TODO: You should move that code into the validate() part probably, somehow...
  const entries = path.join(opts['config-modules-dir'].value, 'entries')
  fs.readdirSync(entries).forEach(entry => {
    const downTheRabbitHole = path.join(entries, entry)
    if (fs.lstatSync(downTheRabbitHole).isDirectory()) {
      tree[entry] = {}
      // console.log(downTheRabbitHole)
      //TODO: For aesthetical reasons, why don't you make the below values false, false, false? (may be wrong)
      const requirements = {modules: false, entryconfig: true, static: false}
      fs.readdirSync(downTheRabbitHole).forEach(file => {
        const filePath = path.join(downTheRabbitHole, file)
        // console.log(filePath)
        if (file === 'static' && fs.lstatSync(filePath).isFile()) {
          tree[entry].static = filePath
          requirements.static = true
        } else if (file === 'modules' && fs.lstatSync(filePath).isDirectory()) {
          tree[entry].modules = {}
          // const modules = path.join(downTheRabbitHole, 'modules')
          fs.readdirSync(filePath).forEach(module => {
            tree[entry].modules[module] = path.join(filePath, module)
            //if (!requirements.static) requirements.modules = true //TODO: Why the if.. ? We'll see
            requirements.modules = true
          })
          // fs.readFileSync
        } else if (
          file === 'entryconfig.yaml' &&
          fs.lstatSync(filePath).isFile()
        ) {
          const entryconfig =
            YAML.parse(fs.readFileSync(filePath, 'utf8')) || {}
          tree[entry].entryconfig = entryconfig

          if (
            !entryconfig['export-to'] ||
            !fs.lstatSync(entryconfig['export-to']).isFile()
          ) {
            // If any of the export-to dirs is invalid
            console.error(
              `export-to property in ${filePath} invalid or missing!`
            )
            requirements.entryconfig = false
          }

          //Uncomment only if you want to avoid validation of the entryconfig file! WARNING: DO IT AT YOUR OWN RISK!
          //requirements.entryconfig = true
        } else {
          console.warn(`Undesired file found in ${downTheRabbitHole}!`)
        }
      })
      Object.entries(requirements).filter(req => {
        if (!req[1])
          throw new Error(
            `Couldn't validate config-modules-dir (${
              configDefault['config-modules-dir']
            })! Missing/incorrect file/folder "${
              req[0]
            }" in ${downTheRabbitHole}`
          )
      })
    } else {
      console.warn(`Undesired file "${entry}" found in ${entries}!`)
    }
  })

  // Validate config from the default config file
  const failed_validations = []
  for (const opt in opts) {
    if (
      opts[opt].inConfig &&
      (!!configContent[opt] ||
        configContent[opt] === false ||
        configContent[opt] === 0)
    ) {
      let action = opts[opt].set(configContent[opt])
      if (!action)
        failed_validations.push(new Error(`${opt} invalid in config file!`))
    } else if (opts[opt].inConfig) {
      //TODO: Shouldn't config file options be optional??
      /*
	   * Yes, they should.
	   *
      failed_validations.push(
        new Error(`${opt} invalid or missing in config file!`)
      )*/
    }
  }

  Object.keys(argv).forEach(key => {
    const literal = aliasOrLiteralToLiteral(opts, key)
    if (literal) {
      popupLog([opts[literal]])
      console.log(opts[literal].set(argv[key]))
      let action = opts[literal].set(argv[key]) //opts[opt[0]].set(argv[key])
      if (!action) {
        failed_validations.push(new Error(`option --${key} invalid!`))
        // TODO: This throws two errors. One for the alias and one for the flag itself.
        // Not fatal, but would be better if the error was just a single one
      }
    } else if (key !== '$0' && key !== '_') {
      console.log(Object.keys(argv))
      throw new Error(`Received invalid option --${key}`)
    }
  })

  //loop over all the keys
  failed_validations.forEach(err => console.error(err))
}

// Receives all the gotten options and applies them
const apply = async (tree, opts, temp) => {
  const theChosenOne = tree[opts['entry'].value]
  const staticFileContent = fs.readFileSync(theChosenOne.static).toString()
  const moduleFileContent = fs.readFileSync(opts['module'].path).toString()

  let endStr = ''
  if (theChosenOne.entryconfig['module-first']) {
    endStr = moduleFileContent + '\n' + staticFileContent
  } else {
    endStr = staticFileContent + '\n' + moduleFileContent
  }

  const nextSession = (opts, temp) => {
    // Decide whether next (new) session should be caused
    const args = Object.keys(argv)
    const noNextIfPresent = ['entry', 'module']
    const next = args.every(arg => {
      const literal = aliasOrLiteralToLiteral(opts, arg)
      return !noNextIfPresent.includes(literal)
    })
    if (!temp && next) {
      // Cause next (new) session
      opts['entry'].reset()
      opts['module'].reset()
      figureEntryAndModule()
    }
  }

  const apply_core = async opts => {
    // Apply the configuration

    try {
      await fsPromises.writeFile(theChosenOne.entryconfig['export-to'], endStr)
      const updateCommand = theChosenOne.entryconfig['post-apply-hook']
      const entryConfigFilePath = path.join(
        opts['entry'].path,
        'entryconfig.yaml'
      )
      if (typeof updateCommand === 'string') {
        try {
          const {stdout, stderr} = await execAsync(updateCommand)
          if (stdout && !temp) {
            console.log('STDOUT:', stdout)
          } else if (stderr && !temp) {
            console.log(
              'STDERR:',
              `The following error occured calling your post-apply-hook command specified in ${entryConfigFilePath}`,
              stderr
            )
          }
        } catch (e) {
          console.log('Fatal error occured calling exec')
          console.log(
            'ERR:',
            `The following error occured calling your post-apply-hook command specified in ${entryConfigFilePath}`,
            e.stderr
          )
        } finally {
          nextSession(opts, temp)
          // Whether to invoke a next session is decided in nextSession
        }
      } else {
        nextSession(opts, temp)
        // Whether to invoke a next session is decided in nextSession
      }
    } catch (e) {
      console.log('Fatal error occured trying to write to file')
      throw e
    }
  }

  if (!temp) {
    // Cache the current choice
    const configContent =
      YAML.parse(fs.readFileSync(opts['config'].value, 'utf8')) || {}
    let cache = configContent.cache
    if (
      !typeof cache === 'object' ||
      Array.isArray(cache) ||
      cache === null ||
      cache === undefined
    ) {
      cache = {}
    }
    cache[opts['entry'].value] = opts['module'].value
    configContent.cache = cache
    fs.writeFileSync(opts['config'].value, YAML.stringify(configContent))

    // Backup the old configuration
    fs.copyFile(
      theChosenOne.entryconfig['export-to'],
      theChosenOne.entryconfig['export-to'].concat('.backup'),
      err => {
        if (err) throw err
        console.log(
          `${
            theChosenOne.entryconfig['export-to']
          } was backed up to ${theChosenOne.entryconfig['export-to'].concat(
            '.backup'
          )}`
        )
        apply_core(opts)
      }
    )
  } else {
    apply_core(opts)
  }

  return opts
}

// Now that we should have gathered almost all the data, choose and actually apply the config
const entry = async opts => {
  if (opts.entry.value && opts.entry.path) {
    return opts.entry.value
  } else {
    //go figure it out, dynamically!
    const response = await prompts(
      {
        type: 'select',
        name: 'entry',
        message: opts.entry.describe,
        choices: ['exit', ...Object.keys(tree)].map(entry => ({
          title: entry,
          value: entry,
        })),
        //initial: 2,
      },
      {
        onCancel: () => {
          console.log('No changes were made.', '\nAborting...')
          process.exit()
        },
      }
    )
    return response.entry
  }
}

//Get rid of this shitty function. Implement it so that when dynamically choosing module, there's always backup in tmp so
//that if user exits, this backup is immediately applied by the program and the statement "No changes were made" is actua
//lly true
/*
const revert = async (opts, cache) => {
  console.log(cache)
  if (!opts['module'].set[cache[opts['entry'].value]]) {
    console.error("Couldn't revert!")
  }
  await apply(tree, opts)
  return
}*/

const module = async (opts, cache) => {
  if (!opts.entry.validate(opts.entry.value))
    //TODO: This seems needless
    throw new Error('Invalid entry, no way of setting modle!')
  if (opts.module.value && opts.module.path) {
    return opts.module.value
  } else {
    // Go figure it out, dynamically!
    const modulesList = [
      'exit',
      ...Object.keys(tree[opts['entry'].value].modules),
    ]
    const prevChoice = cache[opts.entry.value]
    const prevChoiceIndex = modulesList.indexOf(prevChoice) || 1
    const response = await prompts(
      {
        type: 'select',
        name: 'module',
        message: opts.module.describe,
        choices: modulesList.map(module => ({
          title: module,
          value: module,
        })),
        onState: state => {
          if (state.value === 'exit') {
            state.value = prevChoice
          }
          if (!opts['without-preview'].value && state.value) {
            if (opts['module'].set(state.value)) {
              apply(tree, opts, true)
            } else {
              throw new Error("Couldn't set module. Validation failed!")
            }
          }
        },
        initial: prevChoiceIndex,
      },
      {
        onCancel: async () => {
          //await revert(opts, cache)
          console.log('No changes were made.', '\nAborting...')
          process.exit()
        },
      }
    )
    return response.module
  }
}

const figureEntryAndModule = async () => {
  const configContent =
    YAML.parse(fs.readFileSync(OPTIONS['config'].value, 'utf8')) || {}
  const cache = configContent.cache
  entry(OPTIONS)
    .then(entry => {
      if (entry === 'exit') {
        console.log('No changes were made.', '\nExiting...')
        process.exit()
      }
      if (OPTIONS['entry'].set(entry)) {
        module(OPTIONS, cache)
          .then(module => {
            if (module === 'exit') {
              console.log('No changes were made.', '\nExiting...')
              process.exit()
            }
            if (OPTIONS['module'].set(module)) {
              //TODO: Potential break point. set might fail! Add appropriate error handling (look also at the place when we define module())
              return apply(tree, OPTIONS, false) //3rd argument is for whether to apply temporarily
            } else {
              //TODO: This isn't the best shit
              throw 'setting module failed'
            }
          })
          .catch(err => {
            console.error(err)
          })
      } else {
        //TODO: This isn't the best shit
        throw 'setting entry failed'
      }
    })
    .catch(err => {
      console.error(err)
    })
}

masterValidator(OPTIONS).then(() => {
  figureEntryAndModule()
})

process.on('SIGINT', () => {
  console.log('Exiting...')
  process.exit()
})
