const Promise = require("bluebird")
const path = require("path")
const select = require(`unist-util-select`)
const fs = require(`fs-extra`)
const RSS = require("rss")
const config = require("./config")
const photos = require(config.photos.list)

exports.createPages = ({ graphql, boundActionCreators }) => {
  const { createPage } = boundActionCreators

  return new Promise((resolve, reject) => {
    const pages = []
    const blogPost = path.resolve("./src/templates/blog-post.js")
    const photoComp = path.resolve("./src/templates/photo.js")

    resolve(
      graphql(`
        {
          allMarkdownRemark(
            sort: { fields: [frontmatter___date], order: DESC }
            limit: 1000
          ) {
            edges {
              node {
                frontmatter {
                  path
                  title
                  desc
                  date(formatString: "DD MMMM, YYYY")
                }
              }
            }
          }
        }
      `).then(result => {
        if (result.errors) {
          console.log(result.errors)
          reject(result.errors)
        }

        const feed = []
        result.data.allMarkdownRemark.edges.forEach(({ node }, i) => {
          if (i < config.journal.feed_size) feed.push(node.frontmatter)

          console.log("create page", node.frontmatter.path)

          createPage({
            path: node.frontmatter.path,
            component: blogPost,
            context: {}
          })
        })

        photos.forEach(photo => {
          createPage({
            path: photo.path,
            component: photoComp,
            context: {}
          })
        })

        saveFeed(feed)
      })
    )
  })
}

function saveFeed(items) {
  const feed = new RSS({
    title: config.journal.title,
    description: config.description,
    feed_url: config.journal.feed_url,
    site_url: config.url,
    image_url: config.journal.image_url
  })

  items.forEach(i =>
    feed.item({
      title: i.title,
      description: i.description,
      url: "https://kodfabrik.com" + i.path,
      date: i.date
    })
  )

  fs.writeFile("./static/rss.xml", feed.xml({ indent: true }))
}
