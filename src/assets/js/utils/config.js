/**
 * @author DevRex
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

require('dotenv').config();
const pkg = require('../package.json');
const nodeFetch = require("node-fetch");
const convert = require('xml-js');
let url = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url

let apiConfig = `${url}/api/getConfig.php`;
let apiNews = `${url}/api/getNews.php`;

//Token
const API_TOKEN = process.env.API_TOKEN || '';


class Config {
    async GetConfig() {
        try {
            const res = await nodeFetch(apiConfig, {
                headers: {
                    'X-Launcher-Token': API_TOKEN
                }
            });
            if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
            return await res.json();
        } catch (error) {
            return { error: { message: 'Servidor no accesible', details: error.message } };
        }
    }


    async getInstanceList() {
        let urlInstance = `${url}/files`
        let instances = await nodeFetch(urlInstance).then(res => res.json()).catch(err => err)
        let instancesList = []
        instances = Object.entries(instances)

        for (let [name, data] of instances) {
            let instance = data
            instance.name = name
            instancesList.push(instance)
        }
        return instancesList
    }

    async getNews() {
        const config = await this.GetConfig() || {};

        // Si hay un feed RSS en config.json
        if (config.rss) {
            try {
                const res = await nodeFetch(config.rss);
                if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
                let response = await res.text();
                let parsed = JSON.parse(convert.xml2json(response, { compact: true }));
                let items = parsed?.rss?.channel?.item;
                if (!Array.isArray(items)) items = [items];

                return items.map(item => ({
                    title: item.title._text,
                    content: item['content:encoded']._text,
                    author: item['dc:creator']._text,
                    publish_date: item.pubDate._text
                }));
            } catch (error) {
                console.error(error);
                return [];
            }
        }

        // Si no hay RSS, usar la API por defecto
        try {
            const res = await nodeFetch(apiNews, {
                headers: {
                    'X-Launcher-Token': API_TOKEN
                }
            });
            if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    }
}

export default new Config;