# Example Web Crawler 

This project demonstrates a simple web crawler written in Node.js. The crawler is capable of crawling websites, including detecting and parsing sitemaps, and logging external links. It also supports hooks to allow the user to log additional data, such as cookies from page responses. The crawler can be run from the command line and is highly customizable.

## Features

- Website Crawling: Crawls internal and external links on a website.
- Sitemap Support: Detects and crawls a website's sitemap (either passed as a parameter or detected automatically).
- Hooks: Allows customization through hooks (e.g., logging cookies or analyzing responses).
- Site Tree Generation: Creates a tree of the crawled website structure with depth and links.

## Use Cases

This crawler can be used for various purposes, including but not limited to:

- SEO Audits: Check all the links on a website, including internal and external links.
- Website Monitoring: Monitor the structure of your website to ensure all links are valid and up-to-date.
- Data Scraping: Collect data from various pages by crawling internal and external links.
- Sitemap Analysis: Parse and crawl sitemaps, making it easier to understand website structure.

## Installation

### Prerequisites

- Node.js (v14 or later) should be installed on your machine. You can download and install it from here.

### Steps to install
1. Close this repository
2. Install dependencies


## Usage

### Running the Crawler via CLI

You can run the crawler directly from the command line. The crawler can either automatically detect the sitemap or use a custom sitemap URL passed as a parameter.

Command Syntax:
```bash
node crawler.js --url <start-url> --sitemap <sitemap-url> --max-depth <depth>
```

Parameters:
- --url <start-url>: The starting URL for the crawl (e.g., http://localhost:8000).
- --sitemap <sitemap-url> (optional): A custom sitemap URL (e.g., http://localhost:8000/sitemap.xml). If not provided, the crawler will try to find it automatically via robots.txt or the default /sitemap.xml.
- --max-depth <depth> (optional, default 3): The maximum depth to crawl (1 for just the starting page, 2 for the start page and linked pages, etc.).

### Example Usage

To start crawling a website and follow the links from a custom sitemap. If you don’t specify a sitemap, the crawler will attempt to find it automatically.

```bash
node crawler.js --url http://localhost:8000 --sitemap http://localhost:8000/sitemap.xml --max-depth 3
```

### Hooks
You can customize the crawler's behavior by providing hooks. For example, you could log cookies from the response of each page.

Here is an example of how to set up hooks in a custom JavaScript file:
```js
const Crawler = require('./crawler');

const startUrl = 'http://localhost:8000';
const maxDepth = 3;

const crawler = new Crawler(startUrl, maxDepth, {
    onPageResponse: ({ url, cookies, status }) => {
        console.log(`Page response for ${url}`);
        console.log(`Status: ${status}`);
        console.log(`Cookies: ${cookies.join('; ')}`);
    }
});

crawler.crawl();
```

### Output

- The crawler will print the pages it’s crawling along with their status.
- It will also display the structure of the website (site tree) and external links found.
- If a sitemap is found, it will print the URLs from the sitemap and crawl them.
- The collected external URLs and the full site tree are displayed at the end.

## Example Test Website

You can run a local test server using Node.js and create a simple website for crawling. Here's how you can create a test server and serve pages locally:

```bash
npm run start:web-server
```

The example http-server is having a few test pages, for controlled crawling and testing.

This README.md provides an overview of the crawler tool, how to install and use it, as well as information about its features and customization options with hooks. It also includes a simple test website setup to try out the crawler locally. Highly adviceble not to use this for production purposes, but rather only demo.