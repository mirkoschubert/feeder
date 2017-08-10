'use strict';

var util = require('util'),
    chalk = require('chalk'),
    fs = require('fs'),
    RssFinder = require('rss-finder'),
    inquirer = require('inquirer'),
    events = require('events');

var Feeds = function(file) {
  this.file = file || "./data/feeds.json";
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
    }
    console.log("\n");
  });

}

Feeds.prototype.addFeed = function(url) {

  var self = this;

  self.checkUrl(url);
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
        url: self.entry.url
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

Feeds.prototype.checkUrl = function (url) {

  var self = this;
  var entry = {};
  var questions = [];

  if (!/^(?:f|ht)tps?\:\/\//.test(url)) {
        self.url = "http://" + url;
  } else {
    self.url = url || "http://www.nytimes.com/services/xml/rss/nyt/HomePage.xml";
  }

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
        self.emit('checked', entry)
      });
    })
    .catch(function(err) {
      console.error(err.message);
    });
}

module.exports = Feeds;
