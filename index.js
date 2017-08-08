#!/usr/bin/env node --harmony
'use strict';

var request = require('request'),
    MetaStream = require('./lib/metastream'),
    fse = require('fs-extra'),
    RssFinder = require('rss-finder'),
    FeedParser = require('feedparser'),
    chalk = require('chalk'),
    moment = require('moment'),
    inquirer = require('inquirer'),
    app = require('commander');

/**
 * Gets Data from a RSS or XML Feed
 * @param  {string} feed XML data
 * @return {none}
 */
function getFeed(url) {

  var req = request(url, {timeout: 10000, pool: false});
  var i = 1;

  req.setMaxListeners(50);
  req.setHeader('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36');
  req.setHeader('accept', 'text/html,application/xhtml+xml');

  var feedparser = new FeedParser();

  req.on('error', function(err) {
    console.log(err);
  });

  req.on('response', function(res) {
    var stream = this;
    if (res.statusCode !== 200) {
      this.emit('error', new Error('Bad status code'));
    } else {
      stream.pipe(feedparser);
    }
  });

  feedparser.on('error', function(err) {
    RssFinder(url)
      .then(function(res) {
        var questions = {
          type: 'list',
          name: 'feed',
          message: 'Which Feed do you want to pull?',
          choices: []
        }
        res.feedUrls.forEach(function(e) {
          questions.choices.push(e.url);
        });
        inquirer.prompt(questions).then(function(res) {
          getFeed(res.feed);
        });
      })
      .catch(function(err) {
        console.error(err);
      });
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
      console.log(res);
    });

    meta.getMeta();
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
