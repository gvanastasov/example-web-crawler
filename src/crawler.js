const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');

class Crawler {
    visitedUrls = new Set();
    externalUrls = new Set();

    constructor(startUrl, maxDepth = 3) {
        if (!startUrl || !startUrl.startsWith('http')) {
            throw new Error('Invalid start URL');
        }
        
        this.startUrl = startUrl;
        this.startDomain = new URL(startUrl).origin;
        this.maxDepth = maxDepth;
    }

    async crawl() {
        await this.crawlUrl(this.startUrl);
        console.log(`Crawling complete. Found ${this.externalUrls.size} external links.`);
        console.log("External URLs:", Array.from(this.externalUrls));
    }

    async crawlUrl(currentUrl, depth = 1) {
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
                            links.push(resolvedUrl);
                        } else {
                            console.warn(`Already visited: ${resolvedUrl}`);
                        }
                    } else {
                        // External link
                        this.externalUrls.add(resolvedUrl);
                    }
                } else {
                    console.warn(`Found a link with no href attribute: ${$(el).html()}`);
                }
            });

            console.log(`Found ${links.length} links on ${currentUrl}`);

            // Recursively crawl each of the found links
            for (const link of links) {
                await this.crawlUrl(link, depth + 1);
            }
        } catch (error) {
            console.error(`Error crawling ${currentUrl}: ${error.message}`);
        }
    }
}

module.exports = Crawler;