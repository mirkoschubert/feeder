'use strict';

const Promise = require('promise'),
      RssFinder = require('rss-finder'),
      Metas = require(__dirname + '/metas'),
      fs = require('fs'),
      request = require('request'),
      chalk = require('chalk'),
      inquirer = require('inquirer');


var FeedList = function (file) {

  this.file = file || __dirname + '/../data/feeds.json';
  this.data = {};
}
/**
 * FeedList.list (asynchronous, Stream without Promise)
 * Prints out the whole list of feeds
 * @param  {object}   options   Options
 */
FeedList.prototype.list = function (options) {

  let self = this;

  fs.readFile(self.file, 'utf8', function (err, data) {
    if (err) throw err;
    let listdata = JSON.parse(data);
    console.log(chalk.white.bgRed("\nThere are %s Feeds in the Queue:\n"), listdata.feeds.length);
    for (var i = 0; i < listdata.feeds.length; i++) {
      console.log('%s. %s (%s)', i + 1, listdata.feeds[i].name, listdata.feeds[i].url);
      if (listdata.feeds[i].description) {
        console.log(chalk.dim('   %s\n'), listdata.feeds[i].description);
      } else {
        console.log('\n');
      }
    }
    console.log('\n');
  });
}

/**
 * FeedList.add (asynchronous)
 * Adds a new feed to the list
 * @param  {string}   url   Feed URL
 * @return {Promise}        Added to the list
 */
FeedList.prototype.add = function (url) {

  var self = this;

  self.url = url;

  return new Promise(function (resolve, reject) {

    console.log('\nPreparing the data...\n');

    // TODO: Prevent nesting without losing self!
    self.checkInput(self.url)
    .then((res) => {
      self.save(res)
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        reject(err);
      });
    })
    .catch((err) => {
      reject(err);
    })
  });
}

/**
 * FeedList.save (asynchronous)
 * Saves the data in the feedlist file
 * @param  {Object}   data  data to save
 * @return {Promise}        all done
 */
FeedList.prototype.save = function (data) {

  let self = this;

  return new Promise(function (resolve, reject) {

    if (!data.url || !data.title) {
      reject(new Error('No data found.'));
    } else {
      fs.readFile(self.file, 'utf8', function(err, fdata) {
        if (err) {
          reject(err);
        } else {
          self.data = JSON.parse(fdata);
          self.data.feeds.push({
            name: data.title,
            description: data.description,
            url: data.url
          });
        }
        fs.writeFile(self.file, JSON.stringify(self.data, null, 2), 'utf8', function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    }
  });
}

/**
 * FeedList.checkLinks (asynchronous, stream without Promises)
 * Checks the status of every Feed URL in the queue
 * @param  {Object}   options   Possible Options for later
 */
FeedList.prototype.checkLinks = function (options) {

  let self = this;

  fs.readFile(self.file, 'utf8', function(err, data) {
    if (err) throw err;
    self.data = JSON.parse(data);
    for (var i = 0; i < self.data.feeds.length; ++i) {
      var req =  request(self.data.feeds[i].url);
      req.on('response', function(res) {
        let status = (res.statusCode < 400) ? chalk.yellow(res.statusCode) : chalk.red(res.statusCode);
        console.log(status + '   ' + res.request.uri.href);
      });
    }
  });
}

/**
 * FeedList.checkInput (asynchronous)
 * Checks input variables and askes for more if nessecary
 * @param  {String}   url   Feed URL
 * @return {Promise}        all good
 */
FeedList.prototype.checkInput = function (url) {

  let self = this;
  let validated = self.validateUrl(url);
  let questions = [];
  let output = {};

  return new Promise(function(resolve, reject) {

    // TODO: Get url from RssFinder.site.url to prevent empty description when reading Feedburner
    Promise.all([
      Metas(validated.url, ['og:description', 'description']),
      RssFinder(validated.url)
    ])
    .then(function(res) {
      let desc = res[0], rss = res[1];
      // Check for title
      questions.push({
        type: 'input',
        name: 'title',
        message: 'Enter the title of the Feed:',
        default: rss.site.title || null
      });
      // Check for description
      questions.push({
        type: 'input',
        name: 'description',
        message: 'Enter the description for this Feed:',
        default: function() {
          if (!desc['og:description'] && !desc['description']) {
            return null;
          } else {
            return (desc['og:description']) ? desc['og:description'] : desc['description'];
          }
        }
      });
      // Check for multiple urls
      if (rss.feedUrls.length === 0 ) {
        throw new Error('No Feeds found! Please search for them manually.');
      } else if (rss.feedUrls.length > 1) {
        questions.push({
          type: 'list',
          name: 'url',
          message: 'Which Feed do you want to add to the list?',
          choices: []
        });
        rss.feedUrls.forEach(function(e) {
          questions[questions.length-1].choices.push(e.url);
        });
      } else {
        output.url = rss.feedUrls[0].url;
      }
      inquirer.prompt(questions).then(function(res) {
        output.title = res.title;
        output.description = res.description;
        if (res.url) output.url = res.url;
        resolve(output);
      });

    })
    .catch(function(err) {
      reject(err)
    });
  });
}

/**
 * FeedList.validateUrl (synchronous)
 * Checks URL for protocol and host name
 * @param  {string}   url         URL for validation
 * @return {Object}   {url, host} Validated Data
 */
FeedList.prototype.validateUrl = function (url) {

  if (!url || url.length === 0) {
    throw new Error('URL is empty');
  } else {
    let output = {};
    output.url = (!/^(?:f|ht)tps?\:\/\//.test(url)) ? "http://" + url : url;
    output.host = output.url.match(/^(?:f|ht)tps?:\/\/(www[0-9]?\.)?(.[^/:]+)/i)[0];
    return output;
  }
}

module.exports = FeedList;
