(function wikiPluginHome(){
  
let state = {}

const addCSS = () => {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
  .sidebar {
    margin: 0;
    z-index: 100;
    position: fixed;
    left:0;
    width: 128px;
    background-color: darkgray;
  }

  .main {
    padding-left: 136px;   
  }
  
  .sidebar-button {
    /*from bootstrap*/
    background-color: #f5f5f5;
    *background-color: #e6e6e6;
    background-image: -ms-linear-gradient(top, #ffffff, #e6e6e6);
    background-image: -webkit-gradient(linear, 0 0, 0 100%, from(#ffffff), to(#e6e6e6));
    background-image: -webkit-linear-gradient(top, #ffffff, #e6e6e6);
    background-image: -o-linear-gradient(top, #ffffff, #e6e6e6);
    background-image: linear-gradient(top, #ffffff, #e6e6e6);
    background-image: -moz-linear-gradient(top, #ffffff, #e6e6e6);
    background-repeat: repeat-x;
    border: 1px solid #cccccc;
    *border: 0;
    border-color: rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.25);
    border-color: #e6e6e6 #e6e6e6 #bfbfbf;
    border-bottom-color: #b3b3b3;
    -webkit-border-radius: 4px;
       -moz-border-radius: 4px;
            border-radius: 4px;
    -webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 1px 2px rgba(0, 0, 0, 0.05);
       -moz-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 1px 2px rgba(0, 0, 0, 0.05);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 1px 2px rgba(0, 0, 0, 0.05);
  
    /*custom*/
    display: inline-block;
    white-space: normal;
    position: relative;
    top: 2px;
    left: 3px;
    font-size: 0.9em;
    text-align: center;
    text-decoration: none;
    padding: 0.2em;
    margin-bottom: 2px;
    color: #2c3f39;
  }
  `
  document.getElementsByTagName('head')[0].appendChild(style);
}

const getSitemap = async () => {
  while (!wiki || !wiki.neighborhood[location.host] || !wiki.neighborhood[location.host].sitemap){
    await waitIdle()
  }
  console.log("HAVE??????", wiki.neighborhood[location.host].sitemap)
  return wiki.neighborhood[location.host].sitemap
}

const initialize = () => {
  addCSS()

  $(document.body).on('new-neighbor-done', (event, site) => {
    state.sitemap = wiki.neighborhood[location.host].sitemap || []
    state.sitemap_changed = true
    console.log('new neighboor done', event, site)
  })
}

const getInitialState = async (item) => { 
  const state = {item}
  state.sitemap = await getSitemap()

  state.item_changed = true
  state.sitemap_changed = true
  return state
}

const updateIndex = async ($index) => {
  const sitemap = state.sitemap.sort(({date : a}, {date : b}) => b - a )

  const $table = $('<table style="width:100%;"></table>')

  console.log("SITEMAP", sitemap)

  for (const entry of sitemap){
    console.log(entry.title)
    const $row = $(`
      <tr style="display:flex;justify-content:space-between;">
        <td>
          <a class="internal" href="/${entry.slug}.html" title="view" data-page-name="${entry.slug}">
            ${entry.title}
          </a>
        </td>
      </tr>
    `)

    $table.append($row)
  }

  $index.empty()

  $index.append(`
    <h3 style>Pages</h3>
  `)

  $index.append($table)
}

function toHexString(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}

const makeCreatePageButton = (item) => {
  const $create_page = $(`<button class="sidebar-button">Create Page</button>`)

  $create_page.click((e) => {
    const title = prompt(
      'Enter new page title',
      'new page title'
    )

    wiki.origin.put(
      wiki.asSlug(title), 
      {type: 'create', id: wiki.asSlug(title), date : Date.now(), item: {title, story: [
        {
          text : 'Double Click to Start Editing',
          type : 'paragraph',
          id : toHexString(crypto.getRandomValues(new Uint8Array(8))).toLowerCase()
        }
      ]}},
      (err) => {
        console.log('put page?', title, err)
        wiki.neighborhood[location.host] = null
        wiki.neighborhoodObject.retryNeighbor(location.host)
        wiki.doInternalLink(title)
      }
    ) 
  })

  return $create_page
}

const makeDeletePageButton = (item) => {
  const $delete_page = $(`<button class="sidebar-button">Delete Page</button>`)

  $delete_page.click((e) => {
    const title = prompt(
      ['Type title of page to delete:'].concat(state.sitemap.map(({title}) => title)).join('\n'),
      'page to delete'
    )

    const slug = wiki.asSlug(title)

    wiki.origin.delete(`${slug}.json`, (e) => {
      wiki.neighborhood[location.host] = null
      wiki.neighborhoodObject.retryNeighbor(location.host) 
    })    

  })

  return $delete_page
}

const makeCreateWorkspaceButton = ($controls, item) => {
  const $create_workspace = $(`<button class="sidebar-button">Create Workspace</button>`)

  $create_workspace.click((e) => {
    const title = prompt(
      'Type title of new Workspace:',
      'New Workspace'
    )

    if (item.workspaces[title]) return alert('Workspace by that name already exists. Ignoring')

    item.workspaces[title] = []
    
    const $page = $controls.parents('.page:first')
    
    wiki.pageHandler.put($page, {type: 'edit', id: item.id, item: item})

    state.item_changed = true
    state.item = item
  })

  return $create_workspace
}

const makeDeleteWorkspaceButton = ($controls, item) => {
  const $delete_workspace = $(`<button class="sidebar-button">Delete Workspace</button>`)

  $delete_workspace.click((e) => {
    const title = prompt(
      ['Type title of workspace to delete:'].concat(Object.keys(item.workspaces)).join('\n'),
      'page to delete'
    )

    if (!item.workspaces[title]) return alert(`Workspace by that name doesn't exist. Ignoring`)

    item.workspaces = Object.keys(item.workspaces).filter(k => k !== title).reduce((o,k) => ({
      [k] : item.workspaces[k],
      ...o
    }),{})
    
    const $page = $controls.parents('.page:first')
    
    wiki.pageHandler.put($page, {type: 'edit', id: item.id, item: item})

    state.item_changed = true
    state.item = item
  })

  return $delete_workspace
}

const makeAddWorkspacePageButtton = ($controls, item) => {
  const $add_workspace_page = $(`<button class="sidebar-button">Add Workspace Page</button>`)

  $add_workspace_page.click((e) => {
    const title = prompt(
      ['Type title of workspace to add a page to:'].concat(Object.keys(item.workspaces)).join('\n'),
      'Workspace to add page to'
    )

    if (!item.workspaces[title]) return alert(`Workspace by that name doesn't exist. Ignoring`)

    const page = prompt(
      ['Type page to add to workspace:'].concat(state.sitemap.map(({title}) => title)).join('\n'),
      'page to add'
    )

    if (!state.sitemap.map(({title}) => title).filter(t => t === page).length) return alert('page not found. Ignoring')

    if (item.workspaces[title].filter(t => t === page).length) return alert('page already in workspace. Ignoring')

    item.workspaces[title] = item.workspaces[title].concat([page])
    
    const $page = $controls.parents('.page:first')
    
    wiki.pageHandler.put($page, {type: 'edit', id: item.id, item: item})

    state.item_changed = true
    state.item = item
  })

  return $add_workspace_page
}

const makeDeleteWorkspacePageButton = ($controls, item) => {
  const $add_workspace_page = $(`<button class="sidebar-button">Remove Workspace Page</button>`)

  $add_workspace_page.click((e) => {
    const title = prompt(
      ['Type title of workspace to remove a page froom:'].concat(Object.keys(item.workspaces)).join('\n'),
      'Workspace to add page to'
    )

    if (!item.workspaces[title]) return alert(`Workspace by that name doesn't exist. Ignoring`)

    const page = prompt(
      ['Type page to remove from workspace:'].concat(item.workspaces[title]).join('\n'),
      'page to remove'
    )

    if (!item.workspaces[title].filter(t => t === page).length) return alert('page not in workspace. Ignoring')

    item.workspaces[title] = item.workspaces[title].filter(t => t !== page)
    
    const $page = $controls.parents('.page:first')
    
    wiki.pageHandler.put($page, {type: 'edit', id: item.id, item: item})

    state.item_changed = true
    state.item = item
  })

  return $add_workspace_page
}

const makeControlsAuthenticatedButtons = ($controls, item) => ([
  makeCreatePageButton(item),
  makeDeletePageButton(item),
  makeCreateWorkspaceButton($controls, item),
  makeDeleteWorkspaceButton($controls, item),
  makeAddWorkspacePageButtton($controls, item),
  makeDeleteWorkspacePageButton($controls, item)
])

const makeControlsClaimedButtons = ($controls, item) => {
  const $Login = $(`<button class="sidebar-button">Login</button>`)

  $Login.click((e) => {
    console.log("BUTTON CLICK")
    const $reclaim = $(`[title="Reclaim this Wiki"]`)
    console.log($reclaim)

    $reclaim.trigger('click')
  })

  return [$Login]       
  
}

const makeControlsUnclaimedButtons = ($controls, item) => {
  const $Login = $(`<button class="sidebar-button">Claim</button>`)

  $Login.click((e) => {
    const $reclaim = $(`[title="Claim this Wiki"]`)
    console.log("CLAIM", $reclaim)
    $reclaim.trigger('click')
  })

  return [$Login]  
}

const updateControls = ($controls) => {
  console.log("IIIIIIII", state.item)
  const item = state.item

  let buttons = null
  if (state.isAuthenticated){
    console.log('isAuthenticcated')
    buttons = makeControlsAuthenticatedButtons($controls,item)
  } else if (state.isClaimed){
    buttons = makeControlsClaimedButtons(item)
  } else {
    buttons = makeControlsUnclaimedButtons(item)
  }
  console.log('conrols', $controls)

  $controls.empty()
  for (const $button of buttons){
    $controls.append($button)
  }

}

const createControls = ($page, item) => {
  const $controls = $(`<div class="sidebar-controls"></div>`)
  $page.append($controls)
  return $controls
}

const makeControlsClaimButtons = ($page, item) => {
  const $claim = $(`<button class="sidebar-button">${"Claim Wiki"}</button>`)

  $claim.click((e) => {
    const $reclaim = $(`select[title="Claim this Wiki"]`)
    console.log("CLAIM CLICK")
    $reclaim.trigger('click')
  })

  return [$claim]
}

const updateWorkspaces = ($workspaces) => {
  const item = state.item
  console.log('item', item)
  item.workspaces = item.workspaces || {}

  const $table = $('<table style="width:100%;"></table>')

  for (const name in item.workspaces){
    const $space = $(`
      <tr style="display:flex;justify-content:space-between;">
        <td>
          <a class="workspace" href="#" title="view">
            ${name}
          </a>
        </td>
      </tr>
    `)

    $space.click(() => {
      const slugs = item.workspaces[name]
      let $first = $('.page:first')
      for (const slug of slugs){
        wiki.doInternalLink(slug, $first)
        $first = undefined
      }
    })

    $table.append($space)
  }

  $workspaces.empty()

  $workspaces.append(`
    <h3>Workspaces</h3>
  `)

  $workspaces.append($table)
}

const waitIdle = async () => new Promise(resolve => setTimeout(() => requestIdleCallback(resolve), 500))

const createWorkspaces = ($page) => {
  const $workspaces = $(`<div class="sidebar-workspaces"></div>`)
  $page.append($workspaces)
  return $workspaces
}

const createIndex = ($page) => {
  const $index = $(`<div class="sidebar-index"></div>`)
  $page.append($index)
  return $index
}
const createSidebar = ($item) => {
  console.log('item', $item)
  const $page = $item.parents('.page:first')
  $page.empty()
  $page.addClass('sidebar')

  const $controls = createControls($page)
  const $workspaces = createWorkspaces($page)
  const $index = createIndex($page)
  console.log('controls? 1', $controls)

  return {
    $controls,
    $workspaces,
    $index
  }
}

const stateChange = () => {
  const changes = {}

  if (isClaimed !== state.isClaimed){
    changes.isClaimed = true
    state.isClaimed = isClaimed
  }

  if (isAuthenticated !== state.isAuthenticated){
    changes.isAuthenticated = true
    state.isAuthenticated = isAuthenticated
  }

  if (state.sitemap_changed){
    changes.sitemap = true
    state.sitemap_changed = false
  }

  if (state.item_changed){
    changes.item = true
    state.item_changed = false
  }

  return changes
}

const maybeUpdateControls = ($controls, changes) => {
  //sconsole.log('maybeControls')
  if (changes.isClaimed || changes.isAuthenticated) {
    updateControls($controls)
  }
}

const maybeUpdateWorkspaces = ($workspaces, changes) => {
  //sconsole.log('maybeWorkspace')
  if (changes.isAuthenticated || changes.item) {
    updateWorkspaces($workspaces)
  }
}

const maybeUpdateIndex = ($index, changes) => {
  //sconsole.log('maybeIndex')
  if (changes.sitemap) {
    updateIndex($index)
  }
}

const emit = async ($item, item) => {
  console.log('HOME EMIT', $item, item, isAuthenticated)

  const {
    $controls,
    $workspaces,
    $index
  } = createSidebar($item)

  state = await getInitialState(item) 

  while (await waitIdle()){
    //console.log('idle', $controls);
    const changes = stateChange();
    //console.log('changes', changes);
    maybeUpdateControls($controls, changes);
    //console.log('1')
    maybeUpdateWorkspaces($workspaces, changes);
    //console.log('2')
    maybeUpdateIndex($index, changes);
    //console.log('3')
  }
}

const bind = ($item, item) => {
  console.log('HOME BIND', $item, item)
}


window.plugins.home = {emit, bind}

initialize()

})()