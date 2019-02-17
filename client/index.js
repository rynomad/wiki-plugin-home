const addCSS = () => {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
    .plugin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  `;
  document.getElementsByTagName('head')[0].appendChild(style);
}



const populateIndex = ($item, sitemap) => {
  const $table = $('<table style="width:100%;"></table>')
  sitemap = sitemap.sort(({date : a}, {date : b}) => b - a )
  
  for (const entry of sitemap){
    const d = new Date(entry.date)
    const row = $(`
      <tr style="display:flex;justify-content:space-between;">
        <td>
          <a class="internal" href="/${entry.slug}.html" title="view" data-page-name="${entry.slug}">
            ${entry.title}
          </a>
        </td>
        <td>
          ${d.toLocaleDateString() + ' ' + d.toLocaleTimeString()}
        </td>
      </tr>
    `)
    $table.append(row)
  }

  $item.append($table)
}

const populateWorkspaces = async ($item, item) => {
  const self = wiki.neighborhood[location.host]
  const storage = createStorage({name : 'workspaces'})

  $item.append(`
    <div class="plugin-header">
      <h3>Workspaces: ${location.host.split(':')[0]} </h3>
      <div class="control-button">
        <input class="create-transition" id="new-workspace-input" name="title" placeholder="New Page Title">
        <a href="#" id="new-workspace-button" class="add-workspace create-title-active button create-transition ">+</a>
      </div>
    </div>
  `)

  const workspaces = await storage.keys()
  
  const $table = $('<table style="width:100%;"></table>')

  for (const name of workspaces){
    $table.append(`
      <tr style="display:flex;justify-content:space-between;">
        <td>
          <a class="workspace" href="#" title="view" data-workspace-name="${name}">
            ${name}
          </a>
        </td>
        <td>
          <a href="#" id="edit-workspace" class="button edit-workspace create-transition create-title-active" data-workspace-name="${name}">&#9776;</a>
        </td>
      </tr>
    `)
  }

  $item.append($table)

  $item.find('.workspace').click(async function (){
    const name = $(this).data('workspace-name')
    const slugs = await storage.getItem(name)

    for (const slug of slugs){
      wiki.doInternalLink(slug)
    }
  })

  $item.find('#edit-workspace').click(async function(){
    console.log("EDIT WORKSPACE ")
    const name = $(this).data('workspace-name')
    const slugs = (await storage.getItem(name)) || []
    const pages_in = self.sitemap.filter(({slug}) => slugs.indexOf(slug) >= 0).map(({title}) => title)
    const pages_out = self.sitemap.filter(({slug}) => slugs.indexOf(slug) < 0).map(({title}) => title)
    
    const menu = new wiki.Menu()
    menu.append(new wiki.MenuItem({
      label : 'add page',
      submenu : pages_out.map((label) => ({
        label,
        click : async () => {  
          await storage.setItem(name, slugs.concat([wiki.asSlug(label)]))
        }
      }))
    }))

    menu.append(new wiki.MenuItem({
      label : 'remove page',
      submenu : pages_in.map(label => ({
        label,
        click : async () => {
          await storage.setItem(name, slugs.filter(t => t !== label))
        }
      }))
    }))

    menu.append(new wiki.MenuItem({
      label : 'pages',
      type : 'separator'
    }))

    for (const title of pages_in){
      menu.append(new wiki.MenuItem({
        label : title
      }))
    }

    menu.popup()
  })

  const $new_workspace_button = $item.find('#new-workspace-button')
  const $new_workspace_input = $item.find("#new-workspace-input")

  const toggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    $new_workspace_input.val('')
    $new_workspace_input.toggleClass('create-title-active')
    $new_workspace_button.toggleClass('create-title-active')
  } 

  $new_workspace_button.click(e => {
    console.log("new workspace button click")
    toggle(e)
    $new_workspace_input.focus()
  })
  
  $new_workspace_input.keyup(async e => {
    switch (e.keyCode){
      case 13: //enter
      const title = $new_workspace_input.val()
      await storage.setItem(title, [])
      $item.empty()
      setTimeout(() => emit($item, item),0)
      case 27: //esc
      toggle(e)
      break;
      default:
    }
  })
}

const emit = ($item, item) => {
  console.log('EMIT INDEX', $item, item, wiki.neighborhood)
  const self = wiki.neighborhood[location.host]

  if (self && self.sitemap){
    return populateWorkspaces($item, item)
  }

  setTimeout(() => emit($item, item), 1000)
}

bind = ($item, item) => {
  $item.dblclick(() => wiki.textEditor($item, item))
  $item.find('input').dblclick(() => false)
}

window.plugins.index = {emit, bind}

addCSS()