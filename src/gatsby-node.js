import path from 'path'
import url from 'url'
import fs from 'fs-extra'
import _ from 'lodash'

import defaultOptions from './defaults'
import Manager from './SiteMapManager'

const PUBLICPATH = `./public`
const INDEXFILE = `/sitemap.xml`
const RESOURCESFILE = `/sitemap-:resource.xml`
const XSLFILE = path.resolve(__dirname, `./static/sitemap.xsl`)
const DEFAULTQUERY = `{
  allSitePage {
    edges {
      node {
        slug: path
        url: path
      }
    }
  }
  site {
    siteMetadata {
      siteUrl
    }
  }
}`
let siteUrl

const runQuery = (handler, { query, exclude }) => handler(query).then((r) => {
    if (r.errors) {
        throw new Error(r.errors.join(`, `))
    }

    for (let source in r.data) {
        // Removing excluded paths
        if (r.data[source] && r.data[source].edges && r.data[source].edges.length) {
            r.data[source].edges = r.data[source].edges.filter(({ node }) => !exclude.some((excludedRoute) => {
                const slug = source === `allMarkdownRemark` ? node.fields.slug.replace(/^\/|\/$/, ``) : node.slug.replace(/^\/|\/$/, ``)
                excludedRoute = excludedRoute.replace(/^\/|\/$/, ``)

                return slug.indexOf(excludedRoute) >= 0
            }))
        }
    }

    return r.data
})

const copyStylesheet = async ({ siteUrl, indexOutput }) => {
    const siteRegex = /(\{\{blog-url\}\})/g

    // Get our stylesheet template
    const data = await fs.readFile(XSLFILE)

    // Replace the `{{blog-url}}` variable with our real site URL
    const sitemapStylesheet = data.toString().replace(siteRegex, url.resolve(siteUrl, indexOutput))

    // Save the updated stylesheet to the public folder, so it will be
    // available for the xml sitemap files
    await fs.writeFile(path.join(PUBLICPATH, `sitemap.xsl`), sitemapStylesheet)
}

const serializeMarkdownNodes = (node) => {
    if (!node.fields.slug) {
        throw Error(`\`slug\` is a required field`)
    }

    node.slug = node.fields.slug

    delete node.fields.slug

    if (node.frontmatter) {
        if (node.frontmatter.published_at) {
            node.published_at = node.frontmatter.published_at
            delete node.frontmatter.published_at
        }
        if (node.frontmatter.feature_image) {
            node.feature_image = node.frontmatter.feature_image
            delete node.frontmatter.feature_image
        }
    }

    return node
}

const getNodePath = (node, allSitePage, sitePrefix, pathPrefix) => {
    if (!node.slug) {
        return node
    }
    const slugRegex = new RegExp(`${node.slug.replace(/\/$/, ``)}$`, `gi`)

    node.path = path.join(sitePrefix, pathPrefix, node.slug)

    for (let page of allSitePage.edges) {
        if (page.node && page.node.url && page.node.url.replace(/\/$/, ``).match(slugRegex)) {
            node.path = page.node.url
            break;
        }
    }

    return node
}

const serialize = ({ ...sources },{ site, allSitePage }, mapping, pathPrefix) => {
    const nodes = []
    const sourceObject = {}

    siteUrl = site.siteMetadata.siteUrl

    for (let source in sources) {
        if (mapping[source] && mapping[source].source) {
            const currentSource = sources.hasOwnProperty(source) ? sources[source] : []

            if (currentSource) {
                sourceObject[mapping[source].source] = sourceObject[mapping[source].source] || []
                currentSource.edges.map(({ node }) => {
                    if (!node) {
                        return
                    }

                    if (source === `allMarkdownRemark`) {
                        node = serializeMarkdownNodes(node)
                    }

                    node = getNodePath(node, allSitePage, pathPrefix, mapping[source].path)

                    sourceObject[mapping[source].source].push({
                        url: url.resolve(siteUrl, node.path),
                        node: node,
                    })
                })
        }
        }
    }
    nodes.push(sourceObject)

    return nodes
}

const getResourceNames = (mapping) => {
    let sourceNames = []

    for (let resourceType in mapping) {
        sourceNames.push(mapping[resourceType])
    }

    sourceNames = _.map(sourceNames, (source) => {
        return {
            name: source.name,
            source: source.source
        }
    })

    sourceNames = _.uniqBy(sourceNames, `name`)

    return sourceNames
}

export const onPostBuild = async ({ graphql, pathPrefix }, pluginOptions) => {
    const options = Object.assign(defaultOptions, options, pluginOptions)

    delete options.plugins
    delete options.createLinkInHead

    const { mapping } = options

    options.indexOutput = INDEXFILE
    options.resourcesOutput = RESOURCESFILE

    const indexSitemapFile = path.join(PUBLICPATH, INDEXFILE)
    const resourcesSitemapFile = path.join(PUBLICPATH, RESOURCESFILE)

    const defaultQueryRecords = await runQuery(
        graphql,
        {query: DEFAULTQUERY, exclude: options.exclude}
    )

    const queryRecords = await runQuery(
        graphql,
        options
    )

    // Instanciate the Ghost Sitemaps Manager
    const manager = new Manager(options)

    serialize(queryRecords, defaultQueryRecords, mapping, pathPrefix).forEach((source) => {
        for (let type in source) {
            source[type].forEach((node) => {
                // "feed" the sitemaps manager with our serialized records
                manager.addUrls(type, node)
            })
        }
    })

    // The siteUrl is only available after we have the returned query results
    options.siteUrl = siteUrl

    await copyStylesheet(options)

    const resourcesSiteMapsArray = []

    options.sources = getResourceNames(mapping)

    options.sources.forEach((type) => {
        resourcesSiteMapsArray.push({
            type: type.name,
            xml: manager.getSiteMapXml(type.source, options),
        })
    })

    const indexSiteMap = manager.getIndexXml(options)

    // Save the generated xml files in the public folder
    try {
        await fs.writeFile(indexSitemapFile, indexSiteMap)

        resourcesSiteMapsArray.forEach(async (sitemap) => {
            const filePath = resourcesSitemapFile.replace(/:resource/, sitemap.type)
            await fs.writeFile(filePath, sitemap.xml)
        })
    } catch (err) {
        console.error(err)
    }

    return
}
