# gatsby-plugin-advanced-sitemap

The default Gatsby sitemap plugin generates a simple blob of raw XML for all your pages. This **advanced sitemap plugin** adds more power and configuration, generating a single or multiple sitemaps with full XSL templates to make them neatly organised and human + machine readable, as well linking image resources to encourage media indexing.

**Demo:** https://docs.ghost.org/sitemap.xml 


&nbsp;

![example](https://user-images.githubusercontent.com/120485/53390652-61491c80-39c6-11e9-9b5c-280672614bdb.png)

_NOTE: This plugin only generates output in `production` mode! To test, run: `gatsby build && gatsby serve`_

&nbsp;


## Install

`npm install --save gatsby-plugin-advanced-sitemap`

## How to Use

By default this plugin will generate a single sitemap of all pages on your site, without any configuration needed.

```javascript
// gatsby-config.js

const plugins = [
    `gatsby-plugin-advanced-sitemap`
]
```

&nbsp;

## Options

If you want to generate advanced, individually organised sitemaps based on your data, you can do so by passing in a query and config. The example below uses [Ghost](https://ghost.org), but this should work with any data source - including Pages, Markdown, Contentful, etc.

Example:

```javascript
// gatsby-config.js
plugins: [
    {
        resolve: `gatsby-plugin-advanced-sitemap`,
        options: {
            query: `
            {
                allGhostPost(sort: {order: ASC, fields: published_at}) {
                    edges {
                        node {
                            id
                            slug
                            updated_at
                            created_at
                            feature_image
                        }
                    }
                }
                allGhostPage(sort: {order: ASC, fields: published_at}) {
                    edges {
                        node {
                            id
                            slug
                            updated_at
                            created_at
                            feature_image
                        }
                    }
                }
                allGhostTag(sort: {order: ASC, fields: name}) {
                    edges {
                        node {
                            id
                            slug
                            feature_image
                        }
                    }
                }
                allGhostAuthor(sort: {order: ASC, fields: name}) {
                    edges {
                        node {
                            id
                            slug
                            profile_image
                        }
                    }
                }
            }`,
            mapping: {
                allGhostPost: {
                    name: `posts`,
                    path: `/`,
                    source: `posts`,
                },
                allGhostTag: {
                    name: `tags`,
                    path: `tag`,
                    source: `tags`,
                },
                allGhostAuthor: {
                    name: `authors`,
                    path: `author`,
                    source: `authors`,
                },
                allGhostPage: {
                    name: `pages`,
                    path: `/`,
                    source: `pages`,
                },
            },
            exclude: [
                `/dev-404-page`,
                `/404`,
                `/404.html`,
                `/offline-plugin-app-shell-fallback`,
                `/data-schema`,
                `/data-schema-author`,
                `/data-schema-page`,
            ],
            createLinkInHead: true,
        }
    }
]
```

Example output of ☝️ this exact config 👉 https://gatsby.ghost.org/sitemap.xml

&nbsp;

# Copyright & License

Copyright (c) 2019 [Ghost Foundation](https://ghost.org) - Released under the [MIT license](LICENSE).
