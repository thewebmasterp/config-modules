# config-modules

Is turning static config files into dynamic in a modular approach.

What I mean by that?

Take a static i3wm config file. You open it, change a bunch of
variables, save it, reload your config and this has changed your color
theme.🥱

What if you could simply predefine little files (called modules), each
containing the same variables holding different colors and then easily
switch between those modules, concatenated to your i3wm config? Or even
turn whole parts of your config into individual modules that you can
apply by choice. This is where config-modules comes into play!😃

Here's what I used it for: ![](./demonstration.gif)
![](./demonstration2.gif)

## How it works

You create a text file (called *static*). You create a folder containing
multiple text files (*modules*). Later, running this utility will allow
you to dynamically (or only via CLI options) choose which module to be
concatenated to the static file (to the top/to the bottom of the static
file, specified in a special config file called *entryconfig*) and it
will export the resulting concatenated file to a specified place
(specified in the same *entryconfig*). This whooole thing is called an
*entry*. An entry is simply a program you want to generate a config for
(from static & modules). You can have multiple entries in the folder
that you specified via config-modules-dir slash entries.

A visual example of what I just explained can be seen in
[./examples/config-modules-dir](./examples).

### entry vs module

An entry is a single program that has its own static file, entryconfig
and modules directory containing the different modules that can be
concatenated to the static and exported on the specified in entryconfig
place. All of this is a single entry. It is located under its own
directory residing in config-modules-dir slash entries.

### config vs entryconfig

The config usually resides in
`~/.config/config-modules/config-modules.yaml` and it is used to both
set up how config-modules behaves as well as to store cache by the
utility. It is self-explanatory, for info about each option look at
[./config.yaml](./config.yaml).

Entryconfig on the other hand is a per-entry config file. You use it to
configure default entry behavior, the most important of which is where
the concatenated static + chosen module should be exported to (export-to
property). An example entryconfig file is
[./examples/config-modules-dir/entries/i3-wm/entryconfig.yaml](./examples/config-modules-dir/entries/i3-wm/entryconfig.yaml),
self-explanatory as well.

## Installation

You can install the package via
[npm](https://www.npmjs.com/package/config-modules):

``` shell
$ npm install config-modules
```

## Initialize the config-modules-dir

Look at [./examples/config-modules-dir](./examples/config-modules-dir)
for the file structure and configuration options you can define in
*entryconfig*.

## Initial run

Upon its first run, specify which directory should be used as
config-modules-dir, like that:

``` shell
$ config-modules --config-modules-dir ~/.config-modules-dir
```

It will as well ask you whether you want it to generate a config file at
`~/.config/config-modules/config-modules.yaml`. This config file is used
both for storing cache by config-modules and by you, to pass
configuration parameters. Press Y to confirm. The default
self-explanatory config file is available at
[./config.yaml](./config.yaml).

## Note

Both config and entryconfig are self-explanatory, meaning their few
parameters are explained with comments in the files. Repeating
parameters in entryconfig (if supported) have precedence over the ones
defined in the default config.

For more info, see `--help`.

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
