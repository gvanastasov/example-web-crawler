const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');
const xml2js = require('xml2js');

class Crawler {
  constructor({ startUrl, maxDepth = 3, sitemapUrl = null, hooks = {} }) {
    if (!startUrl || !startUrl.startsWith('http')) {
      throw new Error('Invalid start URL');
    }
    this.startUrl = startUrl;
    this.startDomain = new URL(startUrl).origin;
    this.maxDepth = maxDepth;
    this.sitemapUrl = sitemapUrl;
    this.hooks = hooks;

    this.visitedUrls = new Set();
    this.externalUrls = new Set();
    this.siteTree = {};
  }

  async crawl() {
    this.siteTree = { url: this.startUrl, depth: 0, children: [] };

    if (this.sitemapUrl) {
      await this.crawlSitemap(this.sitemapUrl);
    } else {
      await this.crawlUrl(this.startUrl, this.siteTree);
    }
    console.log(`Crawling complete. Found ${this.externalUrls.size} external links.`);
    console.log('External URLs:', Array.from(this.externalUrls));
  }

  async crawlUrl(currentUrl, treeNode, depth = 1) {
    if (depth > this.maxDepth || this.visitedUrls.has(currentUrl)) return;

    try {
      console.log(`Crawling: ${currentUrl} at depth ${depth}`);
      this.visitedUrls.add(currentUrl);

      const response = await axios.get(currentUrl);
      this.handlePageResponse(response, currentUrl);

      const $ = cheerio.load(response.data);
      this.handlePageLoad($, currentUrl);

      const links = this.extractLinks($, currentUrl, depth);
      console.log(`Found ${links.length} links on ${currentUrl}`);
      treeNode.children = links;

      for (const childNode of links) {
        if (childNode.external) {
          this.externalUrls.add(childNode.url);
        } else {
          await this.crawlUrl(childNode.url, childNode, depth + 1);
        }
      }
    } catch (error) {
      console.error(`Error crawling ${currentUrl}: ${error.message}`);
    }
  }

  async crawlSitemap(sitemapUrl) {
    try {
      console.log(`Crawling sitemap: ${sitemapUrl}`);
      const response = await axios.get(sitemapUrl);
      const urls = await this.parseSitemap(response.data);

      for (const loc of urls) {
        if (!this.visitedUrls.has(loc)) {
          const siteTreeNode = { url: loc, depth: 1, children: [] };
          this.siteTree.children.push(siteTreeNode);
          await this.crawlUrl(loc, siteTreeNode, 2);
        }
      }
    } catch (error) {
      console.error(`Error crawling sitemap ${sitemapUrl}: ${error.message}`);
    }
  }

  async findSitemap() {
    const robotsUrl = `${this.startDomain}/robots.txt`;
    try {
      const robotsResponse = await axios.get(robotsUrl);
      const sitemapUrl = this.extractSitemapFromRobots(robotsResponse.data);
      return sitemapUrl || `${this.startDomain}/sitemap.xml`;
    } catch (error) {
      console.error(`Could not fetch robots.txt or find sitemap: ${error.message}`);
      return null;
    }
  }

  // Utility methods
  handlePageResponse(response, currentUrl) {
    const cookies = response.headers['set-cookie'] || [];
    if (this.hooks.onPageResponse) {
      this.hooks.onPageResponse({ url: currentUrl, cookies, status: response.status });
    }
  }

  handlePageLoad($, currentUrl) {
    if (this.hooks.onPageLoad) {
      this.hooks.onPageLoad({ url: currentUrl, $ });
    }
  }

  extractLinks($, currentUrl, depth) {
    const links = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.length > 0) {
        const resolvedUrl = url.resolve(currentUrl, href);
        const isExternal = !resolvedUrl.startsWith(this.startDomain);
        
        if (!isExternal && this.visitedUrls.has(resolvedUrl)) {
          console.warn(`Already visited: ${resolvedUrl}`);
          return;
        }

        links.push({
          url: resolvedUrl,
          depth,
          children: [],
          external: isExternal
        });
        
        if (isExternal) {
          this.externalUrls.add(resolvedUrl);
        }
      } else {
        console.warn(`Found a link with no href attribute: ${$(el).html()}`);
      }
    });
    return links;
  }

  async parseSitemap(data) {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(data);
    return result.urlset.url.map((item) => item.loc[0]);
  }

  extractSitemapFromRobots(robotsText) {
    const sitemapMatch = robotsText.match(/Sitemap:\s*(https?:\/\/\S+)/i);
    return sitemapMatch ? sitemapMatch[1] : null;
  }
}

module.exports = Crawler;
