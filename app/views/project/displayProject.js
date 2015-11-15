'use strict'
let logger = require('js-logger-aknudsen').get('project')
let h = require('react-hyperscript')
let R = require('ramda')
let S = require('underscore.string.fp')
let component = require('omniscient')
let React = require('react')

let datetime = require('../../datetime')
let {nbsp,} = require('../../specialChars')
let {convertMarkdown,} = require('../../markdown')
let ajax = require('../../ajax')
let licenses = require('../../licenses')

require('./displayProject.styl')

let getFileSize = (numBytes) => {
  let sizeStr
  if (numBytes < 1024) {
    sizeStr = `${numBytes} B`
  } else if (numBytes < 1024*1024) {
    sizeStr = `${Math.ceil(numBytes / 1024.0)} KB`
  } else if (numBytes < 1024*1024*1024) {
    sizeStr = `${Math.ceil(numBytes / (1024*1024.0))} MB`
  } else if (numBytes < 1024*1024*1024*1024) {
    sizeStr = `${Math.ceil(numBytes / (1024*1024*1024.0))} GB`
  } else {
    throw new Error(`File size too large: ${numBytes}`)
  }
  return sizeStr
}

let TopPad = component('TopPad', (cursor) => {
  let projectCursor = cursor.cursor(['displayProject', 'project',])
  let project = projectCursor.toJS()
  let creationDateString = datetime.displayDateTextual(project.created)
  let mainPicture = project.chosenPicture || project.pictures[0]
  let loggedInUser = cursor.get('loggedInUser')
  let canEdit = loggedInUser == null || loggedInUser.username === project.owner
  return h('#project-top-pad.airy-padding-sides', [
    canEdit ? h('a#edit-action.action.pull-right', {
      href: `/u/${project.owner}/${project.projectId}/edit`, 'data-tooltip': 'Edit project',
    }, [
        h('span.icon-pencil3'),]) : null,
    h('#project-heading', [
      h('h1#project-title', project.title),
      h('p#project-creation-date', [
        `Added ${creationDateString} by `,
        h('a', {href: `/u/${project.owner}`,}, project.ownerName),
      ]),
    ]),
    h('#image-box', [
      h('#thumbnails', R.map((picture) => {
        return h('a', {
          href: '#',
          onClick: (event) => {
            event.preventDefault()
            logger.debug(`Thumbnail clicked:`, picture)
            projectCursor.set('chosenPicture', picture)
          },
        }, [
          h('.thumbnail-wrapper', [
            h('img', {src: picture.url,}),
          ]),
        ])
      }, project.pictures)),
      h('#displayed-image', [
        h('img', {
          src: mainPicture != null ? mainPicture.url : null
        ,}),
      ]),
    ]),
  ])
})

let RightColumn = component('RightColumn', (project) => {
  let tagElems = R.chain((tag) => {
    return [h('a.project-tag', {
      href: '#',
      onClick: (event) => {
        logger.debug(`Project tag '${tag}' clicked`)
        event.preventDefault()
      },
    }, tag), ', ',]
  }, project.tags).slice(0, -1)
  return h('#right-column', [
    h('#tag-pad.airy-padding-sides', [
      h('h2', [
        h('span.icon-tags2'),
        `${nbsp}Tags`,
      ]),
      h('#project-tags', tagElems),
    ]),
    h('#license-pad.airy-padding-sides', [
      h('h2', 'License'),
      h('#license-icons', [
        h('a', {href: project.license.url, target: '_blank',}, R.map((icon) => {
          return h(`span.icon-${icon}`)
        }, project.license.icons)),
      ]),
      h('p', [
        h('strong', [
          `${project.title} is licensed under the `,
          h('a', {href: project.license.url, target: '_blank',}, project.license.name),
          ' license.',
        ]),
      ]),
    ]),
  ])
})

let BottomPad = component('BottomPad', ({cursor, project,}) => {
  let projectTabs = [
    new ProjectTab('Description', 'file-text'),
    new ProjectTab('Instructions', 'book'),
    new ProjectTab('Files', 'puzzle4'),
  ]
  let activeTab = cursor.cursor(['displayProject',]).get('activeTab')
  let tabContent
  if (activeTab === 'description') {
    tabContent = h('#description', [
      convertMarkdown(project.description),
    ])
  } else if (activeTab === 'instructions') {
    tabContent = h('#instructions', [
      convertMarkdown(project.instructions),
    ])
  } else if (activeTab === 'files') {
    tabContent = ProjectFiles(project)
  }
  return h('#project-bottom-pad', [
    h('ul.tabs', {role: 'tablist',}, R.map((projectTab) => {
      return h(`li.${S.join('.', projectTab.getClasses(cursor))}`, [
        h('a', {
          role: 'tab',
          href: '#',
          onClick: (event) => {
            event.preventDefault()

            if (cursor.cursor(['displayProject',]).get('activeTab') !== projectTab.name) {
              logger.debug(`Switching project tab to '${projectTab.name}'`)
              cursor.cursor(['displayProject',]).set('activeTab', projectTab.name)
            }
          },
        }, [
          projectTab.icon != null ? h(`span.icon-${projectTab.icon}`, nbsp) : null,
          projectTab.title,
        ]),
      ])
    }, projectTabs)),
    h('#tab-contents', [
      tabContent,
    ]),
  ])
})

let ProjectFiles = component('ProjectFiles', (project) => {
  if (R.isEmpty(project.files)) {
    return h('em', 'The project has no files')
  } else {
    let zipFileSize = project.zipFile != null ? getFileSize(project.zipFile.size) : 0
    return h('div', [
      h('a#download-zip-button.pure-button', {href: project.zipFile.url,}, [
        h('span.icon-file-zip'),
        `${nbsp}Download zip`,
        h('span.small', `${nbsp}(${zipFileSize})`),
      ]),
      h('table#project-files-table', [
        h('thead', [
          h('tr', [
            h('th', 'Filename'),
            h('th', 'Size'),
          ]),
        ]),
        h('tbody', R.map((file) => {
          let sizeStr = getFileSize(file.size)
          return h('tr', [
            h('td', [
              h('a', {href: file.url,}, [h('span.icon-puzzle4', `${nbsp}${file.fullPath}`),]),
            ]),
            h('td', [
              h('a', {href: file.url,}, sizeStr),
            ]),
          ])
        }, project.files)),
      ]),
    ])
  }
})

class ProjectTab {
  constructor (title, icon) {
    this.title = title
    this.icon = icon
    this.name = title.toLowerCase()
  }

  getClasses(cursor) {
    let activeTab = cursor.cursor(['displayProject',]).get('activeTab')
    if (activeTab === this.name) {
      logger.debug(`${this.name} is active tab`)
      return ['active',]
    } else {
      return []
    }
  }
}

let render = (cursor) => {
  let projectCursor = cursor.cursor(['displayProject', 'project',])
  let project = projectCursor.toJS()

  logger.debug(`Rendering display of project:`, project)
  let qualifiedProjectId = `${project.owner}/${project.projectId}`
  return h('.airy-padding-sides', [
    h('h1#project-path', qualifiedProjectId),
    TopPad(cursor),
    RightColumn(project),
    BottomPad({cursor, project,}),
  ])
}

module.exports = {
  routeOptions: {
    render: render,
    loadData: (cursor, params) => {
      logger.debug(`Loading project ${params.owner}/${params.projectId}`)
      return ajax.getJson(`projects/${params.owner}/${params.projectId}`)
        .then((project) => {
          logger.debug(`Loading project JSON succeeded:`, project)
          return {
            displayProject: {
              activeTab: 'description',
              project: R.merge(project, {
                license: licenses[project.licenseId],
              }),
            },
          }
        }, (reason) => {
          logger.warn(`Loading project JSON failed: '${reason}'`)
        })
      },
  },
}