'use strict';

const Promise = require('promise'),
      FeedParser = require('feedparser'),
      Progress = require('progress'),
      Metas = require(__dirname + '/metas'),
      request = require('request'),
      fs = require('fs');


var Feeds = function (feedlist) {

  this.feedlist = feedlist || __dirname + '/../data/feeds.json'; // FeedList URL
  this.items = [];
  this.i = 0;
}

/**
 * Feeds.update (asynchronous)
 * Loads all Feeds from the queue and saves them in specific files
 * @return {Promise}      all done
 */
Feeds.prototype.update = function () {

  var self = this;
  var urls = [];

  return new Promise(function(resolve, reject) {
    fs.readFile(self.feedlist, 'utf8', function(err, data) {
      if (err) reject(err);
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
    resolve(urls);
  });
}

/**
 * Feeds.load (asynchronous)
 * Loads all entries from a feed
 * @param  {String}   url     Feed URL
 * @param  {Int}      count   How many entries
 * @return {Promise}          finished
 */
Feeds.prototype.load = function (url, count) {

  var self = this;

  self.count = (!count) ? 50 : count;

  return new Promise(function(resolve, reject) {

    let fp = new FeedParser();
    let req = request({
      url: url,
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml'
      }
    });

    req.setMaxListeners(50);

    req.on('error', function(err) {
      reject(err);
    });

    req.on('response', function(res) {

      var stream = this;
      if (res.statusCode != 200) {
        reject(new Error('Bad Status Code'));
      } else {
        stream.pipe(fp);
      }
    });

    fp.on('error', function(err) {
      reject(err);
    });

    fp.on('readable', function() {

      var stream = this;
      var item;

      while (item = stream.read()) {
        if (self.i < self.count) {
          self.items.push({title: item.title, description: '', date: item.pubDate, author: item.author, url: item.link});
        }
        self.i++
      }
    });

    fp.on('end', function() {

      let promises = [];

      for (var i = 0; i < self.items.length; i++) {
        promises.push(Metas(self.items[i], ['description', 'og:description']));
      }
      Promise.all(promises)
        .then(function(res) {
          for (var i = 0; i < self.items.length; i++) {
            self.items[i].description = (res[i]['og:description']) ? res[i]['og:description'] : res[i]['description'];
          }
          resolve(self.items);
        })
        .catch(function(err) {
          reject(err);
        });
    });
  });
}

module.exports = Feeds;
