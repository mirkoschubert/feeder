'use strict';

const util = require('util'),
      Metas = require(__dirname + '/metas'),
      chalk = require('chalk'),
      fs = require('fs'),
      { Url } = require('url'),
      RssFinder = require('rss-finder'),
      inquirer = require('inquirer'),
      events = require('events');

var Feeds = function(file) {
  this.file = file || __dirname + "/data/feeds.json";
  this.data = {};
  this.entry = {};
}

Feeds.prototype = new events.EventEmitter();

Feeds.prototype.listFeeds = function () {

  var self = this;
  fs.readFile(self.file, 'utf8', function(err, data) {
    if (err) throw err;
    self.data = JSON.parse(data);
    console.log(chalk.white.bgRed("\nThere are %s Feeds in the Queue:\n"), self.data.feeds.length);
    for (var i = 0; i < self.data.feeds.length; ++i) {
      console.log('%s. %s (%s)', i + 1, self.data.feeds[i].name, self.data.feeds[i].url);
      if (self.data.feeds[i].description) {
        console.log(chalk.dim('   %s\n'), self.data.feeds[i].description);
      } else {
        console.log('\n');
      }
    }
    console.log("\n");
  });

}

Feeds.prototype.addFeed = function(url) {

  var self = this;

  console.log('\nReceiving Data...\n');

  self.checkData(url);
  self.on('checked', function(res) {
    self.saveFeed(res);
  });


}

Feeds.prototype.saveFeed = function (data) {

  var self = this;

  if (!data.url || !data.name) {
    return;
  } else {
    self.entry = data;

    fs.readFile(self.file, 'utf8', function(err, data) {
      if (err) throw err;
      self.data = JSON.parse(data);
      self.data.feeds.push({
        name: self.entry.name || "",
        url: self.entry.url,
        description: self.entry.description
      });
      fs.writeFile(self.file, JSON.stringify(self.data, null, 2), 'utf8', function(err) {
        if (err) throw err;
        self.emit('saved', self.entry.url);
      });
    });
  }
}

Feeds.prototype.editFeed = function (id, url) {

}

Feeds.prototype.deleteFeed = function (id) {

}

Feeds.prototype.checkData = function (url) {

  var self = this;
  var entry = {};
  var descBuffer;
  var questions = [];

  if (!url || url.length === 0) throw new Error('You must enter a valid URL!');

  self.url = (!/^(?:f|ht)tps?\:\/\//.test(url)) ? "http://" + url : url || "http://www.nytimes.com/services/xml/rss/nyt/HomePage.xml";
  self.host = self.url.match(/^(?:f|ht)tps?:\/\/(www[0-9]?\.)?(.[^/:]+)/i)[0];

  var metas = new Metas(self.url);

  metas.getMetaDescription(self.host);
  metas.on('found', function(description) {
    descBuffer = description;
  });

  questions.push({
    type: 'input',
    name: 'name',
    message: 'How is the title of the Feed?'
  });


  RssFinder(self.url)
    .then(function(res) {
      var feedurls = res.feedUrls;
      if (!feedurls || feedurls.length === 0) throw new Error('No Feed found. Please search for it manually.');
      if (feedurls.length > 1) {
        questions.push({
          type: 'list',
          name: 'url',
          message: 'Which Feed do you want to add to the list?',
          choices: []
        })
        feedurls.forEach(function(e) {
          questions[questions.length-1].choices.push(e.url);
        });
      }
      inquirer.prompt(questions).then(function(res) {
        entry.name = res.name;
        entry.url = res.url || feedurls[0].url;
        entry.description = descBuffer;

        self.emit('checked', entry)
      });
    })
    .catch(function(err) {
      console.error(err.message);
    });
}

module.exports = Feeds;
