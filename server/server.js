const fs = require('fs-jetpack')
const crypto = require('crypto')
const glob = require('glob')
const path = require('path')

const maybeUpdateCaddy = (argv, config) => {
  if (!argv.caddy) return

  const newCaddyFile = Object.keys(config.wikiDomains).map((domain) => {
    return `
      ${domain} {
        proxy / localhost:${argv.port} {
          header_upstream Host ${domain}
        }
        tls ${argv.email || "bad@example.com"}
      } 
    `
  }).join('\n\n')

  fs.write(argv.caddy, newCaddyFile)
}


module.exports.startServer = ({argv, app}) => {
  const base = fs.cwd(argv.status).cwd('..').cwd('..')
  console.log("argv", argv, app)

  const members = async () => new Promise((resolve,reject) => {

    glob(path.join(base.cwd(),'**','owner.json'), (er, files) => {
      console.log(er, files)
      if (er) return reject(er)
      resolve(new Set(files.map(f => base.read(f, 'json').friend.secret)))
    })
  })

  const allowedToView = async (req) => {
    const _members = await members()
    console.log(_members, req.session.friend)
    return _members.has(req.session.friend)
    //return false
  }

  app.get('/is_admin', (req, res, next) => {
    console.log("IS ADMIN????")
    if (!app.securityhandler.isAdmin(req)) return next()
    console.log("yest")
    res.json({admin : true})
  })

  app.put('/sites/create/:name', (req, res, next) => {
    if (!app.securityhandler.isAdmin(req)) return next()

    const name = req.params.name  
    const new_url = `${name}.${argv.base_url}`
    console.log('create wiki for ', name)

    const newsite = base.dir(new_url)
    if (newsite.exists('status')){
      console.log('exists, ignoring', newsite.exists('status'),newsite.cwd(), new_url)
      return next()
    }
    newsite.dir('pages')
    newsite.dir('assets')
    const statusdir = newsite.dir('status')
    const id = {name, friend: {secret: crypto.randomBytes(32).toString('hex')}}
    statusdir.write('owner.json', id)

    const config = fs.read(argv.config, 'json')
    config.wikiDomains[new_url] = {
      restricted : true
    }

    maybeUpdateCaddy(argv, config)

    fs.write(argv.config, config)

    res.json(id)
  })

  app.all('*', async (req, res, next) => {
    console.log("GOT HOME REQs", req.url)
    if (!/\.(json|html)$/.test(req.url)){
      return next()
    }

    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Credentials', 'true')
    
    if (req.url === '/welcome-home.json'){
      return next()
    }

    if (await allowedToView(req)){
      return next()
    }

    
    let m = ''
    if (m = req.url.match(/\/(.*)\.html/)){
      return res.redirect(`/view/${m[1]}`) 
    }

    if (req.url === '/system/sitemap.json'){
      console.log("send empty sitemap")
      return res.json([])
    }

    const problem = "This is a restricted wiki requires users to login to view pages. You do not have to be the site owner but you do need to login with a participating email address."
    const details = "[http://ward.asia.wiki.org/login-to-view.html details]"
    res.status(200).json(
      {
        "title": "Login Required",
        "story": [
          {
            "type": "paragraph",
            "id": "55d44b367ed64875",
            "text": `${problem} ${details}`
          }
        ]
      }
    )
  })


  app._router.stack.splice(8,0, app._router.stack.pop())

}