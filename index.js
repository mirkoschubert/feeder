#!/usr/bin/env node --harmony
'use strict';

const request = require('request'),
      Feeds = require(__dirname + '/lib/feeds'),
      Metas = require(__dirname + '/lib/metas'),
      MetaPromise = require(__dirname + '/lib/metaspromise'),
      FeedStream = require('./lib/feedstream'),
      fse = require('fs-extra'),
      app = require('commander');

app
  .version('0.0.1')
  .option('-g, --global', 'Switches to global directory')
  .option('-V, --verbose', 'Switches to Verbose Mode');

app
  .command('init [name]')
  .description('Initializes the Feeder outside of the package')
  .action(function(name) {
    var name = name || "feeder";
    console.log('The feeder with the name \»%s\« is initialized in the %s format.', name, format);
  });

app
  .command('add [url]')
  .alias('a')
  .description('Adds a new Feed URL to the queue')
  .option('-f, --format <format>', 'Sets the format of the url (Default: xml)')
  .action(function(url, options) {
    var feeds = new Feeds(__dirname + '/data/feeds.json');

    feeds.addFeed(url);
    feeds.on('saved', function(url) {
      console.log('\nThe URL %s  has been added.\n', url);
    });
  });

app
  .command('list')
  .alias('l')
  .description('Lists all feeds from the queue')
  .action(function() {
    var feeds = new Feeds(__dirname + '/data/feeds.json');

    feeds.listFeeds();
  });

app
  .command('check')
  .alias('c')
  .option('-V, --verbose', 'Asks for deletions for every broken entry')
  .description('Checks for broken feed urls and deletes them')
  .action(function(options) {
    var feeds = new Feeds();
    console.log('\nChecking feeds for broken urls...\n');
    feeds.checkLinks(options);
  });

app
  .command('update')
  .description('Updates all Feeds')
  .action(function() {
    var feeds = new Feeds();

    feeds.updateFeeds();
  });

app
  .command('load [url]')
  .description('TEST: Load and parse a Feed url')
  .option('-c, --count <n>', 'Number of entries pulled from the feed', parseInt)
  .action(function(url, options) {
    var feeds = new Feeds();
    feeds.loadFeed(url, options.count);
    feeds.on('articles', function(res) {
      console.log(res);
    });
  });

app
  .command('metatest [url]')
  .description('TEST Metapromises')
  .action(function(url) {
    MetaPromise(url, ['description', 'og:description'])
      .then(function(res) {
        console.log(res);
      });
  });

app
  .command('meta [url]')
  .description('Gets Meta data from url')
  .action(function(url) {

    var meta = new Metas();

    meta.on('error', function(err) {
      console.log(err.message);
    });

    meta.on('loaded', function(res) {
      console.log('Title: ' + res['og:title'] || res.title);
      console.log('Description: ' + res['og:description'] || res.description);
    });

    meta.getMeta(url);
  });

app
  .command('pull [url]')
  .description('Pulls all new entries from every feed in the queue')
  .option('-c, --count <n>', 'Number of entries pulled from the feed', parseInt)
  .action(function(url, options) {
    var feed = new FeedStream();

    feed.on('error', function(err) {
      console.error(err);
    })

    feed.on('loaded', function(res) {
      console.log(res);
    });

    feed.getFeed({ url: url, count: options.count });
  });


app.parse(process.argv);
if (app.args.length === 0) app.help();
