const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');

class Crawler {
    visitedUrls = new Set();

    constructor(startUrl, maxDepth = 3) {
        if (!startUrl || !startUrl.startsWith('http')) {
            throw new Error('Invalid start URL');
        }
        
        this.startUrl = startUrl;
        this.maxDepth = maxDepth;
    }

    async crawl() {
        await this.crawlUrl(this.startUrl);
    }

    async crawlUrl(currentUrl, depth = 1) {
        if (depth > maxDepth || this.visitedUrls.has(currentUrl)) {
            return;
        }

        try {
            console.log(`Crawling: ${currentUrl} at depth ${depth}`);

            this.visitedUrls.add(currentUrl);

            const response = await axios.get(currentUrl);

            const $ = cheerio.load(response.data);

            const links = [];
            $('a').each((i, el) => {
                const link = $(el).attr('href');
                if (link && link.startsWith('http')) {
                    links.push(link);
                }
            });

            console.log(`Found ${links.length} links on ${currentUrl}`);

            for (const link of links) {
                const absoluteUrl = url.resolve(currentUrl, link);
                await this.crawlUrl(absoluteUrl, depth + 1);
            }
        } catch (error) {
            console.error(`Error crawling ${currentUrl}: ${error.message}`);
        }
    }
}

module.exports = Crawler;