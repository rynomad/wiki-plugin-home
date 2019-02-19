const addCSS = () => {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
    .plugin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .workspace-button {
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
      width: 18px; 
    }

    .create-workspace-transition.create-workspace-active {
      width :   auto;
      display : inline;
    }

    .create-workspace-transition {
      width : 0;
      display : none;
      transition : width 1s;
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
  item.workspaces = item.workspaces || {}
  $item.append(`
    <div class="plugin-header">
      <h3>Workspaces: ${location.host.split(':')[0]} </h3>
      <div class="control-button">
        <input class="create-workspace-transition" id="new-workspace-input" name="title" placeholder="New Page Title">
        <a href="#" id="new-workspace-button" class="add-workspace create-workspace-active button create-workspace-transition ">+</a>
      </div>
    </div>
  `)
  
  const $table = $('<table style="width:100%;"></table>')

  for (const name in item.workspaces){
    $table.append(`
      <tr style="display:flex;justify-content:space-between;">
        <td>
          <a class="workspace" href="#" title="view" data-workspace-name="${name}">
            ${name}
          </a>
        </td>
        <td>
          <a href="#" id="edit-workspace" class="workspace-button edit-workspace create-workspace-transition create-workspace-active" data-workspace-name="${name}">&#9776;</a>
        </td>
      </tr>
    `)
  }

  $item.append($table)
}

const emit = ($item, item) => {
  console.log('EMIT INDEX', $item, item, wiki.neighborhood)
  const self = wiki.neighborhood[location.host]
  populateWorkspaces($item, item)
}

const bind = ($item, item) => {
  item.workspaces = item.workspaces || {}

  $item.find('.workspace').click(async function (){
    const name = $(this).data('workspace-name')
    const slugs = item.workspaces[name]
    const self = wiki.neighborhood[location.host]
    const pages_in = self.sitemap.filter(({slug}) => slugs.indexOf(slug) >= 0)
    console.log('SLUGS', slugs)
    setTimeout(() => {
      const slugs = pages_in.map(({slug}) => slug)
      if (!slugs.length) return
      const first = slugs.shift()
      console.log('first?', first, slugs)
      wiki.doInternalLink(first, $item.parents('.page:first'))
      for (const slug of slugs){
        wiki.doInternalLink(slug)
      }
    },0)
  })

  $item.delegate('.workspace-button','click',async function(e){
    e.preventDefault()
    e.stopPropagation()
    const self = wiki.neighborhood[location.host]
    console.log("EDIT WORKSPACE ")
    const name = $(this).data('workspace-name')
    const slugs = item.workspaces[name] || []
    const pages_in = self.sitemap.filter(({slug}) => slugs.indexOf(slug) >= 0).map(({title}) => title)
    const pages_out = self.sitemap.filter(({slug}) => slugs.indexOf(slug) < 0).map(({title}) => title)
    
    const menu = new wiki.Menu()
    menu.append(new wiki.MenuItem({
      label : 'add page',
      submenu : pages_out.map((label) => ({
        label,
        click : async () => {  
          const $page = $item.parents('.page:first')
          item.workspaces[name] = slugs.concat([wiki.asSlug(label)])
          wiki.pageHandler.put($page, {type: 'edit', id: item.id, item: item})
        }
      }))
    }))

    menu.append(new wiki.MenuItem({
      label : 'remove page',
      submenu : pages_in.map(label => ({
        label,
        click : async () => {
          const $page = $item.parents('.page:first')
          item.workspaces[name] = slugs.filter(t => t !== wiki.asSlug(label))
          wiki.pageHandler.put($page, {type: 'edit', id: item.id, item: item})
        }
      }))
    }))

    menu.append(new wiki.MenuItem({
      label : 'delete workspace',   
      click : () => {
        const $page = $item.parents('.page:first')
        item.workspaces = Object.keys(item.workspaces).filter(n => n !== name).reduce((o,n) => ({
          [n] : item.workspaces[n],
          ...o
        }),{})
        wiki.pageHandler.put($page, {type: 'edit', id: item.id, item: item})
        $item.empty()
        emit($item, item)
        bind($item, item) 
      }
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
    $new_workspace_input.toggleClass('create-workspace-active')
    $new_workspace_button.toggleClass('create-workspace-active')
  } 

  $new_workspace_button.click(e => {
    console.log("new workspace button click")
    toggle(e)
    $new_workspace_input.focus()
  })
  
  $new_workspace_input.keyup(async e => {
    switch (e.keyCode){
      case 13: //enter
      const $page = $item.parents('.page:first')
      const title = $new_workspace_input.val()
      item.workspaces[title] = []
      wiki.pageHandler.put($page, {type: 'edit', id: item.id, item: item})
      $item.empty()
      emit($item, item)
      bind($item, item)
      case 27: //esc
      toggle(e)
      break;
      default:
    }
  })    
}

window.plugins.index = {emit, bind}

addCSS()