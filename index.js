#!/usr/bin/env node --harmony
'use strict';

var request = require('request'),
    MetaStream = require('./lib/metastream'),
    FeedStream = require('./lib/feedstream'),
    fse = require('fs-extra'),
    app = require('commander');

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
  .command('meta [url]')
  .description('Gets Meta data from url')
  .action(function(url) {

    var meta = new MetaStream({
      url: url
    });

    meta.on('error', function(err) {
      console.log(err);
    });

    meta.on('loaded', function(res) {
      console.log('Title: ' + res['og:title'] || res.title);
      console.log('Description: ' + res['og:description'] || res.description);
    });

    meta.getMeta();
  });

app
  .command('pull [feed]')
  .description('Pulls all new entries from every feed in the queue')
  .option('-c, --count <n>', 'Number of entries pulled from the feed', parseInt)
  .action(function(url) {
    var feed = new FeedStream();

    feed.on('error', function(err) {
      console.error(err);
    })

    feed.on('loaded', function(res) {
      console.log(res);
    });

    feed.getFeed({ url: url, count: this.count });
  });


app.parse(process.argv);
if (app.args.length === 0) app.help();
