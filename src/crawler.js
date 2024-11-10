const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');

class Crawler {
    visitedUrls = new Set();
    externalUrls = new Set();
    siteTree = {};

    constructor(startUrl, maxDepth = 3) {
        if (!startUrl || !startUrl.startsWith('http')) {
            throw new Error('Invalid start URL');
        }
        
        this.startUrl = startUrl;
        this.startDomain = new URL(startUrl).origin;
        this.maxDepth = maxDepth;
    }

    async crawl() {
        this.siteTree = { url: this.startUrl, depth: 0, children: [] };
        await this.crawlUrl(this.startUrl, this.siteTree);
        console.log(`Crawling complete. Found ${this.externalUrls.size} external links.`);
        console.log("External URLs:", Array.from(this.externalUrls));
        console.log("Site Tree:", JSON.stringify(this.siteTree, null, 2));
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
}

module.exports = Crawler;