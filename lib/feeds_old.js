'use strict';

const Promise = require('promise'),
      util = require('util'),
      Metas = require(__dirname + '/metas'),
      chalk = require('chalk'),
      moment = require('moment'),
      fs = require('fs'),
      Progress = require('progress'),
      RssFinder = require('rss-finder'),
      FeedParser = require('feedparser'),
      inquirer = require('inquirer'),
      request = require('request'),
      events = require('events');

var Feeds = function(file) {
  this.file = file || __dirname + "/../data/feeds.json";
  this.html = '';
  this.data = {};
  this.entry = {};
  this.items = [];
  this.i = 1;
}

Feeds.prototype = new events.EventEmitter();

// FeedList
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

// Feeds
Feeds.prototype.updateFeeds = function () {

  var self = this;
  var urls = [];

  fs.readFile(self.file, 'utf8', function(err, data) {
    if (err) throw err;
    self.data = JSON.parse(data);
    var progress = new Progress('Updating Feeds |:bar| :percent', {
      complete: '\u2593',
      incomplete: '\u2591',
      width: 40,
      total: self.data.feeds.length
    });
    for (var i = 0; i < self.data.feeds.length; ++i) {
      urls.push(self.data.feeds[i].url);
    }
  });
}

// FeedList
Feeds.prototype.addFeed = function(url) {

  var self = this;

  console.log('\nReceiving Data...\n');

  self.checkData(url);
  self.on('checked', function(res) {
    self.saveFeed(res);
  });


}

// Feeds
Feeds.prototype.loadFeed = function (url, count) {

  var self = this;
  var fp = new FeedParser();

  self.url = url;
  self.count = (!count) ? 50 : count;


  var req = request({
    url: self.url,
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml'
    }
  });

  req.setMaxListeners(50);

  req.on('error', function(err) {
    console.error(err.message);
  });

  req.on('response', function(res) {

    var stream = this;
    if (res.statusCode != 200) {
      self.emit('error', new Error('Bad Status Code'));
    } else {
      stream.pipe(fp);
    }
  });


  fp.on('error', function(err) {
    console.error(err.message);
  });

  fp.on('readable', function() {

    var stream = this;
    var meta = this.meta;
    var item;

    while (item = stream.read()) {
      if (self.i <= self.count) {
        self.items.push({title: item.title, description: '', date: item.pubDate, author: item.author, url: item.link});
      }
      self.i++
    }
  });

  fp.on('end', function() {

    var promises = [];

    for (var i = 0; i < self.items.length; i++) {
      promises.push(Metas(self.items[i], ['description', 'og:description']));
    }

    Promise.all(promises)
      .then(function(res) {
        for (var i = 0; i < self.items.length; i++) {
          self.items[i].description = (res[i]['og:description']) ? res[i]['og:description'] : res[i]['description'];
        }
        self.emit('articles', self.items);
      })
      .catch(function(err) {
        console.error(err);
      });
  });


}

// FeedList
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

// TODO: FeedList
Feeds.prototype.editFeed = function (id, url) {

}

// TODO: FeedList
Feeds.prototype.deleteFeed = function (id) {

}

// FeedList
Feeds.prototype.checkLinks = function (options) {

  var self = this;

  fs.readFile(self.file, 'utf8', function(err, data) {
    if (err) throw err;
    self.data = JSON.parse(data);
    for (var i = 0; i < self.data.feeds.length; ++i) {
      var req =  request(self.data.feeds[i].url);
      req.on('response', function(res) {
        console.log(chalk.yellow(res.statusCode) + '   ' + res.request.uri.href);
      });
    }
  });
}

// FeedList
Feeds.prototype.checkData = function (url) {

  var self = this;
  var entry = {};
  var descBuffer;
  var questions = [];

  if (!url || url.length === 0) throw new Error('You must enter a valid URL!');

  self.url = (!/^(?:f|ht)tps?\:\/\//.test(url)) ? "http://" + url : url || "http://www.nytimes.com/services/xml/rss/nyt/HomePage.xml";
  self.host = self.url.match(/^(?:f|ht)tps?:\/\/(www[0-9]?\.)?(.[^/:]+)/i)[0];

  Metas(self.url, ['description', 'og:description'])
    .then(function(res) {
      descBuffer = (res['og:description']) ? res['og:description'] : res['description'];
    })
    .catch(function(err) {

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
