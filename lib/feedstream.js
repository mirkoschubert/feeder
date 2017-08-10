var util = require('util'),
    request = require('request'),
    FeedParser = require('feedparser'),
    RssFinder = require('rss-finder'),
    chalk = require('chalk'),
    moment = require('moment'),
    inquirer = require('inquirer'),
    events = require('events');

var FeedStream = function() {
  this.i = 1;
  this.data = '';
}

FeedStream.prototype = new events.EventEmitter();

FeedStream.prototype.getFeed = function(options) {

  if (!/^(?:f|ht)tps?\:\/\//.test(options.url)) {
        this.url = "http://" + options.url;
  } else {
    this.url = options.url || "http://www.nytimes.com/services/xml/rss/nyt/HomePage.xml";
  }
  this.count = options.count || 100;
  var req = request({
    url: this.url,
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml'
    }
  });
  var self = this;
  var feedparser = new FeedParser();

  req.setMaxListeners(50);

  req.on('error', function(err) {
    console.error(err.message);
  });

  req.on('response', function(res) {
    var stream = this;
    if (res.statusCode != 200) {
      self.emit('error', new Error('Bad Status Code'));
    } else {
      stream.pipe(feedparser);
    }
  });

  feedparser.on('error', function(err) {
    RssFinder(self.url)
      .then(function(res) {
        var questions = {
          type: 'list',
          name: 'url',
          message: 'Which Feed do you want to pull?',
          choices: []
        }
        res.feedUrls.forEach(function(e) {
          questions.choices.push(e.url);
        });
        inquirer.prompt(questions).then(function(res) {
          self.getFeed({ url: res.url, count: self.count });
        });
      })
      .catch(function(err) {
        console.error(err.message);
      })
  });

  feedparser.on('readable', function() {
    var stream = this;
    var item;

//    if (self.count) { console.log('These are the first %j items of the feed:', self.count); }

    while (item = stream.read()) {
      if (self.i <= self.count) {
        console.log(self.i + '. ' + chalk.white.bgRed(item.title));
        console.log('   ' + moment(item.pubDate).format('DD.MM.YYYY HH:mm Z') + ' - ' + item.author);
        console.log('   ' + item.description);
        console.log('   ' + item.link + '\n');
      }
      self.i++;
    }
  });
};

module.exports = FeedStream;
