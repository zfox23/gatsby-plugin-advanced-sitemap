const defaultOptions = {
    query: `
    {
        allMarkdownRemark(sort: {order: ASC, fields: [frontmatter___date]}) {
            edges {
                node {
                    id
                    frontmatter {
                        published_at: date
                        feature_image: image
                    }
                    fields {
                        slug
                    }
                }
            }
        }
  }`,
    mapping: {
        allMarkdownRemark: {
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
    ],
    createLinkInHead: true,
}

export default defaultOptions
