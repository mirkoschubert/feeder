#!/usr/bin/env node --harmony

var chalk = require('chalk');
var app = require('commander');

app
  .version('0.0.1')
  .option('-g, --global', 'Switches to global directory')
  .option('-V, --verbose', 'Switches to Verbose Mode');

app
  .command('init [name]')
  .description('Initializes the Feeder')
  .option('-f, --format <format>', '' )
  .action(function(name, options) {
    var name = name || "default";
    var format = options.format || "json";
    console.log('The feeder with the name \»%s\« is initialized in the %s format.', name, format);
  });

app
  .command('add <url>')
  .description('Adds a new Feed URL to the queue')
  .option('-f, --format <format>', 'Sets the format of the url (Default: xml)')
  .action(function(url, options) {
    var url = url;
    var format = options.format || "xml";
    console.log('The URL %s with a %s format has been added.', url, format);
  });

app
  .command('list')
  .description('Lists all feeds from the queue')
  .action(function() {
    console.log(chalk.white.bgRed('There are X feeds in the queue.'));
  });

app
  .command('pull [id]')
  .description('Pulls all new entries from every feed in the queue')
  .action(function(id) {
    var id = id || "all";
    console.log('Searching for new data in %s feeds...', id);
  });


app.parse(process.argv);
