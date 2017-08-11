# Feeder CLI

**Feeder** is a command-line interface to parse multiple feeds, scrape some extra information such as meta data from websites and export new feed entries for multiple uses. It mainly will be used observing and collecting data for a dictionary website.

## Installation

Since Feeder is written for node.js installing is pretty easy. Fork or download the code and switch to the main folder, then just type the following command in your shell:

```
npm install --global
```
After the first release it also will be available as a npm package.

## Usage

### Add feed to the queue

To generate a queue of multiple feeds just type the following command in your shell:

```
feeder add domain.com
```

Simply follow the instructions on screen. You will be asked for a name which represents the Feed. It will auto-discover the feed and ask for validation if there are found more than one feed. You can also enter full URLs or a specific Feed URL.

The queue list will be saved in the directory of the package under `/data/feeds.json`. Soon it will be possible to specify an alternate path.

### List the whole queue

To show all feeds in the queue please type this command in your shell:

```
feeder list
```

It will display the name and url of each feed as well as a short description, which has been parsed from the `og:dscription` or `description` meta data of the home page.

### Roadmap

- [x] Add Feed to the queue
- [x] List the whole queue
- [ ] Check for broken feed links and remove them from the feed
- [ ] Retrieve and save any new data from all feeds of the queue
- [ ] Read new feed entries in plain text
- [ ] Save any article as text, markdown or html
- [ ] Export any new feed entries to a file as CSV, XML, JSON or HTML
- [ ] Set up a basic configuration for using multiple instances of the Feeder command and saving the data outside the package

## License & Contribution

This software is licensed under the MIT License.

Since I'm new to node.js and asynchronous JavaScript programming and this is actually my first attempt I will be glad for any hints and best practices. Feel free to contact me or contribute with a fork of this project!
