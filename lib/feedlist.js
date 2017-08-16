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

  let o = self.validateOptions(options, ['title', 'url', 'status']);

  // TODO: Find asynchronous solution
  let feeds = JSON.parse(fs.readFileSync(self.file, 'utf8')).feeds;

  if (o.status) console.log('\nThis may take a while...');

  let promises = [];

  for (var i = 0; i < (options.count || feeds.length); i++) {
    promises.push(self.listEntry(feeds[i], o));
  }
  Promise.all(promises)
    .then((res) => {
      console.log(chalk.white.bgRed("\nThere are %s Feeds in the Queue:\n"), res.length);
      for (var i = 0; i < res.length; i++) {
        // MAGIC :D
        // TODO: magicSpacer also between text and status!
        let max = res.length.toString().length;
        let act = (i + 1).toString().length;
        console.log('%s.%s%s %s %s',
          i + 1,
          self.magicSpacer(max, act, 1),
          (res[i].title) ? res[i].title : '',
          (res[i].url) ? res[i].url : '',
          (res[i].status) ? res[i].status : ''
        );
        if (!o.title && !o.url && !o.status) console.log(self.magicSpacer(max, act, 1, true) + chalk.dim('%s\n'), (res[i].description) ? res[i].description : '');
      }
      console.log('\n');
    })
    .catch((err) => {
      console.error(err);
    });

}


FeedList.prototype.magicSpacer = function (max, actual, offset, big) {

  let d = {};
  d.max = max; // res.length.toString().length
  d.act = actual; // (i + 1).toString().length
  d.off = offset || 0;
  d.big = big || false;

  // xx.[  ]bla
  return (big) ? Array(d.max + d.off + 2).join(' ') : Array(d.max - d.act + d.off + 1).join(' ');
}

/**
 * FeedList.listEntry (asynchronous)
 * Compile the list with options and status
 * @param  {Object}   entry     List Entry
 * @param  {Object}   options   Validated Options
 * @return {Promise}            all is well
 */
FeedList.prototype.listEntry = function (entry, options) {

  let self = this;

  return new Promise(function(resolve, reject) {
    let output = {};
    if (options.status) {
      var req = request(entry.url);

      req.on('error', function(err) {
        reject(err);
      });

      req.on('response', function(res) {
        output.title = (options.title) ? entry.name : '';
        output.url = (options.url) ? entry.url : '';
        output.url = (options.title && output.url != '') ? '(' + output.url + ')' : output.url;
        if (entry.description) output.description = entry.description;
        output.status = (res.statusCode < 400) ? chalk.yellow('[' + res.statusCode + ']') : chalk.red('[' + res.statusCode + ']');
        resolve(output);
      });
    } else if (!options.title && !options.url) {
      output.title = entry.name;
      output.url = '(' + entry.url + ')';
      if(entry.description) output.description = entry.description;
      resolve(output);
    } else {
      output.title = (options.title) ? entry.name : '';
      output.url = (options.url) ? entry.url : '';
      output.url = (options.title && output.url != '') ? '(' + output.url + ')' : output.url;
      if (entry.description) output.description = entry.description;
      resolve(output);
    }
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
 * FeedList.checkStatus (asynchronous)
 * Checks the status of every Feed URL in the queue
 * @param  {String}   url   Feed URL
 */
FeedList.prototype.checkStatus = function (url) {

  return new Promise(function(resolve, reject) {
    let req =  request(url);

    req.on('err', function(err) {
      reject(err);
    });

    req.on('response', function(res) {
      let status = (res.statusCode < 400) ? chalk.yellow('[' + res.statusCode + ']') : chalk.red('[' + res.statusCode + ']');
      resolve(status);
    });

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
 * FeedList.validateOptions (synchronous)
 * Validates the options of an Inquirer instance
 * @param  {Object}   options   Passthrough
 * @param  {Array}    flags     Flags to use
 * @return {Object}             Boolean Flags!
 */
FeedList.prototype.validateOptions = function (options, flags) {

  let self = this;
  let validated = {};

  for (var flag of flags) {
    validated[flag] = (typeof options[flag] !== 'undefined' && options[flag] === true) ? true : false;
    //console.log('%s: %s', flag, validated[flag]);
  }
  return validated;
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
