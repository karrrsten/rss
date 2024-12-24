import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";
import { XMLParser } from "fast-xml-parser";

export default {
	async scheduled(request, env) {
		const parser = new XMLParser({
			ignoreAttributes: false
		})
		const feeds = env.FEEDS
		const prevTimestamp = env.PREV_TIMESTAMP

		env.PREV_TIMESTAMP = Date.now()

		for (const feed of feeds) {
			var text
			try {
				const res = await fetch(feed)
				if (!res.ok) {
					text = "Couldn't fetch " + feed
				}

				const xml = await res.text()
				const parsed = parser.parse(xml)

				var feed_title, timestamp, title, link

				if (feed == "https://thephd.dev/feed.xml") {
					feed_title = parsed.feed.title["#text"]
					const item = parsed.feed.entry[0]
					timestamp = new Date(item.published).getTime()
					title = item.link["@_title"]
					link = item.link["@_href"]
				} else {
					feed_title = parsed.rss.channel.title
					const item = parsed.rss.channel.item[0]
					timestamp = new Date(item.pubDate).getTime()
					title = item.title
					link = item.link
				}

				if (timestamp > prevTimestamp) {
					text = title + '\n' + link
				}
			} catch (e) {
				text = e.message
			}

			if (text) {
				const msg = createMimeMessage();
				msg.setSender({ name: "rss", addr: "rss@benkarstens.com" });
				msg.setRecipient("benkarstens@web.de");
				msg.setSubject(feed_title);
				msg.addMessage({
					contentType: 'text/plain',
					data: text
				});

				var message = new EmailMessage(
					"rss@benkarstens.com",
					"benkarstens@web.de",
					msg.asRaw()
				);
				try {
					await env.email.send(message);
				} catch (e) {
					console.log(e.message)
				}
			}
		}
	}
};