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
			const msg = createMimeMessage()
			msg.setSender({ name: "rss", addr: "rss@benkarstens.com" });
			msg.setRecipient("benkarstens@web.de");

			let timestamp
			const res = await fetch(feed)
			const parsed = parser.parse(await res.text())
			if (feed == "https://thephd.dev/feed.xml") {
				msg.setSubject(parsed.feed.title["#text"])
				const item = parsed.feed.entry[0]
				msg.addMessage({
					contentType: 'text/plain',
					data: item.link["@_title"] + '\n' + item.link["@_href"]
				})
				timestamp = new Date(item.published).getTime()
			} else {
				msg.setSubject(parsed.rss.channel.title)
				const item = parsed.rss.channel.item[0]
				msg.addMessage({
					contentType: 'text/plain',
					data: item.title + '\n' + item.link
				})
				timestamp = new Date(item.pubDate).getTime()
			}

			if (timestamp > prevTimestamp) {
				let message = new EmailMessage(
					"rss@benkarstens.com",
					"benkarstens@web.de",
					msg.asRaw()
				)
				await env.email.send(message)
			}
		}
	}
};