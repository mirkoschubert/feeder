#!/usr/bin/env node --harmony
'use strict';

var request = require('request');
var fse = require('fs-extra');
var FeedParser = require('feedparser');
var cheerio = require('cheerio');
var chalk = require('chalk');
var moment = require('moment');
var app = require('commander');

/**
 * Gets Meta Data from a plain HTML site
 * @param  {string} html HTML data
 * @return {[type]}      [description]
 */
function getMeta(html) {


}

// Gets Data from a RSS or XML Feed
function getFeed(feed) {

  var req = request(feed, {timeout: 10000, pool: false});
  var i = 1;

  req.setMaxListeners(50);
  req.setHeader('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36');
  req.setHeader('accept', 'text/html,application/xhtml+xml');

  var feedparser = new FeedParser();

  req.on('error', function(error) {
    console.log(error);
  });

  req.on('response', function(res) {
    var stream = this;
    if (res.statusCode !== 200) {
      this.emit('error', new Error('Bad status code'));
    } else {
      stream.pipe(feedparser);
    }
  });

  feedparser.on('error', function(error) {
    console.log(error);
  });

  feedparser.on('readable', function() {
    var stream = this;
    var meta = this.meta;
    var item;

    while (item = stream.read()) {
      console.log(i + '. ' + chalk.white.bgRed(item.title));
      console.log(moment(item.pubDate).format('DD.MM.YYYY HH:mm Z') + ' - ' + item.author);
      console.log(item.description);
      console.log(item.link + '\n\n');
      i++;
    }
  });
}

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
  .command('pull [feed]')
  .description('Pulls all new entries from every feed in the queue')
  .action(function(feed) {
    var feed = feed || "http://www.nytimes.com/services/xml/rss/nyt/HomePage.xml";
    getFeed(feed);
  });


app.parse(process.argv);
if (app.args.length === 0) app.help();