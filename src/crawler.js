const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');
const xml2js = require('xml2js');

class Crawler {
    visitedUrls = new Set();
    externalUrls = new Set();
    siteTree = {};

    constructor(startUrl, maxDepth = 3, sitemapUrl = null) {
        if (!startUrl || !startUrl.startsWith('http')) {
            throw new Error('Invalid start URL');
        }
        
        this.startUrl = startUrl;
        this.startDomain = new URL(startUrl).origin;
        this.maxDepth = maxDepth;
        this.sitemapUrl = sitemapUrl;
    }

    async crawl() {
        this.siteTree = { url: this.startUrl, depth: 0, children: [] };

        if (this.sitemapUrl) {
            await this.crawlSitemap(this.sitemapUrl);
        } else {
            await this.crawlUrl(this.startUrl, this.siteTree);
        }
        console.log(`Crawling complete. Found ${this.externalUrls.size} external links.`);
        console.log("External URLs:", Array.from(this.externalUrls));
    }

    async crawlUrl(currentUrl, treeNode, depth = 1) {
        if (depth > this.maxDepth || this.visitedUrls.has(currentUrl)) {
            return;
        }

        try {
            console.log(`Crawling: ${currentUrl} at depth ${depth}`);

            this.visitedUrls.add(currentUrl);

            // Fetch the page content
            const response = await axios.get(currentUrl);
            const $ = cheerio.load(response.data);

            const links = [];
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (href && href.length > 0) {
                    const resolvedUrl = url.resolve(currentUrl, href);
                    if (resolvedUrl.startsWith(this.startDomain)) {
                        // Internal link
                        if (!this.visitedUrls.has(resolvedUrl)) {
                            links.push({ url: resolvedUrl, depth, children: [], external: false });
                        } else {
                            console.warn(`Already visited: ${resolvedUrl}`);
                        }
                    } else {
                        // External link
                        links.push({ url: resolvedUrl, depth, children: [], external: true });
                    }
                } else {
                    console.warn(`Found a link with no href attribute: ${$(el).html()}`);
                }
            });

            console.log(`Found ${links.length} links on ${currentUrl}`);

            // Attach children to the current tree node
            treeNode.children = links;

            // Recursively crawl each of the found links
            for (const childNode of treeNode.children) {
                if (childNode.external) {
                    this.externalUrls.add(childNode.url);
                    continue;
                }
                await this.crawlUrl(childNode.url, childNode, depth + 1);
            }
        } catch (error) {
            console.error(`Error crawling ${currentUrl}: ${error.message}`);
        }
    }

    // Crawl the sitemap (if it's provided or found)
    async crawlSitemap(sitemapUrl) {
        try {
            console.log(`Crawling sitemap: ${sitemapUrl}`);
            const response = await axios.get(sitemapUrl);

            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(response.data);

            const urls = [];
            if (result.urlset) {
                result.urlset.url.forEach(item => {
                    const loc = item.loc[0];
                    if (loc) {
                        urls.push(loc);
                    }
                });
            }

            for (const url of urls) {
                if (!this.visitedUrls.has(url)) {
                    this.siteTree.children.push({ url, depth: 1, children: [] });
                    await this.crawlUrl(url, this.siteTree.children[this.siteTree.children.length - 1], 2);
                }
            }

        } catch (error) {
            console.error(`Error crawling sitemap ${sitemapUrl}: ${error.message}`);
        }
    }

    // Check robots.txt or sitemap.xml for a sitemap
    async findSitemap() {
        try {
            const robotsUrl = `${this.startDomain}/robots.txt`;
            const robotsResponse = await axios.get(robotsUrl);

            const robotsText = robotsResponse.data;
            const sitemapMatch = robotsText.match(/Sitemap:\s*(https?:\/\/\S+)/i);

            if (sitemapMatch) {
                return sitemapMatch[1];
            } else {
                const defaultSitemapUrl = `${this.startDomain}/sitemap.xml`;
                return defaultSitemapUrl;
            }
        } catch (error) {
            console.error(`Could not fetch robots.txt or find sitemap: ${error.message}`);
            return null; // No sitemap found
        }
    }
}

module.exports = Crawler;