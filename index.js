#!/usr/bin/env node --harmony
'use strict';

const Promise = require('promise'),
      request = require('request'),
      FeedList = require(__dirname + '/lib/feedlist'),
      Feeds = require(__dirname + '/lib/feeds'),
      Metas = require(__dirname + '/lib/metas'),
      fse = require('fs-extra'),
      chalk = require('chalk'),
      moment = require('moment'),
      app = require('commander');


var feedlist = new FeedList();
var feeds = new Feeds();

app
  .version('0.0.1')
  .option('-g, --global', 'Switches to global directory')
  .option('-V, --verbose', 'Switches to Verbose Mode');

app
  .command('init [name]')
  .description('Initializes the Feeder outside of the package')
  .action(function(name) {
    var name = name || "feeder";
    console.log('The feeder with the name "%s" is initialized in the %s format.', name, format);
  });

app
  .command('list')
  .alias('l')
  .description('Lists all feeds from the queue')
  .action(function() {
    feedlist.list();
  });

app
  .command('add [url]')
  .alias('a')
  .description('Adds a new Feed URL to the queue')
  .option('-f, --format <format>', 'Sets the format of the url (Default: xml)')
  .action(function(url, options) {
    feedlist.add(url)
      .then((res) => {
        console.log('\n' + chalk.white.bgRed('The Feed "%s" has been added.') + '\n', res.title);
      })
      .catch((err) => {
        console.error(err.message);
      });
  });

app
  .command('check')
  .alias('c')
  .option('-V, --verbose', 'Asks for deletions for every broken entry')
  .description('Checks for broken feed urls and deletes them')
  .action(function(options) {
    var feeds = new Feeds();
    console.log('\nChecking feeds for broken urls...\n');
    feedlist.checkLinks(options);
  });

app
  .command('update')
  .description('Updates all Feeds')
  .action(function() {
    console.log('\nUpdating all feeds...\n');
    feeds.update();
  });

app
  .command('load [url]')
  .description('TEST: Load and parse a Feed url')
  .option('-c, --count <n>', 'Number of entries pulled from the feed', parseInt)
  .action(function(url, options) {
    console.log('\nLoading the feed %s ...\n', url);
    feeds.load(url, options.count)
      .then(function (res) {
        for (var i = 0; i < res.length; i++) {
          console.log((i + 1) + '. ' + chalk.white.bgRed(res[i].title));
          console.log('   ' + moment(res[i].pubDate).format('DD.MM.YYYY HH:mm Z') + ' - ' + res[i].author);
          console.log('   ' + chalk.dim(res[i].description));
          console.log('   ' + res[i].url + '\n');
        }
      })
      .catch(function (err) {
        console.error(err.message);
      });
  });

app
  .command('meta [url]')
  .description('Gets Meta data from url')
  .action(function(url) {
    MetaPromise(url)
      .then(function(res) {
        console.log('\n');
        for (var k in res) {
          console.log('[%s]  %s', chalk.red(k), res[k]);
        }
        console.log('\n');
      })
      .catch(function(err) {
        console.error(err.message);
      })
  });

app.parse(process.argv);
if (app.args.length === 0) app.help();
